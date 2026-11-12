import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Check,
  School,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import {
  saveSchoolProfile,
  jenjangToDefaultFase,
} from '../../utils/schoolProfileStorage';
import {
  KURIKULUM_CATALOG,
} from '../../utils/kurikulumCatalog';
import type { JenjangKategori } from '../../utils/kurikulumCatalog';

interface ClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolProfile: SchoolProfile;
  onUpdateProfile: (updated: SchoolProfile) => void;
  onToast: (msg: string) => void;
}

export const ClassSelectorModal: React.FC<ClassSelectorModalProps> = ({
  isOpen,
  onClose,
  schoolProfile,
  onUpdateProfile,
  onToast,
}) => {
  const [localProfile, setLocalProfile] = useState<SchoolProfile>({ ...schoolProfile });
  const [showKopSettings, setShowKopSettings] = useState(false);
  const [customRombelInput, setCustomRombelInput] = useState('');
  const [showMadrasah, setShowMadrasah] = useState(
    localProfile.mataPelajaranUtama.includes('(MI)') ||
    localProfile.mataPelajaranUtama.includes('(MTs)') ||
    localProfile.mataPelajaranUtama.includes('(MA)') ||
    localProfile.mataPelajaranUtama.toLowerCase().includes('fikih') ||
    localProfile.mataPelajaranUtama.toLowerCase().includes('akidah') ||
    localProfile.mataPelajaranUtama.toLowerCase().includes('qur')
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentJenjangConfig =
    KURIKULUM_CATALOG[localProfile.jenjang] || KURIKULUM_CATALOG['SMP/MTs'];

  const handleSelectJenjang = (jenjang: JenjangKategori) => {
    const config = KURIKULUM_CATALOG[jenjang];
    const defaultKelas = config.kelasList[0]?.kelas || '7';
    const defaultMapel = config.mapelUmum[0] || 'Pendidikan Pancasila';
    const defaultRombel = `${defaultKelas}-A`;

    setLocalProfile((prev) => ({
      ...prev,
      jenjang,
      kelasUtama: defaultKelas,
      mataPelajaranUtama: defaultMapel,
      daftarRombel: [defaultRombel, `${defaultKelas}-B`],
      rombelAktif: defaultRombel,
    }));
  };

  const handleSelectKelas = (k: string) => {
    const defaultRombel = `${k}-A`;
    const newRombelList = [defaultRombel, `${k}-B`];
    setLocalProfile((prev) => ({
      ...prev,
      kelasUtama: k,
      daftarRombel: newRombelList,
      rombelAktif: defaultRombel,
    }));
  };

  const handleAddCustomRombel = () => {
    const trimmed = customRombelInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!localProfile.daftarRombel.includes(trimmed)) {
      const updatedList = [...localProfile.daftarRombel, trimmed];
      setLocalProfile((prev) => ({
        ...prev,
        daftarRombel: updatedList,
        rombelAktif: trimmed,
      }));
    } else {
      setLocalProfile((prev) => ({ ...prev, rombelAktif: trimmed }));
    }
    setCustomRombelInput('');
  };

  const handleSave = () => {
    saveSchoolProfile(localProfile);
    onUpdateProfile(localProfile);
    onToast(`Berhasil beralih ke Kelas ${localProfile.rombelAktif} • ${localProfile.mataPelajaranUtama}!`);
    onClose();
  };

  const mapelList = showMadrasah
    ? currentJenjangConfig.mapelMadrasah
    : currentJenjangConfig.mapelUmum;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Kelas dan Mata Pelajaran"
      className="animate-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <School size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 700, color: '#172033', margin: 0 }}>
                Ganti kelas, rombel & mapel
              </h2>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
                Pilih kelas dan mata pelajaran yang ingin Anda kelola saat ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup modal ganti kelas"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body Modal */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Pilih Jenjang Sekolah */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
              1. Jenjang Pendidikan
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {(['SD/MI', 'SMP/MTs', 'SMA/MA', 'SMK'] as const).map((j) => {
                const active = localProfile.jenjang === j;
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => handleSelectJenjang(j as JenjangKategori)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: active ? '2.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: active ? '#eff6ff' : '#ffffff',
                      color: active ? '#1d4ed8' : '#334155',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: active ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {j}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pilih Tingkat Kelas & Rombel Paralel */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                2. Tingkat Kelas & Rombel Aktif
              </label>
              <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 700 }}>
                Fase {jenjangToDefaultFase(localProfile.jenjang, localProfile.kelasUtama)}
              </span>
            </div>

            {/* Tombol Kelas */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {currentJenjangConfig.kelasList.map((kObj) => {
                const active = localProfile.kelasUtama === kObj.kelas;
                return (
                  <button
                    key={kObj.kelas}
                    type="button"
                    onClick={() => handleSelectKelas(kObj.kelas)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: active ? '#2563eb' : '#ffffff',
                      color: active ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Kelas {kObj.kelas}
                  </button>
                );
              })}
            </div>

            {/* Rombel Aktif Selector */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                Pilih Rombel / Kelas Paralel:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {localProfile.daftarRombel.map((r) => {
                  const active = localProfile.rombelAktif === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLocalProfile((prev) => ({ ...prev, rombelAktif: r }))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: active ? '#2563eb' : '#ffffff',
                        color: active ? '#ffffff' : '#334155',
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  );
                })}

                <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
                  <input
                    type="text"
                    placeholder="+ Rombel Baru"
                    value={customRombelInput}
                    onChange={(e) => setCustomRombelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomRombel();
                      }
                    }}
                    style={{
                      width: 110,
                      padding: '5px 10px',
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRombel}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: 'none',
                      background: '#e2e8f0',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Mata Pelajaran & Semester */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  3. Mata Pelajaran
                </label>
                {currentJenjangConfig.mapelMadrasah.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMadrasah(!showMadrasah)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11.5,
                      color: '#2563eb',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {showMadrasah ? 'Mapel Umum' : 'Mapel Kemenag'}
                  </button>
                )}
              </div>
              <select
                className="form-input"
                style={{ fontSize: 13, padding: '10px 12px' }}
                value={localProfile.mataPelajaranUtama}
                onChange={(e) =>
                  setLocalProfile((prev) => ({
                    ...prev,
                    mataPelajaranUtama: e.target.value,
                  }))
                }
              >
                {mapelList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                4. Semester
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['1 (Ganjil)', '2 (Genap)'] as const).map((s) => {
                  const active = localProfile.semester === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLocalProfile((prev) => ({ ...prev, semester: s }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 10,
                        border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: active ? '#eff6ff' : '#ffffff',
                        color: active ? '#1d4ed8' : '#334155',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {s.includes('Ganjil') ? 'Ganjil' : 'Genap'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Accordion Identitas & Kop Surat */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowKopSettings(!showKopSettings)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#f8fafc',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} color="#2563eb" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Identitas Sekolah & Kop Surat Resmi (Opsional)
                </span>
              </div>
              {showKopSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showKopSettings && (
              <div style={{ padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Nama Sekolah
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 12.5 }}
                      value={localProfile.namaSekolah}
                      onChange={(e) => setLocalProfile((prev) => ({ ...prev, namaSekolah: e.target.value }))}
                      placeholder="SMP Negeri 1..."
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Nama Lengkap Guru Pengampu
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 12.5 }}
                      value={localProfile.namaGuru}
                      onChange={(e) => setLocalProfile((prev) => ({ ...prev, namaGuru: e.target.value }))}
                      placeholder="Nama & Gelar Guru"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 12.5 }}
                      value={localProfile.namaKepalaSekolah}
                      onChange={(e) => setLocalProfile((prev) => ({ ...prev, namaKepalaSekolah: e.target.value }))}
                      placeholder="Nama & Gelar KS"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      NIP Guru Pengampu
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 12.5 }}
                      value={localProfile.nipGuru}
                      onChange={(e) => setLocalProfile((prev) => ({ ...prev, nipGuru: e.target.value }))}
                      placeholder="19800101..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: 13, padding: '9px 18px' }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: '9px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}
          >
            <Check size={16} /> Terapkan & Buka Perangkat
          </button>
        </div>
      </motion.div>
    </div>
  );
};
