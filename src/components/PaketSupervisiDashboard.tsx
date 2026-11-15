import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Archive,
  Printer,
  FileText,
  BookOpen,
  Calendar,
  Table2,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ClipboardCheck,
  Eye,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../utils/schoolProfileStorage';
import type { KelasHarianData } from '../types/kelasHarian';
import type { LKPDDokumen, ModulAjarDokumen } from '../types/perangkatAjar';
import {
  needsExportVerificationWarning,
  isKelasHarianLegacyUnverified,
  confirmSimulationExportIfNeeded,
} from '../utils/kelasHarianStorage';
import { requireActiveLicenseForAction } from '../utils/licenseManager';
import {
  exportCoverDanPengesahanToDocx,
  exportReferensiCPTPToDocx,
  exportModulAjarSemesterSupervisiToDocx,
  exportBukuNilaiDanRaporSupervisiToDocx,
  exportInstrumenSupervisiToDocx,
  exportBundelSupervisiMasterDocx,
  exportPaketSupervisiToZip,
  exportATPToDocx,
  exportProtaToDocx,
  exportPromesToDocx,
  exportPresensiToDocx,
  exportJurnalMengajarToDocx,
} from '../utils/docxExporter';
import {
  buildSmartATP,
  buildSmartProta,
  buildSmartPromes,
} from '../utils/perangkatAjarEngine';
import {
  evaluateSupervisiInstrument,
  getSupervisiDocumentsReadiness,
  getSupervisiInstrumentData,
  getSupervisiStorageKey,
  resetSupervisiInstrumentData,
  saveSupervisiInstrumentData,
  SUPERVISI_DOCUMENT_DEFINITIONS,
  SUPERVISI_STATUS_LABELS,
  type SupervisiInstrumentData,
  type SupervisiItemStatus,
} from '../utils/supervisiStorage';

interface PaketSupervisiDashboardProps {
  schoolProfile: SchoolProfile;
  tpList: CustomTPItem[];
  kelasHarian: KelasHarianData;
  onBackToClassHub: () => void;
  onToast: (msg: string) => void;
  activeModulAjar?: ModulAjarDokumen | null;
  activeLKPD?: LKPDDokumen | null;
}

const DOC_ICONS: Record<number, React.ReactNode> = {
  1: <FileText size={18} color="#2563eb" />,
  2: <FileCheck size={18} color="#0284c7" />,
  3: <Table2 size={18} color="#2563eb" />,
  4: <Calendar size={18} color="#d97706" />,
  5: <BookOpen size={18} color="#0d9488" />,
  6: <Sparkles size={18} color="#7c3aed" />,
  7: <Users size={18} color="#059669" />,
  8: <FileText size={18} color="#4f46e5" />,
  9: <Award size={18} color="#15803d" />,
};

