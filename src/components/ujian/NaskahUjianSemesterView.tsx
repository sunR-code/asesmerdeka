import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Award, 
  Layers, 
  ListOrdered,
  Calendar,
  School,
  UserCheck,
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { getSchoolProfile, getSavedCustomTPList } from '../../utils/schoolProfileStorage';
import type { NaskahUjianDokumen, TipeUjianSemester } from '../../types/examSemester';
import { 
  generateSmartNaskahUjian, 
  getTPCoverageForExam, 
  EXAM_PRESETS 
} from '../../utils/examSemesterEngine';
import type { ExamGenerationOptions } from '../../utils/examSemesterEngine';
import { exportNaskahUjianToDocx } from '../../utils/docxExporter';

interface Props {
  profile?: SchoolProfile;
  tpList?: CustomTPItem[];
}

export const NaskahUjianSemesterView: React.FC<Props> = ({ profile: propProfile, tpList: propTPList }) => {
  const [profile, setProfile] = useState<SchoolProfile>(propProfile || getSchoolProfile());
  const [tpList, setTpList] = useState<CustomTPItem[]>(propTPList || []);

  const [tipeUjian, setTipeUjian] = useState<TipeUjianSemester>('SAS');
  const [selectedPreset, setSelectedPreset] = useState<string>('standar');
  const [jumlahPG, setJumlahPG] = useState<number>(20);
  const [jumlahPGK, setJumlahPGK] = useState<number>(0);
  const [jumlahUraian, setJumlahUraian] = useState<number>(5);
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>('90 Menit');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'soal' | 'ljk' | 'kunci' | 'matriks'>('soal');
  const [naskah, setNaskah] = useState<NaskahUjianDokumen | null>(null);

  // Sinkronisasi profil & TP
  useEffect(() => {
    const prof = propProfile || getSchoolProfile();
    setProfile(prof);
    const list = propTPList && propTPList.length > 0 
      ? propTPList 
      : (getSavedCustomTPList(prof.mataPelajaranUtama, prof.kelasUtama, prof.semester) || []);
    setTpList(list);
  }, [propProfile, propTPList]);

  // Terapkan preset komposisi butir soal
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = EXAM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setJumlahPG(preset.pg);
      setJumlahPGK(preset.pgk);
      setJumlahUraian(preset.uraian);
      setAlokasiWaktu(preset.waktu);
    }
  };

  // Generate naskah ujian
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const options: ExamGenerationOptions = {
        tipe: tipeUjian,
        jumlahPG,
        jumlahPGK,
        jumlahUraian,
        alokasiWaktu,
      };
      const result = generateSmartNaskahUjian(profile, tpList, options);
      setNaskah(result);
      setIsGenerating(false);
    }, 350);
  };

  // Auto generate saat pertama kali mount
  useEffect(() => {
    if (!naskah && tpList.length > 0) {
      handleGenerate();
    }
  }, [tpList]);

  // Ekspor Word Docx
  const handleExportDocx = async () => {
    if (!naskah) return;
    try {
      setIsExporting(true);
      await exportNaskahUjianToDocx(naskah, profile);
    } catch (err) {
      console.error('Gagal ekspor docx:', err);
      alert('Terjadi kesalahan saat mengekspor dokumen Word.');
    } finally {
      setIsExporting(false);
    }
  };

  // Cetak dokumen
  const handlePrint = () => {
    window.print();
  };

  const coveredTPs = getTPCoverageForExam(tpList, tipeUjian);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0284c7 100%)',
        borderRadius: '18px',
        padding: '24px 28px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          position: 'relative',
          zIndex: 2,
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.18)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              <Award style={{ width: '15px', height: '15px', color: '#fde047' }} />
              Naskah Resmi Semester Kurikulum Merdeka
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Naskah Ujian Semester (STS & SAS)
            </h1>
            <p style={{ fontSize: '13.5px', color: '#e0e7ff', margin: '6px 0 0 0', maxWidth: '720px', lineHeight: 1.5 }}>
              Penyusunan naskah soal otomatis terpadu dari seluruh TP semester berjalan, lengkap dengan Kop Sekolah resmi, lembar identitas peserta, Lembar Jawaban (LJK), serta Kunci & Rubrik Penskoran.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleExportDocx}
              disabled={!naskah || isExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: !naskah || isExporting ? 'not-allowed' : 'pointer',
                opacity: !naskah || isExporting ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download style={{ width: '16px', height: '16px' }} />
              {isExporting ? 'Memproses Word...' : 'Unduh Word (.docx)'}
            </button>
            <button
              onClick={handlePrint}
              disabled={!naskah}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: !naskah ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer style={{ width: '16px', height: '16px' }} />
              Cetak / Print
            </button>
          </div>
        </div>

        {/* Info Strip */}
        <div style={{
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          fontSize: '12.5px',
          color: '#e0e7ff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <School style={{ width: '16px', height: '16px', color: '#fde047' }} />
            <span><strong>{profile.namaSekolah}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers style={{ width: '16px', height: '16px', color: '#6ee7b7' }} />
            <span>Kelas <strong>{profile.kelasUtama} ({profile.rombelAktif})</strong> • {profile.mataPelajaranUtama}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar style={{ width: '16px', height: '16px', color: '#7dd3fc' }} />
            <span>Semester <strong>{profile.semester}</strong> • TA {profile.tahunAjaran}</span>
          </div>
        </div>
      </div>

      {/* 2. Control Panel / Pengaturan Ujian */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '22px 26px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
            <h2 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Konfigurasi Format Naskah Ujian
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Cakupan TP terdistribusi otomatis secara proporsional
          </span>
        </div>

        {/* Pilih Jenis Ujian: STS vs SAS */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Pilih Jenis Evaluasi:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setTipeUjian('STS')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: tipeUjian === 'STS' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: tipeUjian === 'STS' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                padding: '8px',
                borderRadius: '8px',
                background: tipeUjian === 'STS' ? '#2563eb' : '#f1f5f9',
                color: tipeUjian === 'STS' ? '#ffffff' : '#64748b',
              }}>
                <Calendar style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  STS (Sumatif Tengah Semester)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                  Mengevaluasi 50% TP pertama pada semester berjalan ({coveredTPs.length} TP tercakup).
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipeUjian('SAS')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: tipeUjian === 'SAS' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: tipeUjian === 'SAS' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                padding: '8px',
                borderRadius: '8px',
                background: tipeUjian === 'SAS' ? '#2563eb' : '#f1f5f9',
                color: tipeUjian === 'SAS' ? '#ffffff' : '#64748b',
              }}>
                <Award style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  SAS (Sumatif Akhir Semester)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                  Evaluasi komprehensif 100% seluruh TP pada semester berjalan ({tpList.length} TP tercakup).
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Pilihan Format Cepat */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Format Komposisi Soal Sekolah:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {EXAM_PRESETS.map((p) => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: active ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{p.label}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.35 }}>{p.deskripsi}</div>
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#1e40af', background: '#dbeafe', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>
                    ⏱️ {p.waktu}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rincian Butir Soal & Waktu */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', paddingTop: '4px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Pilihan Ganda (PG)</label>
            <input
              type="number"
              min={5}
              max={50}
              value={jumlahPG}
              onChange={(e) => {
                setJumlahPG(Number(e.target.value) || 0);
                setSelectedPreset('custom');
              }}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>PG Kompleks (B/S)</label>
            <input
              type="number"
              min={0}
              max={20}
              value={jumlahPGK}
              onChange={(e) => {
                setJumlahPGK(Number(e.target.value) || 0);
                setSelectedPreset('custom');
              }}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Soal Uraian</label>
            <input
              type="number"
              min={1}
              max={15}
              value={jumlahUraian}
              onChange={(e) => {
                setJumlahUraian(Number(e.target.value) || 0);
                setSelectedPreset('custom');
              }}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Alokasi Waktu</label>
            <input
              type="text"
              value={alokasiWaktu}
              onChange={(e) => setAlokasiWaktu(e.target.value)}
              placeholder="e.g. 90 Menit"
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Ringkasan TP Tercakup */}
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
          <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 style={{ width: '15px', height: '15px', color: '#059669' }} />
            Tujuan Pembelajaran yang Terdistribusi ({coveredTPs.length} TP):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {coveredTPs.map((tp, idx) => (
              <span key={tp.id || idx} style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#1e293b' }}>
                <strong style={{ color: '#2563eb', marginRight: '4px' }}>{tp.kode || `TP-${idx + 1}`}:</strong>
                {tp.materiPokok}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: isGenerating ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px', animation: isGenerating ? 'spin 1s linear infinite' : 'none' }} />
            {isGenerating ? 'Menyusun Naskah Soal...' : '⚡ Buat & Perbarui Naskah Ujian'}
          </button>
        </div>
      </div>

      {/* 3. Dokumen Naskah & Tab Pratinjau */}
      {naskah && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}>
          {/* Sub Navigation Bar Tabs */}
          <div style={{
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('soal')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'soal' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'soal' ? '#ffffff' : 'transparent',
                  color: activeTab === 'soal' ? '#1d4ed8' : '#64748b',
                  boxShadow: activeTab === 'soal' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <FileText style={{ width: '15px', height: '15px' }} />
                1. Naskah Soal Siswa ({naskah.totalSoal} Butir)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ljk')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'ljk' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'ljk' ? '#ffffff' : 'transparent',
                  color: activeTab === 'ljk' ? '#1d4ed8' : '#64748b',
                  boxShadow: activeTab === 'ljk' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <UserCheck style={{ width: '15px', height: '15px' }} />
                2. Lembar Jawaban Siswa (LJK)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('kunci')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'kunci' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'kunci' ? '#ffffff' : 'transparent',
                  color: activeTab === 'kunci' ? '#1d4ed8' : '#64748b',
                  boxShadow: activeTab === 'kunci' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Award style={{ width: '15px', height: '15px' }} />
                3. Kunci Jawaban & Rubrik Guru
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matriks')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'matriks' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'matriks' ? '#ffffff' : 'transparent',
                  color: activeTab === 'matriks' ? '#1d4ed8' : '#64748b',
                  boxShadow: activeTab === 'matriks' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <ListOrdered style={{ width: '15px', height: '15px' }} />
                4. Matriks Distribusi TP
              </button>
            </div>

            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
              Skor Maksimal: <strong style={{ color: '#0f172a' }}>{naskah.skorMaksimalTotal} Poin</strong>
            </div>
          </div>

          {/* TAB 1: PRATINJAU NASKAH SOAL SISWA (FORMAT CETAK A4 ASLI) */}
          {activeTab === 'soal' && (
            <div style={{
              background: '#e2e8f0',
              padding: '36px 16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              minHeight: '100%',
              overflowX: 'auto',
            }}>
              {/* LEMBAR KERTAS A4 PUTIH FORMAL */}
              <div style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '820px',
                minHeight: '1120px',
                padding: '44px 52px',
                borderRadius: '4px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                boxSizing: 'border-box',
              }}>
                {/* 1. KOP SURAT RESMI */}
                <div style={{ textAlign: 'center' }}>
                  {profile.instansiDinas && (
                    <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', color: '#334155', textTransform: 'uppercase' }}>
                      {profile.instansiDinas}
                    </div>
                  )}
                  <div style={{ fontSize: '21px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>
                    {naskah.namaSekolah}
                  </div>
                  {profile.alamatSekolah && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {profile.alamatSekolah} {profile.kotaSekolah ? `• ${profile.kotaSekolah}` : ''}
                    </div>
                  )}
                  
                  {/* Garis Ganda Pembatas Kop */}
                  <div style={{ borderBottom: '3.5px double #0f172a', margin: '14px 0 16px 0' }} />

                  {/* Judul Ujian */}
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.04em' }}>
                    {naskah.namaUjian}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginTop: '3px', letterSpacing: '0.02em' }}>
                    TAHUN AJARAN {naskah.tahunAjaran} • KURIKULUM MERDEKA
                  </div>
                </div>

                {/* 2. TABEL KOTAK IDENTITAS SISWA & UJIAN */}
                <div style={{
                  marginTop: '18px',
                  border: '1.5px solid #0f172a',
                  borderRadius: '4px',
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 1fr 130px',
                  fontSize: '12px',
                  background: '#ffffff',
                }}>
                  {/* Kolom Kiri: Mapel & Jadwal */}
                  <div style={{ padding: '10px 14px', borderRight: '1px solid #0f172a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div><strong style={{ display: 'inline-block', width: '105px', color: '#475569' }}>Mata Pelajaran:</strong> <span style={{ fontWeight: 800, color: '#0f172a' }}>{naskah.mataPelajaran}</span></div>
                    <div><strong style={{ display: 'inline-block', width: '105px', color: '#475569' }}>Kelas / Jenjang:</strong> <span>{naskah.kelas} ({naskah.jenjang})</span></div>
                    <div><strong style={{ display: 'inline-block', width: '105px', color: '#475569' }}>Alokasi Waktu:</strong> <span>{naskah.alokasiWaktu}</span></div>
                    <div><strong style={{ display: 'inline-block', width: '105px', color: '#475569' }}>Semester:</strong> <span>{naskah.semester}</span></div>
                  </div>

                  {/* Kolom Tengah: Identitas Siswa */}
                  <div style={{ padding: '10px 14px', borderRight: '1px solid #0f172a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div><strong style={{ display: 'inline-block', width: '90px', color: '#475569' }}>Nama Siswa:</strong> <span style={{ color: '#94a3b8' }}>..........................................</span></div>
                    <div><strong style={{ display: 'inline-block', width: '90px', color: '#475569' }}>No. Peserta:</strong> <span style={{ color: '#94a3b8' }}>..........................................</span></div>
                    <div><strong style={{ display: 'inline-block', width: '90px', color: '#475569' }}>Ruang / Sesi:</strong> <span style={{ color: '#94a3b8' }}>..........................................</span></div>
                    <div><strong style={{ display: 'inline-block', width: '90px', color: '#475569' }}>Hari / Tgl:</strong> <span style={{ color: '#94a3b8' }}>..........................................</span></div>
                  </div>

                  {/* Kolom Kanan: Kotak Nilai */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, padding: '8px', borderBottom: '1px solid #0f172a', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>NILAI / SKOR</div>
                      <div style={{ height: '32px' }}></div>
                    </div>
                    <div style={{ flex: 1, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>Paraf Guru</div>
                      <div style={{ height: '22px' }}></div>
                    </div>
                  </div>
                </div>

                {/* 3. PETUNJUK UMUM */}
                <div style={{
                  marginTop: '16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px 18px',
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: 1.55,
                }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                    PETUNJUK UMUM PENGERJAAN:
                  </div>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {naskah.petunjukUmum.map((p, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{p}</li>
                    ))}
                  </ol>
                </div>

                {/* 4. BAGIAN I: SOAL PILIHAN GANDA */}
                {naskah.soalPG.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    {/* Header Bagian I */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderBottom: '2px solid #0f172a',
                      paddingBottom: '6px',
                      marginBottom: '16px',
                    }}>
                      <span style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        width: '26px',
                        height: '26px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13.5px',
                        fontWeight: 900,
                      }}>I</span>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                          SOAL PILIHAN GANDA
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginLeft: '8px' }}>
                          (Pilihlah salah satu jawaban yang paling tepat!)
                        </span>
                      </div>
                    </div>

                    {/* Daftar Soal PG */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {naskah.soalPG.map((soal) => (
                        <div key={soal.id} style={{ fontSize: '13.5px', color: '#1e293b' }}>
                          {/* Wacana / Stimulus */}
                          {soal.stimulus && (
                            <div style={{
                              background: '#f8fafc',
                              borderLeft: '4px solid #2563eb',
                              borderTop: '1px solid #e2e8f0',
                              borderRight: '1px solid #e2e8f0',
                              borderBottom: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '12.5px',
                              color: '#334155',
                              fontStyle: 'italic',
                              marginBottom: '10px',
                              lineHeight: 1.55,
                            }}>
                              <strong style={{ fontStyle: 'normal', color: '#1e3a8a', marginRight: '6px' }}>[Wacana]:</strong>
                              {soal.stimulus}
                            </div>
                          )}

                          {/* Pertanyaan */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 800, minWidth: '24px', color: '#0f172a' }}>{soal.nomor}.</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{soal.pertanyaan}</span>
                          </div>

                          {/* Pilihan Opsi A, B, C, D (atau E) */}
                          <div style={{
                            paddingLeft: '32px',
                            marginTop: '8px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '8px 16px',
                          }}>
                            {soal.pilihan.map((pil) => (
                              <div key={pil.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                                <span style={{
                                  fontWeight: 800,
                                  minWidth: '22px',
                                  color: '#0f172a',
                                  display: 'inline-block',
                                }}>
                                  {pil.label}.
                                </span>
                                <span style={{ color: '#334155' }}>{pil.teks}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. BAGIAN II: SOAL PILIHAN GANDA KOMPLEKS (PGK) */}
                {naskah.soalPGK.length > 0 && (
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
                    {/* Header Bagian II */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderBottom: '2px solid #0f172a',
                      paddingBottom: '6px',
                      marginBottom: '16px',
                    }}>
                      <span style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        width: '26px',
                        height: '26px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13.5px',
                        fontWeight: 900,
                      }}>II</span>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                          SOAL PILIHAN GANDA KOMPLEKS (AKM)
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginLeft: '8px' }}>
                          (Berilah tanda centang (✓) pada kolom Benar atau Salah!)
                        </span>
                      </div>
                    </div>

                    {/* Daftar Soal PGK */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {naskah.soalPGK.map((soal) => (
                        <div key={soal.id} style={{ fontSize: '13.5px', color: '#1e293b' }}>
                          {soal.stimulus && (
                            <div style={{
                              background: '#f8fafc',
                              borderLeft: '4px solid #0284c7',
                              borderTop: '1px solid #e2e8f0',
                              borderRight: '1px solid #e2e8f0',
                              borderBottom: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '12.5px',
                              color: '#334155',
                              fontStyle: 'italic',
                              marginBottom: '8px',
                              lineHeight: 1.5,
                            }}>
                              <strong style={{ fontStyle: 'normal', color: '#0369a1', marginRight: '6px' }}>[Stimulus]:</strong>
                              {soal.stimulus}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.6, marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, minWidth: '24px', color: '#0f172a' }}>{soal.nomor}.</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{soal.pertanyaan}</span>
                          </div>

                          {/* Tabel Ceklis Benar / Salah */}
                          <div style={{ paddingLeft: '32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #cbd5e1' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>No</th>
                                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Pernyataan</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>Benar</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>Salah</th>
                                </tr>
                              </thead>
                              <tbody>
                                {soal.pernyataan.map((p, pIdx) => (
                                  <tr key={p.id}>
                                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>{pIdx + 1}</td>
                                    <td style={{ padding: '8px', color: '#1e293b', border: '1px solid #cbd5e1' }}>{p.teks}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>[ &nbsp; ]</td>
                                    <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>[ &nbsp; ]</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. BAGIAN III: SOAL URAIAN */}
                {naskah.soalUraian.length > 0 && (
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
                    {/* Header Bagian III */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderBottom: '2px solid #0f172a',
                      paddingBottom: '6px',
                      marginBottom: '16px',
                    }}>
                      <span style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        width: '26px',
                        height: '26px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13.5px',
                        fontWeight: 900,
                      }}>III</span>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                          SOAL URAIAN (ESSAY)
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginLeft: '8px' }}>
                          (Jawablah pertanyaan berikut dengan jelas, sistematis, dan tepat!)
                        </span>
                      </div>
                    </div>

                    {/* Daftar Soal Uraian */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {naskah.soalUraian.map((soal) => (
                        <div key={soal.id} style={{ fontSize: '13.5px', color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 800, minWidth: '24px', color: '#0f172a' }}>{soal.nomor}.</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{soal.pertanyaan}</span>
                          </div>

                          {/* Garis Lembar Jawab Tulis Tangan */}
                          <div style={{ paddingLeft: '32px', marginTop: '10px' }}>
                            <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px' }} />
                            <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px' }} />
                            <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 2: LEMBAR JAWABAN SISWA (LJK) */}
          {activeTab === 'ljk' && (
            <div style={{
              background: '#e2e8f0',
              padding: '36px 16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              minHeight: '100%',
              overflowX: 'auto',
            }}>
              <div style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '820px',
                minHeight: '1000px',
                padding: '44px 52px',
                borderRadius: '4px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    LEMBAR JAWABAN KOMPUTER / PESERTA UJIAN (LJK)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    {naskah.namaUjian} • {naskah.namaSekolah} • TA {naskah.tahunAjaran}
                  </div>
                </div>

                {/* Box Identitas Siswa */}
                <div style={{
                  marginTop: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                  fontSize: '12.5px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Nama Lengkap : ....................................................</div>
                    <div>Nomor Peserta : ....................................................</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Kelas / Rombel : <strong>{naskah.kelas} ({naskah.rombel})</strong></div>
                    <div>Mata Pelajaran : <strong>{naskah.mataPelajaran}</strong></div>
                  </div>
                </div>

                {/* Grid Bulatan Pilihan Ganda */}
                {naskah.soalPG.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '10px' }}>
                      A. Pilihan Ganda (Silang atau Hitamkan salah satu huruf):
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '8px',
                    }}>
                      {naskah.soalPG.map((pg) => (
                        <div key={pg.nomor} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '6px 10px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          background: '#ffffff',
                          fontSize: '12px',
                        }}>
                          <span style={{ fontWeight: 800, color: '#475569', width: '24px', textAlign: 'right' }}>{pg.nomor}.</span>
                          <div style={{ display: 'flex', gap: '8px', color: '#1e293b', fontFamily: 'monospace', fontWeight: 700 }}>
                            <span>( A )</span>
                            <span>( B )</span>
                            <span>( C )</span>
                            <span>( D )</span>
                            {(profile.jenjang === 'SMA/MA' || profile.jenjang === 'SMK') && <span>( E )</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lembar Uraian */}
                {naskah.soalUraian.length > 0 && (
                  <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '14px' }}>
                      B. Lembar Jawaban Soal Uraian:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {naskah.soalUraian.map((u) => (
                        <div key={u.nomor} style={{ fontSize: '12.5px' }}>
                          <div style={{ fontWeight: 800, color: '#1e3a8a' }}>Jawaban Nomor {u.nomor}:</div>
                          <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px', marginTop: '4px' }} />
                          <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px' }} />
                          <div style={{ borderBottom: '1px dashed #cbd5e1', height: '24px' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: KUNCI JAWABAN & RUBRIK GURU */}
          {activeTab === 'kunci' && (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Badge Rahasia Guru */}
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px' }}>
                    DOKUMEN RAHASIA PENDIDIK
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991b1b', marginTop: '4px' }}>
                    Kunci Jawaban, Pembahasan Soal, dan Pedoman Penskoran Resmi
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Skor Maksimal Total</span>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e3a8a' }}>{naskah.skorMaksimalTotal} Poin</div>
                </div>
              </div>

              {/* Kunci Pilihan Ganda */}
              {naskah.kunciPG.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                    Kunci Jawaban & Pembahasan Soal Pilihan Ganda (PG)
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                          <th style={{ padding: '10px', textAlign: 'center', width: '50px', border: '1px solid #e2e8f0' }}>No</th>
                          <th style={{ padding: '10px', textAlign: 'center', width: '70px', border: '1px solid #e2e8f0' }}>Kunci</th>
                          <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Pembahasan Pedagogis</th>
                          <th style={{ padding: '10px', textAlign: 'center', width: '60px', border: '1px solid #e2e8f0' }}>Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {naskah.kunciPG.map((k) => (
                          <tr key={k.nomor} style={{ background: k.nomor % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#475569', border: '1px solid #e2e8f0' }}>{k.nomor}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #e2e8f0' }}>{k.kunci}</td>
                            <td style={{ padding: '8px', color: '#334155', border: '1px solid #e2e8f0', lineHeight: 1.45 }}>{k.pembahasan}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>{k.skor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rubrik Uraian */}
              {naskah.rubrikUraian.length > 0 && (
                <div style={{ paddingTop: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                    Pedoman Rubrik Penskoran Soal Uraian
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {naskah.rubrikUraian.map((rub) => (
                      <div key={rub.nomor} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc', fontSize: '12.5px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span>Soal Nomor {rub.nomor}: {rub.soalRingkas}</span>
                          <span style={{ color: '#2563eb' }}>Maks. {rub.skorMaksimal} Poin</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {rub.kriteriaSkor.map((kr) => (
                            <div key={kr.skor} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 800, color: '#2563eb', width: '56px' }}>Skor {kr.skor}:</span>
                              <span style={{ color: '#334155', flex: 1 }}>{kr.deskripsi}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formula Nilai */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '14px 18px', borderRadius: '10px', fontSize: '13px', color: '#1e40af' }}>
                <strong>Formula Konversi Nilai Rapor:</strong>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', marginTop: '4px', color: '#1e3a8a' }}>
                  Nilai Akhir = (Total Skor Perolehan Siswa / {naskah.skorMaksimalTotal}) × 100
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATRIKS DISTRIBUSI TP */}
          {activeTab === 'matriks' && (
            <div style={{ padding: '28px 32px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                Matriks Distribusi Capaian Tujuan Pembelajaran (TP)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '80px', border: '1px solid #e2e8f0' }}>Kode TP</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Materi Pokok Pembelajaran</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '140px', border: '1px solid #e2e8f0' }}>Alokasi Butir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {naskah.tpTerliput.map((tp, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#2563eb', border: '1px solid #e2e8f0' }}>{tp.kode}</td>
                        <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 600, border: '1px solid #e2e8f0' }}>{tp.materiPokok}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a', border: '1px solid #e2e8f0' }}>{tp.alokasiSoal} Butir</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
