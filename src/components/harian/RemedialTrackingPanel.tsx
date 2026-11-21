import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type {
  JenisBuktiAsesmen,
  JenisIntervensiRemedial,
  KelasHarianData,
  RiwayatRemedialItem,
  StatusKetercapaianBukti,
  StatusTindakLanjutRemedial,
} from '../../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';
import {
  evaluateClassRemedialOverview,
  JENIS_INTERVENSI_LABELS,
  REMEDIAL_STATUS_SELECT_OPTIONS,
  STATUS_REMEDIAL_META,
  type RecordReassessmentInput,
  type StudentTPRemedialEvaluation,
  type UpsertRemedialPlanInput,
} from '../../utils/remedialTrackingEngine';

interface RemedialTrackingPanelProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  selectedTpId?: string;
  onChangeSelectedTpId?: (tpId: string) => void;
  onSaveRemedialPlan: (input: Omit<UpsertRemedialPlanInput, 'kelasHarian' | 'schoolProfile'>) => void;
  onSaveReassessment: (input: Omit<RecordReassessmentInput, 'kelasHarian' | 'schoolProfile'>) => void;
  onOpenStudentEvidenceModal?: (siswaId: string) => void;
}

type RemedialFilterTab =
  | 'all'
  | 'perlu'
  | 'berlangsung'
  | 'menunggu'
  | 'sudah_reassessment';

