import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';
import type {
  AcademicSpecialEvent,
  SemesterAcademicCalendar,
  SubjectJPConfig,
} from '../../types/academicSchedule';
import {
  generateSemesterWeekColumns,
  getAcademicCalendarForContext,
  resetAcademicCalendarToTemplate,
  saveAcademicCalendar,
} from '../../utils/academicCalendarStorage';
import {
  getSubjectJPConfig,
  resetSubjectJPConfigToPreset,
  saveSubjectJPConfig,
} from '../../utils/jpConfigStorage';

interface AcademicScheduleConfigPanelProps {
  schoolProfile: SchoolProfile;
  tpList?: CustomTPItem[];
  onUpdateTPList?: (nextList: CustomTPItem[]) => void;
  defaultSemesterTab?: '1 (Ganjil)' | '2 (Genap)';
  allowSemesterSwitch?: boolean;
  onScheduleChanged: () => void;
  onToast: (msg: string) => void;
}

export const AcademicScheduleConfigPanel: React.FC<AcademicScheduleConfigPanelProps> = ({
  schoolProfile,
  tpList,
  onUpdateTPList,
  defaultSemesterTab,
  allowSemesterSwitch = true,
  onScheduleChanged,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'kalender' | 'jp' | 'tp_rentang'>('kalender');
  const [editingSemester, setEditingSemester] = useState<'1 (Ganjil)' | '2 (Genap)'>(
    defaultSemesterTab || schoolProfile.semester
  );

  const [calendarDraft, setCalendarDraft] = useState<SemesterAcademicCalendar>(() =>
    getAcademicCalendarForContext(schoolProfile, defaultSemesterTab || schoolProfile.semester)
  );
  const [jpDraft, setJpDraft] = useState<SubjectJPConfig>(() =>
    getSubjectJPConfig(schoolProfile)
  );

  // Form tambah Libur Nasional / Keagamaan
  const [newHolName, setNewHolName] = useState('');
  const [newHolStart, setNewHolStart] = useState('');
  const [newHolEnd, setNewHolEnd] = useState('');

  // Form tambah Libur Sekolah / Kegiatan Khusus
  const [newEvtName, setNewEvtName] = useState('');
  const [newEvtStart, setNewEvtStart] = useState('');
  const [newEvtEnd, setNewEvtEnd] = useState('');
  const [newEvtCategory, setNewEvtCategory] = useState<'libur_sekolah' | 'kegiatan_khusus'>(
    'kegiatan_khusus'
  );
  const [newEvtBlocking, setNewEvtBlocking] = useState(true);

  useEffect(() => {
    setCalendarDraft(getAcademicCalendarForContext(schoolProfile, editingSemester));
  }, [
    schoolProfile.schoolId,
    schoolProfile.tahunAjaran,
    editingSemester,
  ]);

  useEffect(() => {
    setJpDraft(getSubjectJPConfig(schoolProfile));
  }, [
    schoolProfile.schoolId,
    schoolProfile.jenjang,
    schoolProfile.kelasUtama,
    schoolProfile.mataPelajaranUtama,
  ]);

  const previewColumns = useMemo(
    () => generateSemesterWeekColumns(calendarDraft, jpDraft.jpPerMinggu),
    [calendarDraft, jpDraft.jpPerMinggu]
  );

  const efektifCount = previewColumns.filter((c) => c.isEfektif).length;
  const nonEfektifCount = previewColumns.length - efektifCount;
  const kapasitasPreview = previewColumns.reduce(
    (sum, c) => sum + (c.isEfektif ? c.kapasitasJP ?? jpDraft.jpPerMinggu : 0),
    0
  );

  const handleSaveCalendar = (confirmOfficial: boolean) => {
    const saved = saveAcademicCalendar(schoolProfile, calendarDraft, confirmOfficial);
    setCalendarDraft(saved);
    onScheduleChanged();
    onToast(
      confirmOfficial
        ? `Kalender akademik Semester ${editingSemester} dikonfirmasi & disimpan!`
        : `Perubahan kalender Semester ${editingSemester} disimpan (masih berstatus draf).`
    );
  };

  const handleResetCalendar = () => {
    const reset = resetAcademicCalendarToTemplate(schoolProfile, editingSemester);
    setCalendarDraft(reset);
    onScheduleChanged();
    onToast(`Kalender Semester ${editingSemester} dikembalikan ke template awal.`);
  };

  const handleAddHoliday = () => {
    if (!newHolName.trim() || !newHolStart) {
      onToast('Isi nama hari libur nasional/keagamaan dan tanggal mulainya.');
      return;
    }
    const end = newHolEnd || newHolStart;
    const nextItem: AcademicSpecialEvent = {
      id: `hol_${Date.now().toString(36)}`,
      nama: newHolName.trim(),
      startDate: newHolStart <= end ? newHolStart : end,
      endDate: newHolStart <= end ? end : newHolStart,
      kategori: 'libur_nasional',
      blokirPembelajaran: true,
    };
    const updated: SemesterAcademicCalendar = {
      ...calendarDraft,
      liburNasionalKeagamaan: [...calendarDraft.liburNasionalKeagamaan, nextItem],
    };
    const saved = saveAcademicCalendar(
      schoolProfile,
      updated,
      calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
    );
    setCalendarDraft(saved);
    setNewHolName('');
    setNewHolStart('');
    setNewHolEnd('');
    onScheduleChanged();
  };

  const handleRemoveHoliday = (id: string) => {
    const updated: SemesterAcademicCalendar = {
      ...calendarDraft,
      liburNasionalKeagamaan: calendarDraft.liburNasionalKeagamaan.filter((h) => h.id !== id),
    };
    const saved = saveAcademicCalendar(
      schoolProfile,
      updated,
      calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
    );
    setCalendarDraft(saved);
    onScheduleChanged();
  };

  const handleAddSchoolEvent = () => {
    if (!newEvtName.trim() || !newEvtStart) {
      onToast('Isi nama agenda/libur sekolah dan tanggal mulainya.');
      return;
    }
    const end = newEvtEnd || newEvtStart;
    const item: AcademicSpecialEvent = {
      id: `evt_${Date.now().toString(36)}`,
      nama: newEvtName.trim(),
      startDate: newEvtStart <= end ? newEvtStart : end,
      endDate: newEvtStart <= end ? end : newEvtStart,
      kategori: newEvtCategory,
      blokirPembelajaran: newEvtCategory === 'libur_sekolah' ? true : newEvtBlocking,
    };
    const updated: SemesterAcademicCalendar =
      newEvtCategory === 'libur_sekolah'
        ? { ...calendarDraft, liburSekolah: [...calendarDraft.liburSekolah, item] }
        : {
            ...calendarDraft,
            kegiatanKhususSekolah: [...calendarDraft.kegiatanKhususSekolah, item],
          };
    const saved = saveAcademicCalendar(
      schoolProfile,
      updated,
      calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
    );
    setCalendarDraft(saved);
    setNewEvtName('');
    setNewEvtStart('');
    setNewEvtEnd('');
    onScheduleChanged();
  };

  const handleRemoveSchoolEvent = (id: string, kategori: 'libur_sekolah' | 'kegiatan_khusus') => {
    const updated: SemesterAcademicCalendar =
      kategori === 'libur_sekolah'
        ? { ...calendarDraft, liburSekolah: calendarDraft.liburSekolah.filter((x) => x.id !== id) }
        : {
            ...calendarDraft,
            kegiatanKhususSekolah: calendarDraft.kegiatanKhususSekolah.filter((x) => x.id !== id),
          };
    const saved = saveAcademicCalendar(
      schoolProfile,
      updated,
      calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
    );
    setCalendarDraft(saved);
    onScheduleChanged();
  };

  const handleToggleWeekEffective = (weekKey: string, currentEfektif: boolean) => {
    const nextOverrides = { ...calendarDraft.manualWeekOverrides };
    if (nextOverrides[weekKey]) {
      delete nextOverrides[weekKey];
    } else {
      nextOverrides[weekKey] = {
        isEfektif: !currentEfektif,
        labelKegiatan: !currentEfektif ? undefined : 'Non-Efektif (Manual)',
      };
    }
    const updated: SemesterAcademicCalendar = {
      ...calendarDraft,
      manualWeekOverrides: nextOverrides,
    };
    const saved = saveAcademicCalendar(
      schoolProfile,
      updated,
      calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
    );
    setCalendarDraft(saved);
    onScheduleChanged();
  };

  const handleSaveJP = (confirmTeacher: boolean) => {
    const saved = saveSubjectJPConfig(schoolProfile, jpDraft, confirmTeacher);
    setJpDraft(saved);
    onScheduleChanged();
    onToast(
      confirmTeacher
        ? `Alokasi ${saved.jpPerMinggu} JP/minggu (${saved.durasiJPMinut} mnt) untuk ${saved.mataPelajaran} dikonfirmasi!`
        : 'Perubahan JP mata pelajaran disimpan.'
    );
  };

  const handleResetJP = () => {
    const reset = resetSubjectJPConfigToPreset(schoolProfile);
    setJpDraft(reset);
    onScheduleChanged();
    onToast(`Alokasi JP ${schoolProfile.mataPelajaranUtama} dikembalikan ke estimasi preset.`);
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('kalender')}
            className={`btn btn-sm ${activeTab === 'kalender' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Calendar size={14} aria-hidden="true" />
            Kalender Akademik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jp')}
            className={`btn btn-sm ${activeTab === 'jp' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Clock size={14} aria-hidden="true" />
            Alokasi JP Mapel
          </button>
          {tpList && onUpdateTPList && (
            <button
              type="button"
              onClick={() => setActiveTab('tp_rentang')}
              className={`btn btn-sm ${activeTab === 'tp_rentang' ? 'btn-primary' : 'btn-outline'}`}
            >
              Rentang Minggu & JP per TP ({tpList.length})
            </button>
          )}
        </div>

        {activeTab === 'kalender' && allowSemesterSwitch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Semester Kalender:</span>
            <select
              aria-label="Pilih semester kalender akademik"
              className="form-select"
              value={editingSemester}
              onChange={(e) =>
                setEditingSemester(
                  e.target.value.startsWith('2') ? '2 (Genap)' : '1 (Ganjil)'
                )
              }
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="1 (Ganjil)">1 (Ganjil)</option>
              <option value="2 (Genap)">2 (Genap)</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: KALENDER AKADEMIK */}
      {activeTab === 'kalender' && (
        <div>
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 12,
              background:
                calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah' ? '#ecfdf5' : '#fffbeb',
              border:
                calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                  ? '1px solid #a7f3d0'
                  : '1px solid #fde68a',
              color:
                calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah' ? '#065f46' : '#92400e',
              fontSize: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            {calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah' ? (
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            ) : (
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            )}
            <div>
              <strong>
                {calendarDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                  ? `Kalender Resmi Sekolah Semester ${editingSemester} (Terkonfirmasi)`
                  : `Template Kalender Awal Semester ${editingSemester} — Belum Dikonfirmasi Sekolah`}
              </strong>
              <div style={{ marginTop: 2 }}>
                Ringkasan: <strong>{efektifCount} minggu efektif</strong> • {nonEfektifCount} minggu
                non-efektif • Kapasitas estimasi: <strong>{kapasitasPreview} JP</strong> (TA{' '}
                {calendarDraft.tahunAjaran}).
              </div>
            </div>
          </div>

          {/* Rentang Tanggal Inti Semester */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label htmlFor="cal-start-sem" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Mulai Semester
              </label>
              <input
                id="cal-start-sem"
                type="date"
                className="form-input"
                value={calendarDraft.tanggalMulaiSemester}
                onChange={(e) =>
                  setCalendarDraft({ ...calendarDraft, tanggalMulaiSemester: e.target.value })
                }
                style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}
              />
            </div>
            <div>
              <label htmlFor="cal-end-sem" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Akhir Semester
              </label>
              <input
                id="cal-end-sem"
                type="date"
                className="form-input"
                value={calendarDraft.tanggalAkhirSemester}
                onChange={(e) =>
                  setCalendarDraft({ ...calendarDraft, tanggalAkhirSemester: e.target.value })
                }
                style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}
              />
            </div>
            <div>
              <label htmlFor="cal-hari-kerja" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Hari Kerja Sekolah
              </label>
              <select
                id="cal-hari-kerja"
                className="form-select"
                value={calendarDraft.hariSekolahPerMinggu}
                onChange={(e) =>
                  setCalendarDraft({
                    ...calendarDraft,
                    hariSekolahPerMinggu: Number(e.target.value) === 6 ? 6 : 5,
                  })
                }
                style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}
              >
                <option value={5}>5 Hari (Senin–Jumat)</option>
                <option value={6}>6 Hari (Senin–Sabtu)</option>
              </select>
            </div>
            <div>
              <label htmlFor="cal-rapor-date" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tanggal Pembagian Rapor
              </label>
              <input
                id="cal-rapor-date"
                type="date"
                className="form-input"
                value={calendarDraft.pembagianRaporDate}
                onChange={(e) =>
                  setCalendarDraft({ ...calendarDraft, pembagianRaporDate: e.target.value })
                }
                style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}
              />
            </div>
          </div>

          {/* MPLS, STS, SAS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: 10,
              marginBottom: 12,
              minWidth: 0,
            }}
          >
            <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Jadwal MPLS / Orientasi</span>
                <label style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(calendarDraft.mplsRange)}
                    onChange={(e) =>
                      setCalendarDraft({
                        ...calendarDraft,
                        mplsRange: e.target.checked
                          ? {
                              startDate: calendarDraft.tanggalMulaiSemester,
                              endDate: calendarDraft.tanggalMulaiSemester,
                              label: 'MPLS',
                            }
                          : null,
                      })
                    }
                  />
                  Aktif
                </label>
              </div>
              {calendarDraft.mplsRange ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 6, minWidth: 0 }}>
                  <input
                    aria-label="Mulai MPLS"
                    type="date"
                    className="form-input"
                    value={calendarDraft.mplsRange.startDate}
                    onChange={(e) =>
                      setCalendarDraft({
                        ...calendarDraft,
                        mplsRange: { ...calendarDraft.mplsRange!, startDate: e.target.value },
                      })
                    }
                    style={{ fontSize: 11.5, padding: '4px 6px', minWidth: 0 }}
                  />
                  <input
                    aria-label="Selesai MPLS"
                    type="date"
                    className="form-input"
                    value={calendarDraft.mplsRange.endDate}
                    onChange={(e) =>
                      setCalendarDraft({
                        ...calendarDraft,
                        mplsRange: { ...calendarDraft.mplsRange!, endDate: e.target.value },
                      })
                    }
                    style={{ fontSize: 11.5, padding: '4px 6px', minWidth: 0 }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Tidak ada MPLS pada semester ini.</div>
              )}
            </div>

            <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Jadwal STS / PTS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 6, minWidth: 0 }}>
                <input
                  aria-label="Mulai STS"
                  type="date"
                  className="form-input"
                  value={calendarDraft.stsRange.startDate}
                  onChange={(e) =>
                    setCalendarDraft({
                      ...calendarDraft,
                      stsRange: { ...calendarDraft.stsRange, startDate: e.target.value },
                    })
                  }
                  style={{ fontSize: 11.5, padding: '4px 6px', minWidth: 0 }}
                />
                <input
                  aria-label="Selesai STS"
                  type="date"
                  className="form-input"
                  value={calendarDraft.stsRange.endDate}
                  onChange={(e) =>
                    setCalendarDraft({
                      ...calendarDraft,
                      stsRange: { ...calendarDraft.stsRange, endDate: e.target.value },
                    })
                  }
                  style={{ fontSize: 11.5, padding: '4px 6px', minWidth: 0 }}
                />
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Jadwal SAS / SAT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 6, minWidth: 0 }}>
                <input
                  aria-label="Mulai SAS"
                  type="date"
                  className="form-input"
                  value={calendarDraft.sasRange.startDate}
                  onChange={(e) =>
                    setCalendarDraft({
                      ...calendarDraft,
                      sasRange: { ...calendarDraft.sasRange, startDate: e.target.value },
                    })
                  }
                  style={{ fontSize: 11.5, padding: '4px 6px' }}
                />
                <input
                  aria-label="Selesai SAS"
                  type="date"
                  className="form-input"
                  value={calendarDraft.sasRange.endDate}
                  onChange={(e) =>
                    setCalendarDraft({
                      ...calendarDraft,
                      sasRange: { ...calendarDraft.sasRange, endDate: e.target.value },
                    })
                  }
                  style={{ fontSize: 11.5, padding: '4px 6px' }}
                />
              </div>
            </div>
          </div>

          {/* Libur Nasional & Keagamaan + Kegiatan Khusus */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: 12,
              marginBottom: 12,
              minWidth: 0,
            }}
          >
            {/* Libur Nasional & Keagamaan */}
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                Libur Nasional & Keagamaan
              </div>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                Tambahkan Idul Fitri, Nyepi, Wafat Isa Almasih, dll. sesuai kalender tahun berjalan (tidak di-hardcode).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Libur Idul Fitri / Cuti Bersama"
                  value={newHolName}
                  onChange={(e) => setNewHolName(e.target.value)}
                  style={{ fontSize: 12, padding: '5px 8px' }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    aria-label="Mulai libur nasional"
                    type="date"
                    className="form-input"
                    value={newHolStart}
                    onChange={(e) => setNewHolStart(e.target.value)}
                    style={{ flex: 1, minWidth: 120, fontSize: 11.5, padding: '4px 6px' }}
                  />
                  <input
                    aria-label="Selesai libur nasional"
                    type="date"
                    className="form-input"
                    value={newHolEnd}
                    onChange={(e) => setNewHolEnd(e.target.value)}
                    style={{ flex: 1, minWidth: 120, fontSize: 11.5, padding: '4px 6px' }}
                  />
                  <button type="button" onClick={handleAddHoliday} className="btn btn-sm btn-outline">
                    <Plus size={13} aria-hidden="true" /> Tambah
                  </button>
                </div>
              </div>
              {calendarDraft.liburNasionalKeagamaan.length === 0 ? (
                <div style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                  Belum ada hari libur nasional/keagamaan ditambahkan.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {calendarDraft.liburNasionalKeagamaan.map((ev) => (
                    <li
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 11.5,
                        padding: '4px 8px',
                        background: '#fef2f2',
                        borderRadius: 6,
                        color: '#991b1b',
                      }}
                    >
                      <span>
                        <strong>{ev.nama}</strong> ({ev.startDate} s.d. {ev.endDate})
                      </span>
                      <button
                        type="button"
                        aria-label={`Hapus ${ev.nama}`}
                        onClick={() => handleRemoveHoliday(ev.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Libur Sekolah & Kegiatan Khusus */}
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                Libur Sekolah & Kegiatan Khusus
              </div>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                Contoh: Class Meeting, Pesantren Kilat, ANBK, Libur Semester, Study Tour.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama kegiatan / libur sekolah"
                    value={newEvtName}
                    onChange={(e) => setNewEvtName(e.target.value)}
                    style={{ flex: 2, minWidth: 140, fontSize: 12, padding: '5px 8px' }}
                  />
                  <select
                    aria-label="Jenis agenda sekolah"
                    className="form-select"
                    value={newEvtCategory}
                    onChange={(e) =>
                      setNewEvtCategory(
                        e.target.value === 'libur_sekolah' ? 'libur_sekolah' : 'kegiatan_khusus'
                      )
                    }
                    style={{ flex: 1, minWidth: 115, fontSize: 11.5, padding: '4px 6px' }}
                  >
                    <option value="kegiatan_khusus">Kegiatan Khusus</option>
                    <option value="libur_sekolah">Libur Sekolah</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    aria-label="Mulai agenda sekolah"
                    type="date"
                    className="form-input"
                    value={newEvtStart}
                    onChange={(e) => setNewEvtStart(e.target.value)}
                    style={{ flex: 1, minWidth: 115, fontSize: 11.5, padding: '4px 6px' }}
                  />
                  <input
                    aria-label="Selesai agenda sekolah"
                    type="date"
                    className="form-input"
                    value={newEvtEnd}
                    onChange={(e) => setNewEvtEnd(e.target.value)}
                    style={{ flex: 1, minWidth: 115, fontSize: 11.5, padding: '4px 6px' }}
                  />
                  {newEvtCategory === 'kegiatan_khusus' && (
                    <label style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={newEvtBlocking}
                        onChange={(e) => setNewEvtBlocking(e.target.checked)}
                      />
                      Blokir KBM
                    </label>
                  )}
                  <button type="button" onClick={handleAddSchoolEvent} className="btn btn-sm btn-outline">
                    <Plus size={13} aria-hidden="true" /> Tambah
                  </button>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[...calendarDraft.liburSekolah, ...calendarDraft.kegiatanKhususSekolah].map((ev) => (
                  <li
                    key={ev.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11.5,
                      padding: '4px 8px',
                      background: ev.kategori === 'libur_sekolah' ? '#f1f5f9' : '#eff6ff',
                      borderRadius: 6,
                      color: '#334155',
                    }}
                  >
                    <span>
                      <strong>{ev.nama}</strong> ({ev.startDate} s.d. {ev.endDate})
                    </span>
                    <button
                      type="button"
                      aria-label={`Hapus ${ev.nama}`}
                      onClick={() =>
                        handleRemoveSchoolEvent(
                          ev.id,
                          ev.kategori === 'libur_sekolah' ? 'libur_sekolah' : 'kegiatan_khusus'
                        )
                      }
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Grid Minggu Efektif / Non-Efektif Klik Langsung */}
          <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12, minWidth: 0, maxWidth: '100%' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              Peta Minggu Efektif vs Non-Efektif (Klik minggu untuk ubah manual)
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {previewColumns.map((col) => {
                const wkKey = col.weekKey || `${col.bulanNama}-${col.mingguKe}`;
                const isOverridden = Boolean(calendarDraft.manualWeekOverrides?.[wkKey]);
                return (
                  <button
                    key={wkKey}
                    type="button"
                    onClick={() => handleToggleWeekEffective(wkKey, col.isEfektif)}
                    title={`${col.startDate} s.d. ${col.endDate} — ${
                      col.isEfektif ? `${col.kapasitasJP} JP Efektif` : col.labelKegiatan || 'Non-Efektif'
                    } (klik untuk ubah manual)`}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: isOverridden
                        ? '1.5px dashed #1d4ed8'
                        : col.isEfektif
                        ? '1px solid #86efac'
                        : '1px solid #cbd5e1',
                      background: col.isEfektif ? '#ecfdf5' : '#f1f5f9',
                      color: col.isEfektif ? '#166534' : '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div>
                      Mg {col.semesterWeekNumber} · {col.bulanNama.slice(0, 3)} M{col.mingguKe}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500 }}>
                      {col.isEfektif ? `${col.kapasitasJP} JP` : col.labelKegiatan || 'Non-Ef'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSaveCalendar(true)}
              className="btn btn-sm btn-primary"
              style={{ whiteSpace: 'normal', maxWidth: '100%' }}
            >
              <CheckCircle2 size={14} aria-hidden="true" /> Simpan & Konfirmasi Kalender Sekolah
            </button>
            <button
              type="button"
              onClick={() => handleSaveCalendar(false)}
              className="btn btn-sm btn-outline"
            >
              Simpan sebagai Draf
            </button>
            <button
              type="button"
              onClick={handleResetCalendar}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset ke Template
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ALOKASI JP PER MAPEL */}
      {activeTab === 'jp' && (
        <div>
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 12,
              background:
                jpDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                  ? '#ecfdf5'
                  : !jpDraft.tersediaDiKatalogDefault
                  ? '#fef2f2'
                  : '#fffbeb',
              border:
                jpDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                  ? '1px solid #a7f3d0'
                  : !jpDraft.tersediaDiKatalogDefault
                  ? '1px solid #fecaca'
                  : '1px solid #fde68a',
              color:
                jpDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                  ? '#065f46'
                  : !jpDraft.tersediaDiKatalogDefault
                  ? '#991b1b'
                  : '#92400e',
              fontSize: 12,
            }}
          >
            <strong>
              {jpDraft.statusKonfirmasi === 'dikonfirmasi_sekolah'
                ? `Konfigurasi JP ${jpDraft.mataPelajaran} Terkonfirmasi Sekolah`
                : !jpDraft.tersediaDiKatalogDefault
                ? `Preset JP ${jpDraft.mataPelajaran} Tidak Tersedia — Harap Isi & Konfirmasi`
                : `Estimasi Awal Beban Belajar ${jpDraft.mataPelajaran} (${jpDraft.jenjang} Kelas ${jpDraft.kelas})`}
            </strong>
            <div style={{ marginTop: 2 }}>
              Sumber: {jpDraft.sumberReferensi}
            </div>
            {jpDraft.catatan && <div style={{ marginTop: 2 }}>{jpDraft.catatan}</div>}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label htmlFor="jp-per-minggu" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                JP per Minggu
              </label>
              <input
                id="jp-per-minggu"
                type="number"
                min={1}
                max={24}
                className="form-input"
                value={jpDraft.jpPerMinggu}
                onChange={(e) =>
                  setJpDraft({
                    ...jpDraft,
                    jpPerMinggu: Math.max(1, Math.min(24, Number(e.target.value) || 1)),
                  })
                }
                style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
              />
            </div>
            <div>
              <label htmlFor="jp-durasi-menit" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Durasi 1 JP (Menit)
              </label>
              <input
                id="jp-durasi-menit"
                type="number"
                min={20}
                max={90}
                className="form-input"
                value={jpDraft.durasiJPMinut}
                onChange={(e) =>
                  setJpDraft({
                    ...jpDraft,
                    durasiJPMinut: Math.max(20, Math.min(90, Number(e.target.value) || 35)),
                  })
                }
                style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
              />
            </div>
            <div>
              <label htmlFor="jp-pertemuan-minggu" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Jumlah Pertemuan / Minggu
              </label>
              <input
                id="jp-pertemuan-minggu"
                type="number"
                min={1}
                max={7}
                className="form-input"
                value={jpDraft.pertemuanPerMinggu}
                onChange={(e) =>
                  setJpDraft({
                    ...jpDraft,
                    pertemuanPerMinggu: Math.max(1, Math.min(7, Number(e.target.value) || 1)),
                  })
                }
                style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSaveJP(true)}
              className="btn btn-sm btn-primary"
            >
              <CheckCircle2 size={14} aria-hidden="true" /> Simpan & Konfirmasi Alokasi JP
            </button>
            <button
              type="button"
              onClick={handleResetJP}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset ke Estimasi Mapel
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: RENTANG MINGGU & ALOKASI JP PER TP */}
      {activeTab === 'tp_rentang' && tpList && onUpdateTPList && (
        <div>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
            Atur alokasi JP dan target rentang minggu (Minggu ke-1 s.d. ke-{previewColumns.length}) untuk setiap Tujuan Pembelajaran. Promes akan mengikuti rentang ini secara ketat tanpa mengisi minggu libur.
          </p>
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th style={{ width: 70, textAlign: 'center' }}>Kode</th>
                  <th style={{ textAlign: 'left' }}>Materi Pokok</th>
                  <th style={{ width: 95, textAlign: 'center' }}>Alokasi JP</th>
                  <th style={{ width: 95, textAlign: 'center' }}>Mg Mulai</th>
                  <th style={{ width: 95, textAlign: 'center' }}>Mg Selesai</th>
                </tr>
              </thead>
              <tbody>
                {tpList.map((tp) => (
                  <tr key={tp.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>
                      {tp.kode}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{tp.materiPokok}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        aria-label={`Alokasi JP ${tp.kode}`}
                        type="number"
                        min={1}
                        max={60}
                        className="form-input"
                        value={tp.alokasiJP}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          onUpdateTPList(
                            tpList.map((item) =>
                              item.id === tp.id ? { ...item, alokasiJP: val } : item
                            )
                          );
                        }}
                        style={{ width: 70, textAlign: 'center', fontSize: 12, padding: '4px 6px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        aria-label={`Minggu mulai ${tp.kode}`}
                        type="number"
                        min={1}
                        max={30}
                        className="form-input"
                        value={tp.mingguMulai}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          onUpdateTPList(
                            tpList.map((item) =>
                              item.id === tp.id ? { ...item, mingguMulai: val } : item
                            )
                          );
                        }}
                        style={{ width: 65, textAlign: 'center', fontSize: 12, padding: '4px 6px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        aria-label={`Minggu selesai ${tp.kode}`}
                        type="number"
                        min={1}
                        max={30}
                        className="form-input"
                        value={tp.mingguSelesai}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          onUpdateTPList(
                            tpList.map((item) =>
                              item.id === tp.id ? { ...item, mingguSelesai: val } : item
                            )
                          );
                        }}
                        style={{ width: 65, textAlign: 'center', fontSize: 12, padding: '4px 6px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
