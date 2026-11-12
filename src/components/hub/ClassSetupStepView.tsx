import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ArrowRight,
  Key,
  Building2,
  Plus,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import { angkaKeRomawiKelas } from '../../utils/schoolProfileStorage';
import { KURIKULUM_CATALOG } from '../../utils/kurikulumCatalog';
import type { JenjangKategori } from '../../utils/kurikulumCatalog';
import {
  workspaceSectionVariants,
  workspaceAccordionTransition,
} from '../../utils/motionPresets';

const PARALLEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface ClassSetupStepViewProps {
  schoolProfile: SchoolProfile;
  updateAndPersistProfile: (patch: Partial<SchoolProfile>) => void;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal?: () => void;
  onConfirmClassSetup: () => void;
  onToast: (msg: string) => void;
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#172033',
  margin: 0,
  lineHeight: 1.35,
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};

export const ClassSetupStepView: React.FC<ClassSetupStepViewProps> = ({
  schoolProfile,
  updateAndPersistProfile,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onConfirmClassSetup,
  onToast,
}) => {
  const [showIdentitySettings, setShowIdentitySettings] = useState(false);
  const [showMadrasah, setShowMadrasah] = useState(
    schoolProfile.mataPelajaranUtama.includes('(MI)') ||
      schoolProfile.mataPelajaranUtama.includes('(MTs)') ||
      schoolProfile.mataPelajaranUtama.includes('(MA)') ||
      schoolProfile.mataPelajaranUtama.toLowerCase().includes('fikih') ||
      schoolProfile.mataPelajaranUtama.toLowerCase().includes('akidah') ||
      schoolProfile.mataPelajaranUtama.toLowerCase().includes('qur')
  );
  const [customRombelInput, setCustomRombelInput] = useState('');

  const currentJenjangConfig =
    KURIKULUM_CATALOG[schoolProfile.jenjang] || KURIKULUM_CATALOG['SMP/MTs'];

  const activeMapelList = showMadrasah
    ? currentJenjangConfig.mapelMadrasah
    : currentJenjangConfig.mapelUmum;

  const handleJenjangChange = (newJenjang: JenjangKategori) => {
    const cfg = KURIKULUM_CATALOG[newJenjang];
    const defaultKelas = cfg.kelasList[0].kelas;
    const defaultMapel = cfg.mapelUmum[0];
    const romawi = angkaKeRomawiKelas(defaultKelas);
    const newDaftar = [`${romawi} A`, `${romawi} B`, `${romawi} C`];
    setShowMadrasah(false);
    updateAndPersistProfile({
      jenjang: newJenjang,
      kelasUtama: defaultKelas,
      mataPelajaranUtama: defaultMapel,
      daftarRombel: newDaftar,
      rombelAktif: newDaftar[0],
    });
  };

  const handleKelasChange = (newKelas: string) => {
    const romawi = angkaKeRomawiKelas(newKelas);
    const updatedRombels = schoolProfile.daftarRombel.map((r) => {
      const parts = r.trim().split(/\s+/);
      const suffix = parts.length > 1 ? parts.slice(1).join(' ') : 'A';
      return `${romawi} ${suffix}`;
    });
    const uniqueRombels = Array.from(new Set(updatedRombels));
    const finalRombels =
      uniqueRombels.length > 0 ? uniqueRombels : [`${romawi} A`, `${romawi} B`];

    updateAndPersistProfile({
      kelasUtama: newKelas,
      daftarRombel: finalRombels,
      rombelAktif: finalRombels[0],
    });
  };

  const handleQuickAddParallelRange = (count: number) => {
    const romawi = angkaKeRomawiKelas(schoolProfile.kelasUtama);
    const letters = PARALLEL_LETTERS.slice(0, count);
    const newList = letters.map((l) => `${romawi} ${l}`);
    updateAndPersistProfile({
      daftarRombel: newList,
      rombelAktif: newList[0],
    });
    onToast(
      `${count} Rombel paralel (${newList[0]} s.d. ${newList[newList.length - 1]}) disiapkan.`
    );
  };

  const handleAddCustomRombel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customRombelInput.trim().toUpperCase();
    if (!clean) return;
    const nextList = schoolProfile.daftarRombel.includes(clean)
      ? schoolProfile.daftarRombel
      : [...schoolProfile.daftarRombel, clean];
    updateAndPersistProfile({
      daftarRombel: nextList,
      rombelAktif: clean,
    });
    setCustomRombelInput('');
    onToast(`Rombel ${clean} ditambahkan & diaktifkan.`);
  };

  const toggleMadrasah = () => {
    const nextState = !showMadrasah;
    setShowMadrasah(nextState);
    const list = nextState
      ? currentJenjangConfig.mapelMadrasah
      : currentJenjangConfig.mapelUmum;
    updateAndPersistProfile({ mataPelajaranUtama: list[0] });
  };

  const jenjangOptions: Array<{ id: JenjangKategori; shortLabel: string; detail: string }> = [
    { id: 'SD/MI', shortLabel: 'SD / MI', detail: 'Fase A–C' },
    { id: 'SMP/MTs', shortLabel: 'SMP / MTs', detail: 'Fase D' },
    { id: 'SMA/MA', shortLabel: 'SMA / MA', detail: 'Fase E–F' },
    { id: 'SMK', shortLabel: 'SMK', detail: 'Fase E–F' },
  ];

  const identitySummary = [
    schoolProfile.namaSekolah?.trim() || 'Nama sekolah belum diisi',
    schoolProfile.namaGuru?.trim() || 'Nama guru belum diisi',
    schoolProfile.pakaiFormatKopSekolah ? 'Kop dokumen aktif' : 'Tanpa kop sekolah',
  ].join(' · ');

  return (
    <motion.div
      variants={workspaceSectionVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Page Heading */}
      <div style={{ padding: '2px 2px 4px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#172033',
            lineHeight: 1.25,
          }}
        >
          Siapkan ruang kerja semester
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14,
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          Atur jenjang, kelas, mata pelajaran, dan rombel yang Anda ampu sebelum membuka perangkat ajar dan presensi.
        </p>
      </div>

      {/* Main 2-Column Layout: Structured Form + Live Summary & CTA */}
      <div className="ws-setup-layout">
        {/* Left: Single Structured Setup Surface */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Section 1: Jenjang Pendidikan */}
          <section style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={sectionHeadingStyle}>1. Jenjang pendidikan</h3>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Menentukan daftar tingkat kelas, fase CP, dan katalog mata pelajaran.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Jenjang pendidikan"
              className="ws-jenjang-grid"
            >
              {jenjangOptions.map((item) => {
                const isSelected = schoolProfile.jenjang === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleJenjangChange(item.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 3,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-family)',
                      transition:
                        'border-color 140ms ease, background-color 140ms ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: isSelected ? '#1d4ed8' : '#172033',
                      }}
                    >
                      <span>{item.shortLabel}</span>
                      {isSelected && (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          style={{ color: '#2563eb', flexShrink: 0 }}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: isSelected ? '#3b82f6' : '#64748b',
                        fontWeight: 500,
                      }}
                    >
                      {item.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Kelas, Semester & Mata Pelajaran */}
          <section style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={sectionHeadingStyle}>2. Kelas, semester & mata pelajaran</h3>
            </div>

            <div className="ws-two-col" style={{ marginBottom: 14 }}>
              <div>
                <label htmlFor="setup-kelas-select" style={fieldLabelStyle}>
                  Tingkat kelas
                </label>
                <select
                  id="setup-kelas-select"
                  className="form-select"
                  value={schoolProfile.kelasUtama}
                  onChange={(e) => handleKelasChange(e.target.value)}
                >
                  {currentJenjangConfig.kelasList.map((k) => (
                    <option key={k.kelas} value={k.kelas}>
                      Kelas {k.kelas} ({k.fase})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setup-semester-select" style={fieldLabelStyle}>
                  Semester
                </label>
                <select
                  id="setup-semester-select"
                  className="form-select"
                  value={schoolProfile.semester}
                  onChange={(e) =>
                    updateAndPersistProfile({
                      semester: e.target.value as SchoolProfile['semester'],
                    })
                  }
                >
                  <option value="1 (Ganjil)">1 (Ganjil)</option>
                  <option value="2 (Genap)">2 (Genap)</option>
                </select>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <label htmlFor="setup-mapel-select" style={{ ...fieldLabelStyle, marginBottom: 0 }}>
                  Mata pelajaran utama
                </label>
                <button
                  type="button"
                  onClick={toggleMadrasah}
                  aria-pressed={showMadrasah}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  {showMadrasah
                    ? 'Gunakan daftar mapel umum'
                    : 'Tampilkan mapel Kemenag (MI/MTs/MA)'}
                </button>
              </div>
              <select
                id="setup-mapel-select"
                className="form-select"
                value={schoolProfile.mataPelajaranUtama}
                onChange={(e) =>
                  updateAndPersistProfile({
                    mataPelajaranUtama: e.target.value,
                  })
                }
              >
                {activeMapelList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Section 3: Rombongan Belajar */}
          <section style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={sectionHeadingStyle}>3. Rombongan belajar</h3>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Pilih rombel aktif untuk mulai bekerja, atau sesuaikan jumlah rombel paralel di kelas Anda.
              </p>
            </div>

            {/* Primary: Active Rombel Selector */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 8,
                }}
              >
                Pilih rombel aktif ({schoolProfile.daftarRombel.length} tersedia)
              </div>

              <div
                role="radiogroup"
                aria-label="Rombel aktif"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
              >
                {schoolProfile.daftarRombel.map((rombel) => {
                  const isActive = schoolProfile.rombelAktif === rombel;
                  return (
                    <button
                      key={rombel}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateAndPersistProfile({ rombelAktif: rombel })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: isActive ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: isActive ? '#eff6ff' : '#ffffff',
                        color: isActive ? '#1d4ed8' : '#334155',
                        fontFamily: 'var(--font-family)',
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition:
                          'border-color 140ms ease, background-color 140ms ease',
                      }}
                    >
                      {isActive && (
                        <Check
                          size={13}
                          strokeWidth={2.5}
                          style={{ color: '#2563eb' }}
                          aria-hidden="true"
                        />
                      )}
                      <span>{rombel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary: Manage / Add Rombel Controls */}
            <div
              style={{
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 9,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                  Atur rombel paralel:
                </span>
                {[2, 3, 4, 6].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleQuickAddParallelRange(cnt)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontFamily: 'var(--font-family)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {cnt} rombel
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleAddCustomRombel}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <label htmlFor="custom-rombel-input" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                  Nama rombel baru
                </label>
                <input
                  id="custom-rombel-input"
                  type="text"
                  className="form-input"
                  placeholder="Tambah rombel (mis. VII Unggulan)"
                  value={customRombelInput}
                  onChange={(e) => setCustomRombelInput(e.target.value)}
                  style={{
                    width: 195,
                    padding: '5px 10px',
                    fontSize: 12.5,
                    minHeight: 32,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#172033',
                    fontFamily: 'var(--font-family)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 32,
                  }}
                >
                  <Plus size={13} aria-hidden="true" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>
          </section>

          {/* Section 4: Collapsible School Identity Disclosure */}
          <section style={{ padding: '14px 20px' }}>
            <button
              type="button"
              aria-expanded={showIdentitySettings}
              aria-controls="setup-identity-disclosure"
              onClick={() => setShowIdentitySettings((prev) => !prev)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#172033',
                  }}
                >
                  <Building2 size={15} style={{ color: '#64748b' }} aria-hidden="true" />
                  <span>Identitas sekolah & kop dokumen (opsional)</span>
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12.5,
                    color: '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {identitySummary}
                </div>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#2563eb',
                  flexShrink: 0,
                }}
              >
                <span>{showIdentitySettings ? 'Tutup' : 'Ubah'}</span>
                <ChevronDown
                  size={15}
                  style={{
                    transform: showIdentitySettings ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 180ms ease',
                  }}
                  aria-hidden="true"
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {showIdentitySettings && (
                <motion.div
                  id="setup-identity-disclosure"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={workspaceAccordionTransition}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      paddingTop: 14,
                      marginTop: 12,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div className="ws-two-col">
                      <div>
                        <label htmlFor="setup-nama-sekolah" style={fieldLabelStyle}>
                          Nama sekolah / madrasah
                        </label>
                        <input
                          id="setup-nama-sekolah"
                          type="text"
                          className="form-input"
                          placeholder="Contoh: SMP Negeri 1 Nusantara"
                          value={schoolProfile.namaSekolah}
                          onChange={(e) =>
                            updateAndPersistProfile({ namaSekolah: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor="setup-nama-guru" style={fieldLabelStyle}>
                          Nama guru pengampu
                        </label>
                        <input
                          id="setup-nama-guru"
                          type="text"
                          className="form-input"
                          placeholder="Contoh: Budi Santoso, S.Pd."
                          value={schoolProfile.namaGuru}
                          onChange={(e) =>
                            updateAndPersistProfile({ namaGuru: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={schoolProfile.pakaiFormatKopSekolah}
                          onChange={(e) =>
                            updateAndPersistProfile({
                              pakaiFormatKopSekolah: e.target.checked,
                            })
                          }
                        />
                        <span>Sertakan kop resmi sekolah pada hasil ekspor DOCX & cetak</span>
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={schoolProfile.tampilkanTandaTangan}
                          onChange={(e) =>
                            updateAndPersistProfile({
                              tampilkanTandaTangan: e.target.checked,
                            })
                          }
                        />
                        <span>Sertakan blok tanda tangan guru dan kepala sekolah</span>
                      </label>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={onOpenSchoolModal}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 7,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#172033',
                          fontFamily: 'var(--font-family)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Atur NIP, kepala sekolah, & alamat lengkap
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Right: Live Configuration Summary + Primary CTA + Quiet License Restore */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary + CTA Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: 'var(--shadow-sm)',
              padding: '18px',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#172033',
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              Ringkasan ruang kerja
            </div>

            <dl
              style={{
                margin: '0 0 16px',
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: '8px 12px',
                fontSize: 12.5,
              }}
            >
              <dt style={{ color: '#64748b', fontWeight: 500 }}>Jenjang</dt>
              <dd style={{ margin: 0, color: '#172033', fontWeight: 600, textAlign: 'right' }}>
                {schoolProfile.jenjang}
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 500 }}>Kelas</dt>
              <dd style={{ margin: 0, color: '#172033', fontWeight: 600, textAlign: 'right' }}>
                Kelas {schoolProfile.kelasUtama} · Sem {schoolProfile.semester}
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 500 }}>Mapel</dt>
              <dd
                style={{
                  margin: 0,
                  color: '#172033',
                  fontWeight: 600,
                  textAlign: 'right',
                  wordBreak: 'break-word',
                }}
              >
                {schoolProfile.mataPelajaranUtama}
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 500 }}>Rombel aktif</dt>
              <dd style={{ margin: 0, color: '#1d4ed8', fontWeight: 600, textAlign: 'right' }}>
                {schoolProfile.rombelAktif} ({schoolProfile.daftarRombel.length} total)
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 500 }}>Sekolah</dt>
              <dd
                style={{
                  margin: 0,
                  color: schoolProfile.namaSekolah ? '#172033' : '#94a3b8',
                  fontWeight: 500,
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {schoolProfile.namaSekolah || 'Belum diisi'}
              </dd>
            </dl>

            <div className="ws-setup-sticky-cta">
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                Membuka perangkat ajar & kelas harian untuk{' '}
                <strong style={{ color: '#172033', fontWeight: 600 }}>
                  {schoolProfile.mataPelajaranUtama} ({schoolProfile.rombelAktif})
                </strong>
                .
              </div>
              <button
                type="button"
                className="onboarding-confirm-btn btn-primary"
                onClick={onConfirmClassSetup}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>Buka ruang kerja</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Quiet License Recovery Area */}
          {onOpenLicenseModal && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#172033',
                  marginBottom: 4,
                }}
              >
                <Key size={14} style={{ color: '#64748b' }} aria-hidden="true" />
                <span>Sudah punya lisensi Pro?</span>
              </div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 12.5,
                  color: '#64748b',
                  lineHeight: 1.45,
                }}
              >
                Pulihkan aktivasi atau data semester yang tersimpan menggunakan kode lisensi Anda.
              </p>
              <button
                type="button"
                onClick={onOpenLicenseModal}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontFamily: 'var(--font-family)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Pulihkan dari kode lisensi
              </button>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
};
