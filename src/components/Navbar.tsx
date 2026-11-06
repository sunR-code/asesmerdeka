import React from 'react';
import { Sparkles, Key, FileText, CheckCircle2, ShieldCheck, FolderOpen, BookOpen, Table2, School, PlusCircle, Layers } from 'lucide-react';
import type { UserQuota } from '../types/assessment';

export type AppTab =
  | 'class_hub'
  | 'supervisi'
  | 'generator'
  | 'worksheet'
  | 'teacher_guide'
  | 'kisi_kisi'
  | 'bank'
  | 'rangkuman_gen'
  | 'rangkuman_view'
  | 'modul_ajar'
  | 'lkpd';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  quota: UserQuota;
  onOpenLicenseModal: () => void;
  onOpenSchoolModal: () => void;
  schoolName?: string;
  activeRombel?: string;
  hasAssessment: boolean;
  hasRangkuman: boolean;
  onPrint: () => void;
  bankCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  quota,
  onOpenLicenseModal,
  onOpenSchoolModal,
  schoolName,
  activeRombel,
  hasAssessment,
  hasRangkuman,
  bankCount,
}) => {
  const isAsesmenSection =
    activeTab === 'generator' ||
    activeTab === 'worksheet' ||
    activeTab === 'kisi_kisi' ||
    activeTab === 'teacher_guide';

  const isRangkumanSection =
    activeTab === 'rangkuman_gen' ||
    activeTab === 'rangkuman_view';

  return (
    <header className="no-print" style={{
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
    }}>
      {/* Baris Utama: Brand + 3 Menu Inti + Profil & Kuota */}
      <div style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand */}
        <div
          onClick={() => setActiveTab('class_hub')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)'
          }}>
            <Sparkles size={19} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px' }}>
                Ases<span style={{ color: '#2563eb' }}>Merdeka</span>
              </span>
              <span className="badge badge-indigo" style={{ fontSize: 10, padding: '1px 7px' }}>
                Kurikulum Merdeka
              </span>
            </div>
          </div>
        </div>

        {/* Navigasi Utama: Bersih, Rapi & Nyaman untuk Guru Senior */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#f8fafc',
          padding: '4px 6px',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('class_hub')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'class_hub' ? '#2563eb' : 'transparent',
              color: activeTab === 'class_hub' ? '#ffffff' : '#334155',
              boxShadow: activeTab === 'class_hub' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
            }}
          >
            <Layers size={16} /> Administrasi Kelas
          </button>

          <button
            onClick={() => setActiveTab(hasAssessment && activeTab === 'worksheet' ? 'worksheet' : 'generator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isAsesmenSection ? '#2563eb' : 'transparent',
              color: isAsesmenSection ? '#ffffff' : '#334155',
              boxShadow: isAsesmenSection ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
            }}
          >
            <FileText size={16} /> Soal & Kisi-Kisi
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'rangkuman_view' ? 'rangkuman_view' : 'rangkuman_gen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isRangkumanSection ? '#2563eb' : 'transparent',
              color: isRangkumanSection ? '#ffffff' : '#334155',
              boxShadow: isRangkumanSection ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
            }}
          >
            <BookOpen size={16} /> Rangkuman
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'bank' ? '#2563eb' : 'transparent',
              color: activeTab === 'bank' ? '#ffffff' : '#334155',
              boxShadow: activeTab === 'bank' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none'
            }}
          >
            <FolderOpen size={16} /> Arsip Saya
            {bankCount > 0 && (
              <span style={{
                background: activeTab === 'bank' ? '#ffffff' : '#e2e8f0',
                color: activeTab === 'bank' ? '#1d4ed8' : '#1e293b',
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 99,
                fontWeight: 800
              }}>
                {bankCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('supervisi')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'supervisi' ? '#7c3aed' : '#f5f3ff',
              color: activeTab === 'supervisi' ? '#ffffff' : '#7c3aed',
              boxShadow: activeTab === 'supervisi' ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none'
            }}
          >
            <ShieldCheck size={16} /> 🎓 Siap Supervisi
          </button>
        </nav>

        {/* Sisi Kanan: Data Kelas & Kuota Harian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onOpenSchoolModal}
            className="btn btn-sm btn-outline"
            style={{
              padding: '6px 12px',
              borderRadius: 99,
              fontSize: 12,
              background: '#f8fafc',
              borderColor: '#cbd5e1',
              color: '#334155'
            }}
            title="Atur Identitas Sekolah, Guru & Kepala Sekolah"
          >
            <School size={14} color="#2563eb" />
            <span>
              {activeRombel ? `${activeRombel} • ` : ''}
              {schoolName ? schoolName.slice(0, 14) + (schoolName.length > 14 ? '…' : '') : 'Data Kelas'}
            </span>
          </button>

          <div
            onClick={onOpenLicenseModal}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 99,
              background: quota.tier === 'pro' ? '#ecfdf5' : '#eff6ff',
              border: quota.tier === 'pro' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
              transition: 'all 0.2s'
            }}
            title="Kuota di-refresh otomatis setiap hari. Klik untuk info Lisensi Guru Pro"
          >
            {quota.tier === 'pro' ? (
              <>
                <ShieldCheck size={15} color="#059669" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#047857' }}>GURU PRO</span>
              </>
            ) : (
              <>
                <Key size={14} color="#2563eb" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                  Kuota Hari Ini: {quota.remainingCredits}/{quota.maxCredits}
                </span>
                <span style={{
                  fontSize: 10,
                  background: '#2563eb',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: 99,
                  fontWeight: 700
                }}>
                  Pro
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Bar Kontekstual: Hanya muncul rapi jika sedang di menu Soal atau Rangkuman */}
      {isAsesmenSection && hasAssessment && (
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '6px 20px'
        }}>
          <div style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setActiveTab('generator')}
              className={`btn btn-sm ${activeTab === 'generator' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <PlusCircle size={13} /> Buat Soal Baru
            </button>
            <button
              onClick={() => setActiveTab('worksheet')}
              className={`btn btn-sm ${activeTab === 'worksheet' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <FileText size={13} /> Lembar Siswa
            </button>
            <button
              onClick={() => setActiveTab('kisi_kisi')}
              className={`btn btn-sm ${activeTab === 'kisi_kisi' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <Table2 size={13} /> Tabel Kisi-Kisi & Kartu Soal
            </button>
            <button
              onClick={() => setActiveTab('teacher_guide')}
              className={`btn btn-sm ${activeTab === 'teacher_guide' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <CheckCircle2 size={13} /> Kunci & Rubrik KKTP
            </button>
          </div>
        </div>
      )}

      {isRangkumanSection && hasRangkuman && (
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '6px 20px'
        }}>
          <div style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setActiveTab('rangkuman_gen')}
              className={`btn btn-sm ${activeTab === 'rangkuman_gen' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <PlusCircle size={13} /> Buat Rangkuman Baru
            </button>
            <button
              onClick={() => setActiveTab('rangkuman_view')}
              className={`btn btn-sm ${activeTab === 'rangkuman_view' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 99, padding: '4px 12px', fontSize: 12 }}
            >
              <Sparkles size={13} /> Lihat Lembar Rangkuman Visual
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
