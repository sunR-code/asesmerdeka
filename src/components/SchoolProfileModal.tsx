import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, User, Check, X, Building2, FileSignature, Download, Upload } from 'lucide-react';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import {
  saveSchoolProfile,
  angkaKeRomawiKelas,
  exportBackupDataJson,
  importBackupDataJson,
  getSchoolProfile,
} from '../utils/schoolProfileStorage';
import { KURIKULUM_CATALOG } from '../utils/kurikulumCatalog';

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  onUpdateProfile: (newProfile: SchoolProfile) => void;
}

export const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [form, setForm] = useState<SchoolProfile>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSchoolProfile(form);
    onUpdateProfile(updated);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 900);
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = exportBackupDataJson();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanSchool = (form.namaSekolah || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
      a.href = url;
      a.download = `Backup_AsesMerdeka_${cleanSchool}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage({
        text: 'Berkas cadangan (.json) berhasil diunduh! Simpan berkas ini untuk memindahkan data ke laptop lain.',
        isError: false,
      });
    } catch {
      setBackupMessage({
        text: 'Gagal membuat berkas cadangan.',
        isError: true,
      });
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBackupMessage({
        text: 'Ukuran berkas cadangan terlalu besar (maksimal 5 MB).',
        isError: true,
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = String(ev.target?.result || '');
      const res = importBackupDataJson(raw);
      setBackupMessage({
        text: res.message,
        isError: !res.success,
      });
      if (res.success) {
        const refreshed = getSchoolProfile();
        setForm(refreshed);
        onUpdateProfile(refreshed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Profil & Kop Sekolah"
      className="animate-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="v21-bento-card"
        style={{
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          border: '1px solid rgba(147, 197, 253, 0.6)',
          position: 'relative',
          background: '#ffffff',
          borderRadius: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <School size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Data Sekolah & Kelas Bapak/Ibu</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Isi sekali saja — otomatis terpasang di Kop Soal, Kisi-Kisi, Lembar Rangkuman, & Tanda Tangan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ marginTop: 20 }}>
          {/* Bagian 1: Identitas Sekolah */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1d4ed8', fontSize: 13, fontWeight: 700 }}>
              <Building2 size={15} /> IDENTITAS SEKOLAH / MADRASAH
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Instansi Dinas / Yayasan (Baris Atas Kop Surat)</label>
              <input
                type="text"
                className="form-input"
                value={form.instansiDinas || ''}
                onChange={(e) => setForm({ ...form, instansiDinas: e.target.value })}
                placeholder="Contoh: PEMERINTAH KABUPATEN SLEMAN DINAS PENDIDIKAN"
              />
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">Jenjang Default</label>
                <select
                  className="form-select"
                  value={form.jenjang}
                  onChange={(e) => {
                    const nextJenjang = e.target.value as SchoolProfile['jenjang'];
                    const cfg = KURIKULUM_CATALOG[nextJenjang];
                    const defKelas = cfg.kelasList[0].kelas;
                    const rom = angkaKeRomawiKelas(defKelas);
                    setForm({
                      ...form,
                      jenjang: nextJenjang,
                      kelasUtama: defKelas,
                      mataPelajaranUtama: cfg.mapelUmum[0],
                      daftarRombel: [`${rom} A`, `${rom} B`, `${rom} C`],
                      rombelAktif: `${rom} A`,
                    });
                  }}
                >
                  <option value="SD/MI">SD / MI</option>
                  <option value="SMP/MTs">SMP / MTs</option>
                  <option value="SMA/MA">SMA / MA</option>
                  <option value="SMK">SMK / MAK</option>
                </select>
              </div>
              <div>
                <label className="form-label">Nama Sekolah / Madrasah</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.namaSekolah}
                  onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
                  placeholder="Contoh: SMP Negeri 1 Merdeka"
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">Tingkat Kelas & Rombel Aktif</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.rombelAktif || ''}
                  onChange={(e) => setForm({ ...form, rombelAktif: e.target.value })}
                  placeholder="Contoh: VIII A / X MIPA 1"
                />
              </div>
              <div>
                <label className="form-label">Mata Pelajaran Utama</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.mataPelajaranUtama || ''}
                  onChange={(e) => setForm({ ...form, mataPelajaranUtama: e.target.value })}
                  placeholder="Contoh: Matematika"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Alamat Lengkap Sekolah (Untuk Kop Surat)</label>
              <input
                type="text"
                className="form-input"
                value={form.alamatSekolah}
                onChange={(e) => setForm({ ...form, alamatSekolah: e.target.value })}
                placeholder="Contoh: Jl. Pendidikan No. 45, Kec. Sukamaju, Kota Bandung"
              />
            </div>

            <div className="grid-3">
              <div>
                <label className="form-label">Kota / Kabupaten</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.kotaSekolah}
                  onChange={(e) => setForm({ ...form, kotaSekolah: e.target.value })}
                  placeholder="Contoh: Bandung"
                />
              </div>
              <div>
                <label className="form-label">Semester Aktif</label>
                <select
                  className="form-select"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value as SchoolProfile['semester'] })}
                >
                  <option value="1 (Ganjil)">Semester 1 (Ganjil)</option>
                  <option value="2 (Genap)">Semester 2 (Genap)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.tahunAjaran}
                  onChange={(e) => setForm({ ...form, tahunAjaran: e.target.value })}
                  placeholder="2026/2027"
                />
              </div>
            </div>
          </div>

          {/* Bagian 2: Guru & Kepala Sekolah */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#047857', fontSize: 13, fontWeight: 700 }}>
              <User size={15} /> DATA GURU & KEPALA SEKOLAH (PENGESAHAN DOKUMEN)
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">Nama Lengkap Bapak/Ibu Guru</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.namaGuru}
                  onChange={(e) => setForm({ ...form, namaGuru: e.target.value })}
                  placeholder="Contoh: Rina Wulandari, S.Pd."
                  required
                />
              </div>
              <div>
                <label className="form-label">NIP / NUPTK Guru (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nipGuru}
                  onChange={(e) => setForm({ ...form, nipGuru: e.target.value })}
                  placeholder="Kosongkan jika belum ada"
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="form-label">Nama Kepala Sekolah / Madrasah</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.namaKepalaSekolah}
                  onChange={(e) => setForm({ ...form, namaKepalaSekolah: e.target.value })}
                  placeholder="Contoh: Drs. H. Budi Santoso, M.Pd."
                />
              </div>
              <div>
                <label className="form-label">NIP Kepala Sekolah (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nipKepalaSekolah}
                  onChange={(e) => setForm({ ...form, nipKepalaSekolah: e.target.value })}
                  placeholder="Kosongkan jika belum ada"
                />
              </div>
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-primary)',
              marginTop: 8
            }}>
              <input
                type="checkbox"
                checked={form.pakaiFormatKopSekolah}
                onChange={(e) => setForm({ ...form, pakaiFormatKopSekolah: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <Building2 size={16} color="#2563eb" />
              <span>Gunakan Kop Resmi Sekolah (Instansi Dinas, Nama Sekolah & Alamat) pada dokumen cetak & Word</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-primary)',
              marginTop: 8
            }}>
              <input
                type="checkbox"
                checked={form.tampilkanTandaTangan}
                onChange={(e) => setForm({ ...form, tampilkanTandaTangan: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#10b981' }}
              />
              <FileSignature size={16} color="#10b981" />
              <span>Tampilkan kolom pengesahan & tanda tangan (Kepala Sekolah & Guru) di bagian bawah dokumen</span>
            </label>
          </div>

          {/* Bagian 3: Backup & Restore Data Semester (.json) */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e3a8a' }}>
              Cadangkan & Pulihkan Data Semester (Pindah Perangkat / Laptop)
            </div>
            <div style={{ fontSize: 11.5, color: '#334155' }}>
              Unduh seluruh data profil sekolah, daftar siswa, presensi, jurnal, nilai, dan bank soal ke berkas <code>.json</code> agar aman saat berganti komputer.
            </div>
            {backupMessage && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: backupMessage.isError ? '#b91c1c' : '#065f46',
                  background: backupMessage.isError ? '#fef2f2' : '#ecfdf5',
                  padding: '6px 10px',
                  borderRadius: 6,
                }}
              >
                {backupMessage.text}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportBackup}
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12, background: '#ffffff' }}
              >
                <Download size={14} /> Unduh Backup Data (.json)
              </button>
              <label
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12, background: '#ffffff', cursor: 'pointer', margin: 0 }}
              >
                <Upload size={14} /> Pulihkan Data (.json)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 180 }}>
              {savedNotice ? (
                <>
                  <Check size={16} /> Tersimpan!
                </>
              ) : (
                <>
                  <Check size={16} /> Simpan Data Kelas
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