const REASSESSMENT_JENIS_OPTIONS: { value: JenisBuktiAsesmen; label: string }[] = [
  { value: 'tes', label: 'Tes Ulang Tertulis / Lisan' },
  { value: 'lkpd', label: 'LKPD Penguatan / Tugas Ulang' },
  { value: 'praktik', label: 'Praktik / Unjuk Kerja Ulang' },
  { value: 'proyek', label: 'Proyek Perbaikan' },
  { value: 'observasi', label: 'Observasi Guru Pasca-Remedial' },
];

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const RemedialTrackingPanel: React.FC<RemedialTrackingPanelProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  selectedTpId = '',
  onChangeSelectedTpId,
  onSaveRemedialPlan,
  onSaveReassessment,
  onOpenStudentEvidenceModal,
}) => {
  const [filterTab, setFilterTab] = useState<RemedialFilterTab>('all');
  const [showUnassessedList, setShowUnassessedList] = useState(false);
  const [expandedAuditKey, setExpandedAuditKey] = useState<string | null>(null);

  // State form rencana / pembaruan remedial (aktif per pasangan siswaId::tpId)
  const [planFormKey, setPlanFormKey] = useState<string | null>(null);
  const [editingRemedialId, setEditingRemedialId] = useState<string | undefined>(undefined);
  const [planJenis, setPlanJenis] = useState<JenisIntervensiRemedial>('bimbingan_individu');
  const [planTanggal, setPlanTanggal] = useState<string>(getTodayIsoDate);
  const [planStatus, setPlanStatus] = useState<StatusTindakLanjutRemedial>('direncanakan');
  const [planRencana, setPlanRencana] = useState<string>('');
  const [planHasil, setPlanHasil] = useState<string>('');
  const [planCatatan, setPlanCatatan] = useState<string>('');
  const [planSubTpIds, setPlanSubTpIds] = useState<string[]>([]);

  // State form reassessment non-destruktif
  const [reassessFormKey, setReassessFormKey] = useState<string | null>(null);
  const [reassessRemedialId, setReassessRemedialId] = useState<string | undefined>(undefined);
  const [reassessJenis, setReassessJenis] = useState<JenisBuktiAsesmen>('tes');
  const [reassessTanggal, setReassessTanggal] = useState<string>(getTodayIsoDate);
  const [reassessSubTpId, setReassessSubTpId] = useState<string>('');
  const [reassessSkorRaw, setReassessSkorRaw] = useState<string>('');
  const [reassessSkala, setReassessSkala] = useState<number>(100);
  const [reassessManualStatus, setReassessManualStatus] =
    useState<StatusKetercapaianBukti>('Tercapai');
  const [reassessIndikator, setReassessIndikator] = useState<string>('');
  const [reassessCatatan, setReassessCatatan] = useState<string>('');

  const overview = useMemo(
    () =>
      evaluateClassRemedialOverview({
        kelasHarian,
        tpList,
        bobotPolicy: kelasHarian.bobotNilai,
        schoolProfile,
        tpFilterId: selectedTpId || undefined,
      }),
    [kelasHarian, tpList, schoolProfile, selectedTpId]
  );

  const visibleTargets = useMemo(() => {
    return overview.targets.filter((t) => {
      if (filterTab === 'perlu') {
        return t.visualCategory === 'perlu_remedial' || t.visualCategory === 'direncanakan_remedial';
      }
      if (filterTab === 'berlangsung') {
        return t.visualCategory === 'sedang_remedial';
      }
      if (filterTab === 'menunggu') {
        return t.visualCategory === 'menunggu_reassessment';
      }
      if (filterTab === 'sudah_reassessment') {
        return (
          t.visualCategory === 'sudah_reassessment_tuntas' ||
          t.visualCategory === 'sudah_reassessment_belum_tuntas'
        );
      }
      return true;
    });
  }, [overview.targets, filterTab]);

  const openPlanEditor = (
    ev: StudentTPRemedialEvaluation,
    existing?: RiwayatRemedialItem
  ) => {
    const key = `${ev.siswaId}::${ev.tpId}`;
    setReassessFormKey(null);
    setPlanFormKey(key);
    setEditingRemedialId(existing?.id);
    setPlanJenis(existing?.jenisIntervensi || 'bimbingan_individu');
    setPlanTanggal(existing?.tanggalIntervensi || getTodayIsoDate());
    setPlanStatus(existing?.statusTindakLanjut || 'direncanakan');
    setPlanRencana(existing?.rencanaKegiatan || '');
    setPlanHasil(existing?.hasilKegiatan || '');
    setPlanCatatan(existing?.catatanGuru || '');
    setPlanSubTpIds(
      existing?.subTpIds && existing.subTpIds.length > 0
        ? [...existing.subTpIds]
        : ev.unachievedSubTps.map((s) => s.subTpId)
    );
  };

  const openReassessmentEditor = (
    ev: StudentTPRemedialEvaluation,
    remedialRecord?: RiwayatRemedialItem | null
  ) => {
    const key = `${ev.siswaId}::${ev.tpId}`;
    setPlanFormKey(null);
    setReassessFormKey(key);
    setReassessRemedialId(remedialRecord?.id || ev.latestRemedial?.id);
    setReassessJenis('tes');
    setReassessTanggal(getTodayIsoDate());
    setReassessSubTpId(ev.unachievedSubTps[0]?.subTpId || '');
    setReassessSkorRaw('');
    setReassessSkala(100);
    setReassessManualStatus('Tercapai');
    setReassessIndikator(`Penilaian ulang ${ev.tpKode} — ${ev.materiPokok}`);
    setReassessCatatan('');
  };

  const renderCategoryBadge = (ev: StudentTPRemedialEvaluation) => {
    if (ev.latestRemedial) {
      const meta =
        STATUS_REMEDIAL_META[ev.latestRemedial.statusTindakLanjut] ||
        STATUS_REMEDIAL_META.perlu_tindak_lanjut;
      return (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            background: meta.badgeBg,
            color: meta.badgeFg,
            border: `1px solid ${meta.badgeBorder}`,
          }}
        >
          {meta.label}
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
        }}
      >
        Perlu Tindak Lanjut (Belum Direncanakan)
      </span>
    );
  };

  return (
    <section
      data-testid="remedial-tracking-panel"
      className="no-print"
      aria-label="Pelacakan Remedial & Reassessment Non-Destruktif"
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      {/* Header & Penjelasan Kebijakan Non-Destruktif */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          <strong
            style={{
              fontSize: 14,
              color: '#0f172a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={15} color="#2563eb" aria-hidden="true" />
            Tindak Lanjut Remedial &amp; Reassessment Siswa
          </strong>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.45 }}>
            Menggunakan KKTP aktif per TP (default kelas: <strong>≥ {overview.activeClassKKTP}</strong>
            ).{' '}
            <span style={{ color: '#0369a1', fontWeight: 600 }}>
              Nilai &amp; bukti penilaian awal tetap utuh; hasil reassessment disimpan terpisah dan
              tidak menimpa e-Rapor secara otomatis.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Filter TP:</span>
            <select
              aria-label="Filter TP Remedial"
              className="form-input"
              value={selectedTpId}
              onChange={(e) => onChangeSelectedTpId?.(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, maxWidth: 230 }}
            >
              <option value="">Semua TP ({tpList.length})</option>
              {tpList.map((tp) => (
                <option key={tp.id || tp.kode} value={tp.id || tp.kode}>
                  {tp.kode} — {tp.materiPokok}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Peringatan Kunci Rapor Final jika ada */}
      {overview.counts.lockedFinalTargets > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            marginBottom: 10,
            borderRadius: 8,
            background: '#fefce8',
            border: '1px solid #fde047',
            fontSize: 12,
            color: '#854d0e',
          }}
        >
          <Lock size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>
            Terdapat <strong>{overview.counts.lockedFinalTargets}</strong> siswa sasaran dengan{' '}
            <strong>Rapor Final Terkunci</strong>. Catatan remedial dan bukti reassessment tetap
            tercatat terpisah dan <strong>tidak pernah mengubah nilai/deskripsi rapor final</strong>{' '}
            secara diam-diam.
          </span>
        </div>
      )}

      {/* Filter Status Chips + Pemisahan Siswa Belum Memiliki Bukti */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        {(
          [
            { id: 'all', label: `Semua Sasaran (${overview.counts.totalTargets})` },
            {
              id: 'perlu',
              label: `Perlu / Direncanakan (${overview.counts.perluTindakLanjut + overview.counts.direncanakan})`,
            },
            {
              id: 'berlangsung',
              label: `Sedang Remedial (${overview.counts.sedangBerlangsung})`,
            },
            {
              id: 'menunggu',
              label: `Menunggu Reassessment (${overview.counts.menungguReassessment})`,
            },
            {
              id: 'sudah_reassessment',
              label: `Sudah Reassessment (${overview.counts.sudahReassessmentTuntas + overview.counts.sudahReassessmentBelumTuntas})`,
            },
          ] as { id: RemedialFilterTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={`btn btn-sm ${filterTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: 11.5 }}
          >
            {tab.label}
          </button>
        ))}

        {overview.counts.belumAdaBuktiUniqueStudents > 0 && (
          <button
            type="button"
            onClick={() => setShowUnassessedList((v) => !v)}
            className="btn btn-sm btn-outline"
            style={{
              fontSize: 11.5,
              borderColor: '#94a3b8',
              color: '#475569',
              background: '#ffffff',
            }}
            title="Siswa yang belum memiliki nilai/bukti tidak digolongkan gagal remedial"
          >
            <AlertCircle size={12} aria-hidden="true" />
            Belum Ada Bukti Penilaian ({overview.counts.belumAdaBuktiUniqueStudents} siswa)
          </button>
        )}
      </div>

      {/* Daftar Informatif Siswa Belum Memiliki Bukti Penilaian (Jelas Terpisah dari Sasaran Remedial) */}
      {showUnassessedList && overview.unassessedEntries.length > 0 && (
        <div
          data-testid="unassessed-students-box"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: '#334155',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
            Siswa dengan Bukti Penilaian Belum Diisi (Tidak Ditandai Belum Tuntas)
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>
            Nilai kosong (<code>-</code>) berbeda dari skor <code>0</code>. Lengkapi penilaian awal
            pada Buku Nilai atau modal Bukti sebelum menetapkan kebutuhan remedial.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {overview.unassessedEntries.slice(0, 18).map((u) => (
              <span
                key={`${u.siswaId}::${u.tpId}`}
                style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                }}
              >
                {u.namaSiswa} ({u.tpKode})
              </span>
            ))}
            {overview.unassessedEntries.length > 18 && (
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                +{overview.unassessedEntries.length - 18} entri lainnya
              </span>
            )}
          </div>
        </div>
      )}

      {/* Daftar Kartu Sasaran Remedial */}
      {visibleTargets.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '16px 14px',
            textAlign: 'center',
            color: '#475569',
            fontSize: 12.5,
          }}
        >
          <CheckCircle2
            size={20}
            color="#16a34a"
            style={{ marginBottom: 4 }}
            aria-hidden="true"
          />
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            {overview.counts.totalTargets === 0
              ? 'Belum ada siswa sasaran remedial pada filter ini'
              : 'Tidak ada data pada filter status ini'}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
            {overview.counts.belumAdaBuktiUniqueStudents > 0
              ? `${overview.counts.belumAdaBuktiUniqueStudents} siswa belum memiliki bukti penilaian awal dan tidak dimasukkan sebagai sasaran gagal.`
              : 'Seluruh siswa yang sudah memiliki bukti penilaian telah mencapai KKTP aktif.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleTargets.map((ev) => {
            const cardKey = `${ev.siswaId}::${ev.tpId}`;
            const tpObj = tpList.find((t) => (t.id || t.kode) === ev.tpId) || tpList[0];
            const isPlanOpen = planFormKey === cardKey;
            const isReassessOpen = reassessFormKey === cardKey;
            const isAuditOpen = expandedAuditKey === cardKey;
            const allAuditEvents = ev.remedialRecords.flatMap((r) => r.auditTrail || []);

            return (
              <article
                key={cardKey}
                data-testid="remedial-target-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '12px 14px',
                  minWidth: 0,
                }}
              >
                {/* Header Siswa & TP */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <strong style={{ fontSize: 13.5, color: '#0f172a' }}>
                        {ev.namaSiswa}
                      </strong>
                      {ev.nis && (
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>NIS {ev.nis}</span>
                      )}
                      {ev.isFinalReportLocked && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 99,
                            background: '#fef9c3',
                            color: '#854d0e',
                            border: '1px solid #fde047',
                          }}
                        >
                          <Lock size={10} aria-hidden="true" /> Rapor Final Terkunci
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600, marginTop: 2 }}>
                      TP {ev.tpKode} — {ev.materiPokok} · KKTP ≥ {ev.thresholdKKTP}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {renderCategoryBadge(ev)}
                  </div>
                </div>

                {/* Alasan Ketidaktercapaian Factual + Sub-TP & Miskonsepsi */}
                {ev.alasanKetidaktercapaian.length > 0 && (
                  <div
                    style={{
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: 7,
                      padding: '6px 9px',
                      fontSize: 11.5,
                      color: '#7c2d12',
                      marginBottom: 8,
                    }}
                  >
                    <strong>Alasan Ketidaktercapaian (Data Awal):</strong>{' '}
                    {ev.alasanKetidaktercapaian.join(' ')}
                    {ev.unachievedSubTps.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          marginTop: 4,
                        }}
                      >
                        {ev.unachievedSubTps.map((sub) => (
                          <span
                            key={sub.subTpId}
                            style={{
                              padding: '1px 6px',
                              borderRadius: 5,
                              background: '#ffffff',
                              border: '1px solid #fdba74',
                              fontSize: 11,
                              color: '#9a3412',
                            }}
                          >
                            Sub-TP {sub.subTpKode}: {sub.fokusMateri}
                            {sub.averageScore100 !== null ? ` (${sub.averageScore100})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4 Blok Terpisah: Nilai/Bukti Awal | Kegiatan Remedial | Reassessment | Status Terbaru */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: 8,
                    marginBottom: 8,
                    fontSize: 11.5,
                  }}
                >
                  {/* 1. Penilaian Awal (Utuh) */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 7,
                      padding: '7px 9px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ShieldCheck size={12} color="#475569" aria-hidden="true" />
                      1. Penilaian Awal (Utuh)
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>
                      Skor Awal:{' '}
                      {ev.initialAssessment.effectiveScore100 !== null
                        ? ev.initialAssessment.effectiveScore100
                        : 'Observasi tanpa skor'}{' '}
                      · Status: {ev.initialAssessment.status}
                    </div>
                    <div style={{ color: '#64748b', marginTop: 2 }}>
                      {ev.initialAssessment.evidences.length > 0
                        ? `${ev.initialAssessment.evidences.length} bukti awal tercatat`
                        : ev.initialAssessment.formatifScore !== null
                        ? `Nilai formatif Buku Nilai: ${ev.initialAssessment.formatifScore}`
                        : 'Observasi awal tercatat'}
                    </div>
                  </div>

                  {/* 2. Kegiatan Remedial */}
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 7,
                      padding: '7px 9px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 3 }}>
                      2. Kegiatan Remedial
                    </div>
                    {ev.latestRemedial ? (
                      <>
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>
                          {JENIS_INTERVENSI_LABELS[ev.latestRemedial.jenisIntervensi]} ·{' '}
                          {ev.latestRemedial.tanggalIntervensi}
                        </div>
                        {ev.latestRemedial.rencanaKegiatan && (
                          <div style={{ color: '#334155', marginTop: 2 }}>
                            Rencana: {ev.latestRemedial.rencanaKegiatan}
                          </div>
                        )}
                        {ev.latestRemedial.hasilKegiatan && (
                          <div style={{ color: '#334155', marginTop: 1 }}>
                            Hasil: {ev.latestRemedial.hasilKegiatan}
                          </div>
                        )}
                        {ev.latestRemedial.catatanGuru && (
                          <div style={{ color: '#475569', fontStyle: 'italic', marginTop: 1 }}>
                            Catatan: {ev.latestRemedial.catatanGuru}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: '#475569' }}>
                        Belum ada catatan kegiatan remedial untuk TP ini.
                      </div>
                    )}
                  </div>

                  {/* 3. Hasil Reassessment (Terpisah) */}
                  <div
                    style={{
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: 7,
                      padding: '7px 9px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#5b21b6', marginBottom: 3 }}>
                      3. Hasil Reassessment (Terpisah)
                    </div>
                    {ev.reassessment.hasReassessment && ev.reassessment.latestEvidence ? (
                      <>
                        <div style={{ color: '#0f172a', fontWeight: 700 }}>
                          {ev.reassessment.latestScore100 !== null
                            ? `Skor Baru: ${ev.reassessment.latestScore100}/100`
                            : `Observasi: ${ev.reassessment.latestEvidence.status}`}{' '}
                          ({ev.reassessment.latestEvidence.evidence.jenisBukti.toUpperCase()})
                        </div>
                        <div style={{ color: '#4c1d95', marginTop: 2 }}>
                          Tanggal: {ev.reassessment.latestEvidence.evidence.tanggal} · Status:{' '}
                          {ev.reassessment.latestEvidence.status}
                        </div>
                        {ev.reassessment.evidences.length > 1 && (
                          <div style={{ color: '#6d28d9', marginTop: 1 }}>
                            Total {ev.reassessment.evidences.length} bukti reassessment tercatat
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: '#6b7280' }}>Belum ada bukti reassessment tercatat.</div>
                    )}
                  </div>

                  {/* 4. Status Ketercapaian Terbaru */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 7,
                      padding: '7px 9px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: 3 }}>
                      4. Status Ketercapaian Terbaru
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>
                      {ev.effectiveDisplayStatusLabel}
                    </div>
                    <div style={{ color: '#475569', marginTop: 2 }}>{ev.reassessment.note}</div>
                  </div>
                </div>

                {/* Tombol Aksi Card */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => openPlanEditor(ev, ev.latestRemedial || undefined)}
                    style={{ fontSize: 11.5 }}
                  >
                    <Plus size={12} aria-hidden="true" />
                    {ev.latestRemedial ? 'Perbarui Rencana / Status' : 'Rencanakan Remedial'}
                  </button>

                  {ev.latestRemedial && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => openPlanEditor(ev)}
                      style={{ fontSize: 11.5 }}
                      title="Tambahkan catatan sesi kegiatan remedial baru tanpa menimpa sesi sebelumnya"
                    >
                      + Sesi Remedial Baru
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => openReassessmentEditor(ev, ev.latestRemedial)}
                    style={{ fontSize: 11.5 }}
                  >
                    <ClipboardCheck size={12} aria-hidden="true" />
                    Catat Reassessment
                  </button>

                  {onOpenStudentEvidenceModal && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => onOpenStudentEvidenceModal(ev.siswaId)}
                      style={{ fontSize: 11.5 }}
                    >
                      <UserCheck size={12} aria-hidden="true" />
                      Lihat Bukti Awal ({ev.initialAssessment.evidences.length})
                    </button>
                  )}

                  {(ev.remedialRecords.length > 0 || allAuditEvents.length > 0) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setExpandedAuditKey(isAuditOpen ? null : cardKey)}
                      style={{ fontSize: 11.5 }}
                      aria-expanded={isAuditOpen}
                    >
                      <History size={12} aria-hidden="true" />
                      Riwayat &amp; Audit ({ev.remedialRecords.length})
                    </button>
                  )}
                </div>

                {/* Riwayat & Audit Trail */}
                {isAuditOpen && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 11.5,
                    }}
                  >
                    <strong style={{ color: '#0f172a' }}>
                      Riwayat Kegiatan &amp; Audit Trail ({ev.remedialRecords.length} catatan)
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {ev.remedialRecords.map((rec, rIdx) => (
                        <div
                          key={rec.id}
                          style={{
                            padding: '6px 8px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                            #{rIdx + 1} · {rec.tanggalIntervensi} ·{' '}
                            {JENIS_INTERVENSI_LABELS[rec.jenisIntervensi]} ·{' '}
                            {STATUS_REMEDIAL_META[rec.statusTindakLanjut]?.label ||
                              rec.statusTindakLanjut}
                          </div>
                          {rec.hasilSebelum && (
                            <div style={{ color: '#475569' }}>
                              Sebelum: {rec.hasilSebelum.persentase ?? '—'}% ({rec.hasilSebelum.status})
                              {rec.hasilSesudah
                                ? ` · Sesudah Reassessment: ${rec.hasilSesudah.persentase ?? '—'}% (${rec.hasilSesudah.status})`
                                : ''}
                            </div>
                          )}
                          {Array.isArray(rec.auditTrail) && rec.auditTrail.length > 0 && (
                            <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: '#475569' }}>
                              {rec.auditTrail.map((aud) => (
                                <li key={aud.id}>
                                  <code>{aud.action}</code> — {aud.summary}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Buat / Perbarui Rencana & Status Remedial */}
                {isPlanOpen && tpObj && (
                  <form
                    data-testid="remedial-plan-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveRemedialPlan({
                        tp: tpObj,
                        siswaId: ev.siswaId,
                        remedialId: editingRemedialId,
                        subTpIds: planSubTpIds,
                        jenisIntervensi: planJenis,
                        tanggalIntervensi: planTanggal,
                        statusTindakLanjut: planStatus,
                        rencanaKegiatan: planRencana,
                        hasilKegiatan: planHasil,
                        catatanGuru: planCatatan,
                        originalEvidenceId: ev.initialAssessment.primaryEvidenceId,
                      });
                      setPlanFormKey(null);
                    }}
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #93c5fd',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: 12.5, color: '#1e3a8a' }}>
                      {editingRemedialId
                        ? `Perbarui Rencana & Status Remedial — ${ev.namaSiswa}`
                        : `Buat Rencana Remedial Baru — ${ev.namaSiswa}`}
                    </strong>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Bentuk Kegiatan Remedial
                        </span>
                        <select
                          aria-label="Bentuk Kegiatan Remedial"
                          className="form-input"
                          value={planJenis}
                          onChange={(e) => setPlanJenis(e.target.value as JenisIntervensiRemedial)}
                        >
                          {(Object.keys(JENIS_INTERVENSI_LABELS) as JenisIntervensiRemedial[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {JENIS_INTERVENSI_LABELS[k]}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Tanggal Kegiatan
                        </span>
                        <input
                          aria-label="Tanggal Kegiatan Remedial"
                          type="date"
                          className="form-input"
                          value={planTanggal}
                          onChange={(e) => setPlanTanggal(e.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Status Tindak Lanjut
                        </span>
                        <select
                          aria-label="Status Tindak Lanjut Remedial"
                          className="form-input"
                          value={planStatus}
                          onChange={(e) =>
                            setPlanStatus(e.target.value as StatusTindakLanjutRemedial)
                          }
                        >
                          {REMEDIAL_STATUS_SELECT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Rencana Pembelajaran Ulang
                        </span>
                        <input
                          aria-label="Rencana Pembelajaran Ulang"
                          type="text"
                          className="form-input"
                          placeholder="Mis. Pendampingan soal bertahap menggunakan alat peraga"
                          value={planRencana}
                          onChange={(e) => setPlanRencana(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Hasil Kegiatan Remedial (Opsional)
                        </span>
                        <input
                          aria-label="Hasil Kegiatan Remedial"
                          type="text"
                          className="form-input"
                          placeholder="Mis. Siswa mampu menyelesaikan 4 dari 5 latihan terbimbing"
                          value={planHasil}
                          onChange={(e) => setPlanHasil(e.target.value)}
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Catatan Guru (Opsional)
                        </span>
                        <input
                          aria-label="Catatan Guru Remedial"
                          type="text"
                          className="form-input"
                          placeholder="Catatan hambatan atau kemajuan spesifik siswa"
                          value={planCatatan}
                          onChange={(e) => setPlanCatatan(e.target.value)}
                        />
                      </label>
                    </div>

                    {Array.isArray(tpObj.subTP) && tpObj.subTP.length > 0 && (
                      <div style={{ fontSize: 11.5 }}>
                        <div style={{ fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          Sub-TP Sasaran (Opsional):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {tpObj.subTP.map((sub) => {
                            const checked = planSubTpIds.includes(sub.id);
                            return (
                              <label
                                key={sub.id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setPlanSubTpIds((prev) =>
                                      e.target.checked
                                        ? [...prev, sub.id]
                                        : prev.filter((id) => id !== sub.id)
                                    );
                                  }}
                                />
                                <span>
                                  {sub.kode} — {sub.fokusMateri}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setPlanFormKey(null)}
                      >
                        Batal
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        Simpan Kegiatan Remedial
                      </button>
                    </div>
                  </form>
                )}

                {/* Form Catat Reassessment (Non-Destruktif) */}
                {isReassessOpen && tpObj && (
                  <form
                    data-testid="reassessment-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const hasNum =
                        reassessSkorRaw.trim() !== '' && !Number.isNaN(Number(reassessSkorRaw));
                      const parsedSkor = hasNum ? Math.max(0, Number(reassessSkorRaw)) : null;
                      onSaveReassessment({
                        tp: tpObj,
                        siswaId: ev.siswaId,
                        remedialId: reassessRemedialId,
                        subTpId: reassessSubTpId || undefined,
                        jenisBukti: reassessJenis,
                        sumberBukti: 'asesmen',
                        tanggal: reassessTanggal,
                        skor: parsedSkor,
                        skalaSkor: reassessSkala > 0 ? reassessSkala : 100,
                        manualStatus: parsedSkor === null ? reassessManualStatus : undefined,
                        indikatorYangDiamati: reassessIndikator,
                        catatanGuru: reassessCatatan,
                      });
                      setReassessFormKey(null);
                    }}
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: '#faf5ff',
                      border: '1px solid #c4b5fd',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 12.5,
                          color: '#5b21b6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Sparkles size={13} aria-hidden="true" />
                        Catat Hasil Reassessment (Bukti Baru Non-Destruktif) — {ev.namaSiswa}
                      </strong>
                      <span style={{ fontSize: 11, color: '#6d28d9' }}>
                        Nilai awal tidak diubah
                      </span>
                    </div>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Jenis Assessment Ulang
                        </span>
                        <select
                          aria-label="Jenis Assessment Ulang"
                          className="form-input"
                          value={reassessJenis}
                          onChange={(e) => setReassessJenis(e.target.value as JenisBuktiAsesmen)}
                        >
                          {REASSESSMENT_JENIS_OPTIONS.map((j) => (
                            <option key={j.value} value={j.value}>
                              {j.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Tanggal Reassessment
                        </span>
                        <input
                          aria-label="Tanggal Reassessment"
                          type="date"
                          className="form-input"
                          value={reassessTanggal}
                          onChange={(e) => setReassessTanggal(e.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Skor Reassessment (0–100, kosongkan jika observasi)
                        </span>
                        <input
                          aria-label="Skor Reassessment"
                          type="number"
                          min={0}
                          step="any"
                          className="form-input"
                          placeholder="Mis. 84"
                          value={reassessSkorRaw}
                          onChange={(e) => setReassessSkorRaw(e.target.value)}
                        />
                      </label>

                      {reassessSkorRaw.trim() !== '' && !Number.isNaN(Number(reassessSkorRaw)) ? (
                        <label
                          style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            Skala Maksimum
                          </span>
                          <input
                            aria-label="Skala Maksimum Reassessment"
                            type="number"
                            min={1}
                            className="form-input"
                            value={reassessSkala}
                            onChange={(e) =>
                              setReassessSkala(Math.max(1, Number(e.target.value) || 100))
                            }
                          />
                        </label>
                      ) : (
                        <label
                          style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            Status Observasi Reassessment
                          </span>
                          <select
                            aria-label="Status Observasi Reassessment"
                            className="form-input"
                            value={reassessManualStatus}
                            onChange={(e) =>
                              setReassessManualStatus(e.target.value as StatusKetercapaianBukti)
                            }
                          >
                            <option value="Tercapai">Tercapai (Memenuhi KKTP)</option>
                            <option value="Perlu Bimbingan">Belum Tuntas / Perlu Bimbingan</option>
                            <option value="Belum Dinilai">Belum Dinilai</option>
                          </select>
                        </label>
                      )}
                    </div>

                    <div className="ws-two-col" style={{ gap: 8 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Indikator yang Dinilai Ulang
                        </span>
                        <input
                          aria-label="Indikator Reassessment"
                          type="text"
                          className="form-input"
                          value={reassessIndikator}
                          onChange={(e) => setReassessIndikator(e.target.value)}
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Catatan Guru Reassessment
                        </span>
                        <input
                          aria-label="Catatan Guru Reassessment"
                          type="text"
                          className="form-input"
                          placeholder="Mis. Mampu menyelesaikan soal tanpa kesalahan langkah"
                          value={reassessCatatan}
                          onChange={(e) => setReassessCatatan(e.target.value)}
                        />
                      </label>
                    </div>

                    {Array.isArray(tpObj.subTP) && tpObj.subTP.length > 0 && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Sub-TP Terkait Reassessment (Opsional)
                        </span>
                        <select
                          aria-label="Sub-TP Terkait Reassessment"
                          className="form-input"
                          value={reassessSubTpId}
                          onChange={(e) => setReassessSubTpId(e.target.value)}
                        >
                          <option value="">(Tingkat TP Utuh)</option>
                          {tpObj.subTP.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.kode} — {sub.fokusMateri}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setReassessFormKey(null)}
                      >
                        Batal
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        Simpan Bukti Reassessment
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
