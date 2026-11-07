import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Users,
  Building2,
  FileSignature,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Calendar,
  Sparkles,
  Key,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import { angkaKeRomawiKelas } from '../../utils/schoolProfileStorage';
import { KURIKULUM_CATALOG } from '../../utils/kurikulumCatalog';
import type { JenjangKategori } from '../../utils/kurikulumCatalog';
import {
  staggerContainerVariants,
  bentoCardVariants,
  cardTapMotion,
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

export const ClassSetupStepView: React.FC<ClassSetupStepViewProps> = ({
  schoolProfile,
  updateAndPersistProfile,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onConfirmClassSetup,
  onToast,
}) => {
  const [showIdentitySettings, setShowIdentitySettings] = useState(
    () => !schoolProfile.namaSekolah || !schoolProfile.namaGuru
  );
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
      `${count} Rombel paralel (${newList[0]} s.d. ${newList[newList.length - 1]}) disiapkan!`
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

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      {/* 1. Hero Bento Card */}
      <motion.div
        variants={bentoCardVariants}
        className="v21-bento-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #f0fdfa 100%)',
          border: '1px solid #bfdbfe',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: '#2563eb',
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: 9999,
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginBottom: 10,
              }}
            >
              <Sparkles size={13} color="#2563eb" /> Langkah 1 dari 3 • Mulai Ruang Kerja Semester
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', margin: '4px 0 6px' }}>
              Selamat Datang! Pilih Kelas & Mata Pelajaran Bapak/Ibu Guru
            </h1>
            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, maxWidth: 650 }}>
              Cukup pilih jenjang, kelas, dan mata pelajaran yang Bapak/Ibu ampu di bawah ini. AsesMerdeka akan langsung menyusun <strong>Peta Materi & TP, ATP, Prota, Promes, Modul Ajar, LKPD, Soal AI, hingga Buku Nilai & Rapor</strong> secara otomatis!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {[
                '1️⃣ Pilih Kelas & Mapel (Halaman Ini)',
                '2️⃣ Kelola Bab, Modul, LKPD & Soal AI',
                '3️⃣ Unduh 9 Dokumen Siap Supervisi 1-Klik',
              ].map((stepText, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: idx === 0 ? '#dbeafe' : '#ffffff',
                    color: idx === 0 ? '#1e40af' : '#475569',
                    border: idx === 0 ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  }}
                >
                  {stepText}
                </span>
              ))}
            </div>

            {onOpenLicenseModal && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
                  border: '1px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12.5, color: '#065f46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Key size={15} color="#059669" style={{ flexShrink: 0 }} />
                  <span>
                    Sudah mengisi di HP atau punya <strong>Kode Lisensi</strong>? Tidak perlu isi ulang dari awal!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenLicenseModal}
                  className="btn btn-sm btn-success"
                  style={{ fontSize: 12, padding: '6px 12px', fontWeight: 800 }}
                >
                  ☁️ Masukkan Lisensi & Pulihkan Riwayat →
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Kurikulum Acuan
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#2563eb', marginTop: 1 }}>
              Kurikulum Merdeka 2026
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Grid Bento Card: Jenjang & Tingkat Kelas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Jenjang Selector */}
        <motion.div variants={bentoCardVariants} className="v21-bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <GraduationCap size={18} color="#2563eb" />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
              1. Pilih Satuan Pendidikan
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {(['SD/MI', 'SMP/MTs', 'SMA/MA', 'SMK'] as JenjangKategori[]).map((kat) => {
              const active = schoolProfile.jenjang === kat;
              return (
                <motion.button
                  key={kat}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleJenjangChange(kat)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#334155',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: active ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{kat}</span>
                  {active && <span style={{ color: '#2563eb', fontWeight: 900 }}>✓</span>}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Tingkat Kelas & Semester */}
        <motion.div variants={bentoCardVariants} className="v21-bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color="#2563eb" />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
              2. Tingkat Kelas & Semester
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, color: '#64748b', fontWeight: 700, marginBottom: 4, display: 'block' }}>
                Tingkat Kelas:
              </label>
              <select
                className="form-select"
                value={schoolProfile.kelasUtama}
                onChange={(e) => handleKelasChange(e.target.value)}
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                {currentJenjangConfig.kelasList.map((k) => (
                  <option key={k.kelas} value={k.kelas}>
                    Kelas {k.kelas} ({angkaKeRomawiKelas(k.kelas)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11.5, color: '#64748b', fontWeight: 700, marginBottom: 4, display: 'block' }}>
                Semester Aktif:
              </label>
              <select
                className="form-select"
                value={schoolProfile.semester}
                onChange={(e) =>
                  updateAndPersistProfile({
                    semester: e.target.value as SchoolProfile['semester'],
                  })
                }
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                <option value="1 (Ganjil)">Semester 1 (Ganjil)</option>
                <option value="2 (Genap)">Semester 2 (Genap)</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Mata Pelajaran Bento Card */}
      <motion.div variants={bentoCardVariants} className="v21-bento-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#2563eb" />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
              3. Mata Pelajaran Utama
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextMadrasah = !showMadrasah;
              setShowMadrasah(nextMadrasah);
              updateAndPersistProfile({
                mataPelajaranUtama: nextMadrasah
                  ? currentJenjangConfig.mapelMadrasah[0]
                  : currentJenjangConfig.mapelUmum[0],
              });
            }}
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              color: '#0d9488',
              fontSize: 11.5,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {showMadrasah ? 'Ganti ke Mapel Umum' : '🕌 Aktifkan Mapel Kemenag (MI/MTs/MA)'}
          </button>
        </div>

        <select
          className="form-select"
          value={schoolProfile.mataPelajaranUtama}
          onChange={(e) => updateAndPersistProfile({ mataPelajaranUtama: e.target.value })}
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          {activeMapelList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </motion.div>

      {/* 4. Rombel Paralel Bento Card */}
      <motion.div variants={bentoCardVariants} className="v21-bento-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#2563eb" />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
              4. Rombongan Belajar (Rombel Paralel yang Diampu)
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[2, 3, 4, 6].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => handleQuickAddParallelRange(cnt)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Set {cnt} Rombel ({angkaKeRomawiKelas(schoolProfile.kelasUtama)} A–{PARALLEL_LETTERS[cnt - 1]})
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {schoolProfile.daftarRombel.map((rombel) => {
            const isSelected = schoolProfile.rombelAktif === rombel;
            return (
              <motion.button
                key={rombel}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => updateAndPersistProfile({ rombelAktif: rombel })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {rombel} {isSelected ? '✓' : ''}
              </motion.button>
            );
          })}

          <form onSubmit={handleAddCustomRombel} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: 12, padding: '5px 10px', width: 170, minWidth: 140 }}
              value={customRombelInput}
              onChange={(e) => setCustomRombelInput(e.target.value)}
              placeholder="+ Rombel (mis: X TKJ 1)"
            />
            <button type="submit" className="btn btn-sm btn-outline" style={{ padding: '5px 10px', fontSize: 12 }}>
              Tambah
            </button>
          </form>
        </div>
      </motion.div>

      {/* 5. Identitas Sekolah & Kop Surat (Accordion Bento Card) */}
      <motion.div variants={bentoCardVariants} className="v21-bento-card" style={{ padding: '16px 20px' }}>
        <div
          onClick={() => setShowIdentitySettings(!showIdentitySettings)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                5. Identitas Sekolah & Format Kop Surat Dokumen
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {schoolProfile.namaSekolah || 'Nama Sekolah belum diisi'} • Guru: {schoolProfile.namaGuru || 'Nama Guru belum diisi'}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#2563eb',
              background: '#eff6ff',
              padding: '4px 12px',
              borderRadius: 9999,
              border: '1px solid #bfdbfe',
            }}
          >
            {showIdentitySettings ? 'Tutup ▴' : 'Ubah Data Kop / TTD ▾'}
          </span>
        </div>

        {showIdentitySettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                type="button"
                onClick={onOpenSchoolModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Atur NIP & Kepala Sekolah Lengkap →
              </button>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: 700 }}>
                  Nama Sekolah / Instansi:
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={schoolProfile.namaSekolah}
                  onChange={(e) => updateAndPersistProfile({ namaSekolah: e.target.value })}
                  placeholder="Contoh: SMP Negeri 1 Merdeka"
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: 700 }}>
                  Nama Bapak/Ibu Guru Pengampu:
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={schoolProfile.namaGuru}
                  onChange={(e) => updateAndPersistProfile({ namaGuru: e.target.value })}
                  placeholder="Contoh: Fajar Hidayat, S.Pd."
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#334155', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={schoolProfile.pakaiFormatKopSekolah}
                  onChange={(e) => updateAndPersistProfile({ pakaiFormatKopSekolah: e.target.checked })}
                />
                <Building2 size={14} color="#2563eb" /> Sertakan Kop Resmi pada Dokumen Word
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#334155', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={schoolProfile.tampilkanTandaTangan}
                  onChange={(e) => updateAndPersistProfile({ tampilkanTandaTangan: e.target.checked })}
                />
                <FileSignature size={14} color="#059669" /> Sertakan Tanda Tangan Guru & Kepala Sekolah
              </label>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* 6. Primary Action CTA Button */}
      <motion.div variants={bentoCardVariants} style={{ textAlign: 'center', marginTop: 4 }}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={cardTapMotion}
          onClick={onConfirmClassSetup}
          className="btn btn-primary onboarding-confirm-btn"
          style={{
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 900,
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            letterSpacing: '-0.2px',
            width: '100%',
            maxWidth: 560,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>Mulai Kelola Materi {schoolProfile.mataPelajaranUtama} (Kelas {schoolProfile.rombelAktif})</span>
          <ArrowRight size={17} style={{ flexShrink: 0 }} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