export const PaketSupervisiDashboard: React.FC<PaketSupervisiDashboardProps> = ({
  schoolProfile,
  tpList,
  kelasHarian,
  onBackToClassHub,
  onToast,
  activeModulAjar,
  activeLKPD,
}) => {
  const [isDownloadingMaster, setIsDownloadingMaster] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadingDocIdx, setDownloadingDocIdx] = useState<number | null>(null);
  const [showBundlePreview, setShowBundlePreview] = useState(false);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  const storageKey = getSupervisiStorageKey(schoolProfile);
  const [instrument, setInstrument] = useState<SupervisiInstrumentData>(() =>
    getSupervisiInstrumentData(schoolProfile)
  );

  useEffect(() => {
    setInstrument(getSupervisiInstrumentData(schoolProfile));
  }, [storageKey]);

  const evalSummary = useMemo(
    () => evaluateSupervisiInstrument(instrument),
    [instrument]
  );

  const readinessList = useMemo(
    () => getSupervisiDocumentsReadiness(schoolProfile, tpList, kelasHarian),
    [schoolProfile, tpList, kelasHarian]
  );

  const presensiAggregate = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    kelasHarian.daftarPresensi.forEach((p) => {
      kelasHarian.daftarSiswa.forEach((s) => {
        const st = p.statusMap[s.id] || 'H';
        if (st === 'H') hadir += 1;
        else if (st === 'S') sakit += 1;
        else if (st === 'I') izin += 1;
        else if (st === 'A') alfa += 1;
      });
    });
    return { hadir, sakit, izin, alfa };
  }, [kelasHarian]);

  const persistInstrument = (next: SupervisiInstrumentData) => {
    const saved = saveSupervisiInstrumentData(schoolProfile, next);
    setInstrument(saved);
  };

  const handleUpdateInstrumentMeta = (
    field: keyof Pick<
      SupervisiInstrumentData,
      | 'namaPengawas'
      | 'nipPengawas'
      | 'jabatanPengawas'
      | 'tanggalSupervisi'
      | 'catatanUmum'
      | 'rekomendasiUmum'
      | 'tindakLanjutUmum'
    >,
    value: string
  ) => {
    persistInstrument({
      ...instrument,
      [field]: value,
    });
  };

  const handleUpdateChecklistItem = (
    itemId: number,
    patch: Partial<{
      status: SupervisiItemStatus;
      skor: number | null;
      catatan: string;
      rekomendasi: string;
      tindakLanjut: string;
    }>
  ) => {
    const updatedItems = instrument.items.map((it) => {
      if (it.id !== itemId) return it;
      const nextStatus = patch.status ?? it.status;
      const nextSkor =
        nextStatus === 'belum_diperiksa'
          ? null
          : patch.skor !== undefined
          ? patch.skor
          : it.skor;
      return {
        ...it,
        ...patch,
        status: nextStatus,
        skor: nextSkor,
      };
    });
    persistInstrument({
      ...instrument,
      items: updatedItems,
    });
  };

  const handleResetInstrument = () => {
    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm(
        'Kosongkan seluruh isian status, skor, dan catatan pengawas pada Instrumen Supervisi ini?'
      )
    ) {
      return;
    }
    const fresh = resetSupervisiInstrumentData(schoolProfile);
    setInstrument(fresh);
    onToast('Instrumen supervisi dikembalikan ke status Belum diperiksa.');
  };

  const exportOptions = {
    instrument,
    activeModulAjar,
    activeLKPD,
  };

  // 1. Download Master DOCX
  const handleDownloadMaster = async () => {
    setExportErrorMsg(null);
    if (!confirmSimulationExportIfNeeded(kelasHarian, 'Master Bundel Supervisi (.docx)')) return;
    try {
      setIsDownloadingMaster(true);
      onToast('Menyusun Master Bundel Supervisi lengkap (01–09)...');
      const ok = await exportBundelSupervisiMasterDocx(
        schoolProfile,
        tpList,
        kelasHarian,
        exportOptions
      );
      if (ok) {
        onToast('Master Bundel Supervisi (.docx) berhasil diunduh.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Gagal menyusun Master Bundel Supervisi.';
      setExportErrorMsg(msg);
      onToast(msg);
    } finally {
      setIsDownloadingMaster(false);
    }
  };

  // 2. Download ZIP
  const handleDownloadZip = async () => {
    setExportErrorMsg(null);
    if (!confirmSimulationExportIfNeeded(kelasHarian, 'Paket Arsip ZIP Supervisi')) return;
    try {
      setIsDownloadingZip(true);
      onToast('Mengemas seluruh 9 berkas DOCX ke dalam arsip ZIP...');
      const ok = await exportPaketSupervisiToZip(
        schoolProfile,
        tpList,
        kelasHarian,
        exportOptions
      );
      if (ok) {
        onToast('Paket Arsip ZIP (.zip) lengkap (9 berkas) berhasil diunduh.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Gagal mengemas arsip ZIP Paket Supervisi.';
      setExportErrorMsg(msg);
      onToast(msg);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // 3. Cetak lembar Paket Supervisi (terikat konfirmasi simulasi & kebijakan lisensi)
  const handlePrintDashboard = () => {
    if (!confirmSimulationExportIfNeeded(kelasHarian, 'lembar Paket Supervisi')) return;
    if (!requireActiveLicenseForAction('mencetak lembar Paket Supervisi')) return;
    window.print();
  };

  // 4. Unduh Instrumen Supervisi mandiri
  const handleDownloadInstrumenOnly = async () => {
    setExportErrorMsg(null);
    try {
      const ok = await exportInstrumenSupervisiToDocx(schoolProfile, instrument);
      if (ok) {
        onToast('Instrumen Verifikasi Supervisi (.docx) berhasil diunduh.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Gagal mengunduh instrumen supervisi.';
      setExportErrorMsg(msg);
      onToast(msg);
    }
  };

  // 5. Download Single Document (konsisten penomoran 01–09)
  const handleDownloadSingle = async (idx: number) => {
    setExportErrorMsg(null);
    const docDef = SUPERVISI_DOCUMENT_DEFINITIONS.find((d) => d.id === idx);
    const requiresDataConfirmation = idx === 1 || idx >= 7;
    if (
      requiresDataConfirmation &&
      !confirmSimulationExportIfNeeded(
        kelasHarian,
        `dokumen ${docDef?.kode || idx} (${docDef?.nama || 'supervisi'})`
      )
    ) {
      return;
    }
    try {
      setDownloadingDocIdx(idx);
      let ok: any = false;
      if (idx === 1) {
        ok = await exportCoverDanPengesahanToDocx(
          schoolProfile,
          kelasHarian,
          tpList,
          instrument
        );
      } else if (idx === 2) {
        ok = await exportReferensiCPTPToDocx(schoolProfile, tpList);
      } else if (idx === 3) {
        const atp = buildSmartATP(tpList, schoolProfile);
        ok = await exportATPToDocx(atp, schoolProfile);
      } else if (idx === 4) {
        const prota = buildSmartProta(schoolProfile, tpList);
        ok = await exportProtaToDocx(prota, schoolProfile);
      } else if (idx === 5) {
        const promes = buildSmartPromes(schoolProfile, tpList);
        ok = await exportPromesToDocx(promes, schoolProfile);
      } else if (idx === 6) {
        ok = await exportModulAjarSemesterSupervisiToDocx(
          schoolProfile,
          tpList,
          exportOptions
        );
      } else if (idx === 7) {
        ok = await exportPresensiToDocx(schoolProfile, kelasHarian);
      } else if (idx === 8) {
        ok = await exportJurnalMengajarToDocx(schoolProfile, kelasHarian);
      } else if (idx === 9) {
        ok = await exportBukuNilaiDanRaporSupervisiToDocx(
          schoolProfile,
          kelasHarian,
          tpList
        );
      }
      if (ok) {
        onToast(`Dokumen ${docDef?.kode || idx}. ${docDef?.nama || ''} (.docx) berhasil diunduh.`);
      }
    } catch (e: any) {
      const msg = e?.message || 'Gagal mengunduh dokumen.';
      setExportErrorMsg(msg);
      onToast(msg);
    } finally {
      setDownloadingDocIdx(null);
    }
  };

  const readyCount = readinessList.filter((r) => r.tersedia).length;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 0 28px', minWidth: 0 }}>
      {/* Top Bar Navigasi Balik */}
      <div className="no-print" style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={onBackToClassHub}
          className="btn btn-sm btn-outline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Kembali ke Kelas & Peta TP</span>
        </button>
      </div>

      {/* Header Card Calm Workspace */}
      <div
        className="v21-bento-card"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '22px 24px',
          color: '#172033',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            className="tabular-nums"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 600,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <FileCheck size={13} aria-hidden="true" />
            <span>{readyCount}/9 komponen memiliki data aktif</span>
          </span>

          <span
            className="tabular-nums"
            style={{
              background: evalSummary.isPenilaianLengkap ? '#f0fdf4' : '#f8fafc',
              color: evalSummary.isPenilaianLengkap ? '#15803d' : '#475569',
              border: evalSummary.isPenilaianLengkap ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              fontWeight: 600,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ClipboardCheck size={13} aria-hidden="true" />
            <span>
              {evalSummary.isPenilaianLengkap
                ? `Telaah Pengawas: ${evalSummary.skorTerkumpul}/${evalSummary.skorMaksimalTotal} (${evalSummary.predikat})`
                : `Telaah Pengawas: ${evalSummary.jumlahDiperiksa}/9 diperiksa`}
            </span>
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.25, color: '#172033' }}>
          Paket administrasi supervisi
        </h1>

        <p style={{ fontSize: 13.5, color: '#475569', maxWidth: 820, marginBottom: 16, lineHeight: 1.55 }}>
          Susun dan unduh 9 dokumen standar supervisi akademik (01–09) secara terpisah (.docx), arsip terstruktur (.zip), atau Master Bundel lengkap (.docx). Seluruh file menggunakan pembangun dokumen modul yang sama dengan data kelas aktual.
        </p>

        {/* Metadata Strip */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 9,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12.5,
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            Sekolah: <strong style={{ color: '#172033' }}>{schoolProfile.namaSekolah || 'Belum diisi'}</strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Mapel: <strong style={{ color: '#172033' }}>{schoolProfile.mataPelajaranUtama}</strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Kelas & Rombel:{' '}
            <strong style={{ color: '#172033' }}>
              Kelas {schoolProfile.kelasUtama} ({schoolProfile.rombelAktif})
            </strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Semester: <strong style={{ color: '#172033' }}>{schoolProfile.semester}</strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Guru:{' '}
            <strong style={{ color: '#172033' }}>
              {schoolProfile.namaGuru || 'Belum diisi'}
            </strong>
          </div>
        </div>

        {/* Peringatan Data Simulasi / Legacy Belum Terverifikasi */}
        {needsExportVerificationWarning(kelasHarian) && (
          <div
            role="status"
            className="no-print"
            style={{
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: isKelasHarianLegacyUnverified(kelasHarian) ? '#eff6ff' : '#fffbeb',
              border: isKelasHarianLegacyUnverified(kelasHarian) ? '1px solid #93c5fd' : '1px solid #fcd34d',
              color: isKelasHarianLegacyUnverified(kelasHarian) ? '#1e3a8a' : '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div>
              {isKelasHarianLegacyUnverified(kelasHarian) ? (
                <>
                  <strong>Data Kelas Harian Berasal dari Versi Lama (legacy_unverified):</strong>{' '}
                  Buka menu Presensi untuk mengonfirmasi sebagai data aktual atau menggantinya sebelum pengesahan supervisi resmi. Ekspor tetap meminta konfirmasi dan menandai dokumen.
                </>
              ) : (
                <>
                  <strong>Data Kelas Harian Masih Simulasi ({kelasHarian.daftarSiswa.length} siswa contoh):</strong>{' '}
                  Dokumen Presensi, Jurnal, Nilai, dan e-Rapor saat ini memuat data simulasi. Impor daftar siswa asli di menu Presensi atau kosongkan kelas sebelum pengesahan resmi.
                </>
              )}
            </div>
          </div>
        )}

        {exportErrorMsg && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <strong>Gagal Menyusun Ekspor Supervisi:</strong> {exportErrorMsg}
          </div>
        )}

        {/* Tombol Ekspor Paket */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadMaster}
            disabled={isDownloadingMaster}
            className="btn btn-primary"
          >
            <Download size={16} aria-hidden="true" />
            <span>
              {isDownloadingMaster
                ? 'Menyusun bundel...'
                : 'Unduh master bundel (.docx)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="btn btn-outline"
          >
            <Archive size={16} aria-hidden="true" />
            <span>
              {isDownloadingZip
                ? 'Mengemas 9 DOCX...'
                : 'Unduh arsip per file (.zip)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowBundlePreview((prev) => !prev)}
            className="btn btn-outline"
            aria-expanded={showBundlePreview}
          >
            <Eye size={15} aria-hidden="true" />
            <span>{showBundlePreview ? 'Tutup pratinjau bundel' : 'Pratinjau isi master bundel'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDashboard}
            className="btn btn-outline"
          >
            <Printer size={15} aria-hidden="true" />
            <span>Cetak lembar daftar</span>
          </button>
        </div>

        {/* Panel Pratinjau Master Bundel (sinkron langsung dengan isi Master DOCX & ZIP 01-09) */}
        {showBundlePreview && (
          <div
            style={{
              marginTop: 16,
              padding: '16px 18px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Pratinjau Struktur & Isi Master Bundel (01–09)
                </h2>
                <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>
                  Mencerminkan data aktual yang akan ditulis ke `Bundel_Supervisi_Lengkap.docx` dan ke-9 file ZIP.
                </p>
              </div>
              <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', padding: '3px 10px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                Presensi: H {presensiAggregate.hadir} · S {presensiAggregate.sakit} · I {presensiAggregate.izin} · A {presensiAggregate.alfa}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 8 }}>
              {readinessList.map((item) => (
                <div
                  key={item.kode}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '9px 11px',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                    <strong style={{ color: '#0f172a' }}>
                      {item.kode}. {item.nama}
                    </strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: !item.tersedia ? '#b91c1c' : item.perluPerhatianData ? '#b45309' : '#15803d',
                      }}
                    >
                      {!item.tersedia ? 'Belum tersedia' : item.perluPerhatianData ? 'Perhatian' : 'Siap'}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11.5 }}>{item.ringkasan}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daftar 9 Dokumen Administrasi (Nomor 01–09 konsisten dengan ZIP & Master Bundle) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#172033', margin: 0 }}>
              Daftar dokumen dalam paket ({SUPERVISI_DOCUMENT_DEFINITIONS.length} berkas: 01–09)
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
              Penomoran dan isi berkas tunggal (.docx) identik dengan struktur arsip ZIP dan Master Bundel.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
          {SUPERVISI_DOCUMENT_DEFINITIONS.map((docDef, index) => {
            const isDownloadingThis = downloadingDocIdx === docDef.id;
            const readiness = readinessList[index];

            return (
              <div
                key={docDef.id}
                className="v21-bento-card"
                style={{
                  padding: '15px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {DOC_ICONS[docDef.id] || <FileText size={18} color="#2563eb" />}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                        {docDef.kategori}
                      </span>
                    </div>
                    <span
                      style={{
                        background: !readiness?.tersedia
                          ? '#fef2f2'
                          : readiness?.perluPerhatianData
                          ? '#fffbeb'
                          : '#f0fdf4',
                        color: !readiness?.tersedia
                          ? '#b91c1c'
                          : readiness?.perluPerhatianData
                          ? '#b45309'
                          : '#15803d',
                        border: '1px solid #e2e8f0',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {!readiness?.tersedia
                        ? 'Data kosong'
                        : readiness?.perluPerhatianData
                        ? 'Perlu verifikasi'
                        : docDef.tag}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#172033', margin: '0 0 4px', lineHeight: 1.35 }}>
                    <span className="tabular-nums">{docDef.kode}.</span> {docDef.nama}
                  </h3>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: '0 0 6px' }}>
                    {docDef.deskripsi}
                  </p>
                  {readiness && (
                    <p style={{ fontSize: 11.5, color: '#475569', fontWeight: 500, margin: '0 0 12px' }}>
                      Status data: {readiness.ringkasan}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ShieldCheck size={13} style={{ color: '#2563eb' }} aria-hidden="true" />
                    <span>{docDef.zipFileName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(docDef.id)}
                    disabled={isDownloadingThis}
                    className="btn btn-sm btn-outline no-print"
                  >
                    <Download size={12} aria-hidden="true" />
                    <span>{isDownloadingThis ? 'Mengunduh...' : 'Unduh (.docx)'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instrumen Supervisi Interaktif & Dapat Diedit Pengawas */}
      <div
        className="v21-bento-card"
        style={{
          padding: '18px 20px',
          background: '#ffffff',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#172033', margin: 0 }}>
              Instrumen telaah & verifikasi pengawas (01–09)
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
              Skor dan predikat hanya dihitung dari komponen yang benar-benar diperiksa oleh kepala sekolah atau pengawas.
            </p>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleResetInstrument}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset isian</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadInstrumenOnly}
              className="btn btn-sm btn-outline"
            >
              <Download size={13} aria-hidden="true" />
              <span>Unduh instrumen supervisi (.docx)</span>
            </button>
          </div>
        </div>

        {/* Identitas Pengawas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
            gap: 10,
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <label htmlFor="supervisi-nama-pengawas" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Nama Pengawas / Kepala Sekolah
            </label>
            <input
              id="supervisi-nama-pengawas"
              type="text"
              className="form-input"
              placeholder="Belum diisi"
              value={instrument.namaPengawas}
              onChange={(e) => handleUpdateInstrumentMeta('namaPengawas', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '6px 9px' }}
            />
          </div>
          <div>
            <label htmlFor="supervisi-nip-pengawas" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              NIP Pengawas
            </label>
            <input
              id="supervisi-nip-pengawas"
              type="text"
              className="form-input"
              placeholder="Opsional"
              value={instrument.nipPengawas}
              onChange={(e) => handleUpdateInstrumentMeta('nipPengawas', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '6px 9px' }}
            />
          </div>
          <div>
            <label htmlFor="supervisi-jabatan-pengawas" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Jabatan Penelaah
            </label>
            <input
              id="supervisi-jabatan-pengawas"
              type="text"
              className="form-input"
              value={instrument.jabatanPengawas}
              onChange={(e) => handleUpdateInstrumentMeta('jabatanPengawas', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '6px 9px' }}
            />
          </div>
          <div>
            <label htmlFor="supervisi-tanggal" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Tanggal Supervisi
            </label>
            <input
              id="supervisi-tanggal"
              type="date"
              className="form-input"
              value={instrument.tanggalSupervisi}
              onChange={(e) => handleUpdateInstrumentMeta('tanggalSupervisi', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '6px 9px' }}
            />
          </div>
        </div>

        {/* Ringkasan Hasil Penilaian Pengawas (Tanpa Angka Palsu 18/18) */}
        <div
          className="tabular-nums"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Komponen Diperiksa</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {evalSummary.jumlahDiperiksa} / {evalSummary.totalKomponen}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Skor Terhitung</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: evalSummary.jumlahDinilai > 0 ? '#1d4ed8' : '#64748b', marginTop: 2 }}>
              {evalSummary.jumlahDinilai === 0
                ? 'Belum dinilai'
                : `${evalSummary.skorTerkumpul} / ${evalSummary.skorMaksimalDiperiksa}`}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Predikat Supervisi</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: evalSummary.isPenilaianLengkap ? '#15803d' : '#92400e', marginTop: 4 }}>
              {evalSummary.isPenilaianLengkap
                ? `${evalSummary.predikat} (${evalSummary.persentaseDinilai}%)`
                : 'Belum ditetapkan'}
            </div>
            {!evalSummary.isPenilaianLengkap && evalSummary.alasanBelumLengkap && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {evalSummary.alasanBelumLengkap}
              </div>
            )}
          </div>
        </div>

        {/* Tabel Instrumen Editable */}
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: 46, textAlign: 'center' }}>No</th>
                <th style={{ minWidth: 210, textAlign: 'left' }}>Komponen & Status Data</th>
                <th style={{ width: 155, textAlign: 'left' }}>Status Telaah</th>
                <th style={{ width: 115, textAlign: 'center' }}>Skor (0–2)</th>
                <th style={{ minWidth: 200, textAlign: 'left' }}>Catatan Pengawas</th>
                <th style={{ minWidth: 190, textAlign: 'left' }}>Rekomendasi</th>
                <th style={{ minWidth: 190, textAlign: 'left' }}>Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {instrument.items.map((item, idx) => {
                const readiness = readinessList[idx];
                const isUninspected = item.status === 'belum_diperiksa';
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                      {item.kode}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.komponen}</div>
                      {readiness && (
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          {readiness.ringkasan}
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        aria-label={`Status telaah ${item.kode}`}
                        className="form-select"
                        value={item.status}
                        onChange={(e) =>
                          handleUpdateChecklistItem(item.id, {
                            status: e.target.value as SupervisiItemStatus,
                          })
                        }
                        style={{ width: '100%', fontSize: 12.5, padding: '5px 8px' }}
                      >
                        {(Object.keys(SUPERVISI_STATUS_LABELS) as SupervisiItemStatus[]).map((key) => (
                          <option key={key} value={key}>
                            {SUPERVISI_STATUS_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <select
                        aria-label={`Skor telaah ${item.kode}`}
                        className="form-select"
                        disabled={isUninspected}
                        value={item.skor === null ? '' : String(item.skor)}
                        onChange={(e) => {
                          const v = e.target.value;
                          handleUpdateChecklistItem(item.id, {
                            skor: v === '' ? null : Number(v),
                          });
                        }}
                        style={{ width: '100%', fontSize: 12.5, padding: '5px 8px' }}
                      >
                        <option value="">Belum dinilai</option>
                        <option value="0">0 (Tidak ada)</option>
                        <option value="1">1 (Perlu perbaikan)</option>
                        <option value="2">2 (Lengkap & sesuai)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label={`Catatan pengawas ${item.kode}`}
                        className="form-input"
                        placeholder="Isi hasil temuan nyata..."
                        value={item.catatan}
                        onChange={(e) =>
                          handleUpdateChecklistItem(item.id, { catatan: e.target.value })
                        }
                        style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label={`Rekomendasi ${item.kode}`}
                        className="form-input"
                        placeholder="Saran perbaikan..."
                        value={item.rekomendasi}
                        onChange={(e) =>
                          handleUpdateChecklistItem(item.id, { rekomendasi: e.target.value })
                        }
                        style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label={`Tindak lanjut ${item.kode}`}
                        className="form-input"
                        placeholder="Langkah tindak lanjut..."
                        value={item.tindakLanjut}
                        onChange={(e) =>
                          handleUpdateChecklistItem(item.id, { tindakLanjut: e.target.value })
                        }
                        style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Catatan, Rekomendasi & Tindak Lanjut Umum */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 12,
            marginTop: 14,
          }}
        >
          <div>
            <label htmlFor="supervisi-catatan-umum" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Catatan Umum Pengawas
            </label>
            <textarea
              id="supervisi-catatan-umum"
              rows={2}
              className="form-textarea"
              placeholder="Belum diisi oleh pengawas."
              value={instrument.catatanUmum}
              onChange={(e) => handleUpdateInstrumentMeta('catatanUmum', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
            />
          </div>
          <div>
            <label htmlFor="supervisi-rekomendasi-umum" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Rekomendasi Pembinaan
            </label>
            <textarea
              id="supervisi-rekomendasi-umum"
              rows={2}
              className="form-textarea"
              placeholder="Belum diisi oleh pengawas."
              value={instrument.rekomendasiUmum}
              onChange={(e) => handleUpdateInstrumentMeta('rekomendasiUmum', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
            />
          </div>
          <div>
            <label htmlFor="supervisi-tindak-lanjut-umum" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Rencana Tindak Lanjut
            </label>
            <textarea
              id="supervisi-tindak-lanjut-umum"
              rows={2}
              className="form-textarea"
              placeholder="Belum diisi oleh pengawas."
              value={instrument.tindakLanjutUmum}
              onChange={(e) => handleUpdateInstrumentMeta('tindakLanjutUmum', e.target.value)}
              style={{ width: '100%', fontSize: 12.5, padding: '7px 10px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
