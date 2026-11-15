import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Printer,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  BobotNilaiKebijakan,
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
import { ImportSiswaModal } from './ImportSiswaModal';
import { SimulatedDataNoticeBanner } from './SimulatedDataNoticeBanner';

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

  const activeBobot = useMemo(
    () => normalizeBobotKebijakan(kelasHarian.bobotNilai || DEFAULT_BOBOT_NILAI),
    [kelasHarian.bobotNilai]
  );

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
      const deskripsi = generateAutoDeskripsiRapor(newFormatif, tpList, item.nama);

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
      const deskripsi = generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama);

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
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      bobotNilai: draftBobot,
      daftarNilai: recalculated,
    });
    setShowBobotEditor(false);
    onToast('Kebijakan bobot nilai diperbarui & seluruh nilai akhir dihitung ulang.');
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
            {hasPraktik ? ` · Praktik ${activeBobot.bobotPraktik}%` : ''}
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowBobotEditor((v) => !v)}
            className="btn btn-sm btn-outline"
            aria-expanded={showBobotEditor}
            title="Atur proporsi bobot Formatif, STS, SAS, dan Praktik"
          >
            <SlidersHorizontal size={13} aria-hidden="true" /> Atur Bobot
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

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: bobotCheck.valid ? '#15803d' : '#b91c1c',
              paddingBottom: 6,
            }}
          >
            Total: {bobotCheck.total}% {bobotCheck.valid ? '(Valid)' : '(Harus 100%)'}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" disabled={!bobotCheck.valid} className="btn btn-sm btn-primary">
              Simpan Bobot
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: 'Rata-rata kelas', val: summary.avgKelas !== null ? summary.avgKelas : '—', dot: '#2563eb' },
          { label: 'Sangat Baik (86–100)', val: `${summary.totalSangatBaik} siswa`, dot: '#16a34a' },
          { label: 'Baik (71–85)', val: `${summary.totalBaik} siswa`, dot: '#0284c7' },
          { label: 'Cukup (61–70)', val: `${summary.totalCukup} siswa`, dot: '#d97706' },
          { label: 'Perlu Bimbingan (<= 60)', val: `${summary.totalPerluBimbingan} siswa`, dot: '#dc2626' },
          ...(summary.belumDinilaiCount > 0
            ? [{ label: 'Belum Dinilai', val: `${summary.belumDinilaiCount} siswa`, dot: '#94a3b8' }]
            : []),
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
                            color: !hasScore ? '#64748b' : score >= 71 ? '#15803d' : '#b91c1c',
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
                        : displayNA >= 71
                        ? '#f0fdf4'
                        : '#fee2e2',
                      color: isBlankStudent
                        ? '#64748b'
                        : displayNA >= 71
                        ? '#15803d'
                        : '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {isBlankStudent ? '—' : displayNA}
                    {computed.statusNilai === 'sebagian' && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#b45309' }}>Parsial</div>
                    )}
                  </td>

                  {/* Predikat KKTP Badge */}
                  <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    {isBlankStudent ? (
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '9px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>Keterangan KKTP (Standar Terpadu):</strong> 86–100 (Sangat Baik) · 71–85 (Baik) · 61–70 (Cukup) · 0–60 (Perlu Bimbingan). Sel kosong (<code>-</code>) menandakan belum dinilai dan berbeda dari skor <code>0</code>.
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
    </div>
  );
};
