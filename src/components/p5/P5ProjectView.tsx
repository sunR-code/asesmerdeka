import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  Printer, 
  CheckCircle2, 
  Layers, 
  Compass, 
  Users, 
  Award, 
  Calendar, 
  School, 
  HeartHandshake, 
  Leaf, 
  Smile, 
  Coins, 
  Globe 
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import { getSchoolProfile } from '../../utils/schoolProfileStorage';
import type { KelasHarianData } from '../../types/kelasHarian';
import { getKelasHarianData } from '../../utils/kelasHarianStorage';
import type { P5ProjectDocument, P5Tema, KategoriPerkembanganP5 } from '../../types/p5Project';
import { P5_TEMA_CATALOG, generateP5Document } from '../../utils/p5Engine';
import { exportP5ToDocx } from '../../utils/docxP5Exporter';

interface Props {
  profile?: SchoolProfile;
  kelasHarian?: KelasHarianData;
}

export const P5ProjectView: React.FC<Props> = ({ profile: propProfile, kelasHarian: propKelasHarian }) => {
  const [profile, setProfile] = useState<SchoolProfile>(propProfile || getSchoolProfile());
  const [kelasHarian, setKelasHarian] = useState<KelasHarianData>(
    propKelasHarian || getKelasHarianData(propProfile || getSchoolProfile(), [])
  );

  const [selectedTema, setSelectedTema] = useState<P5Tema>('Gaya Hidup Berkelanjutan');
  const [activeTab, setActiveTab] = useState<'modul' | 'alur' | 'rubrik' | 'observasi'>('modul');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [p5Doc, setP5Doc] = useState<P5ProjectDocument | null>(null);

  // Sync profile & kelasHarian
  useEffect(() => {
    const prof = propProfile || getSchoolProfile();
    setProfile(prof);
    const kh = propKelasHarian || getKelasHarianData(prof, []);
    setKelasHarian(kh);
  }, [propProfile, propKelasHarian]);

  // Regenerasi dokumen saat tema atau kelas berubah
  useEffect(() => {
    const doc = generateP5Document(profile, selectedTema, kelasHarian);
    setP5Doc(doc);
  }, [selectedTema, profile, kelasHarian]);

  // Update nilai observasi siswa secara langsung
  const handleUpdateNilaiSiswa = (siswaNis: string, dimensi: string, nilai: KategoriPerkembanganP5) => {
    if (!p5Doc) return;
    const updatedSiswa = p5Doc.rekapObservasiSiswa.map((s) => {
      if (s.nis === siswaNis) {
        return {
          ...s,
          nilaiDimensi: {
            ...s.nilaiDimensi,
            [dimensi]: nilai,
          },
        };
      }
      return s;
    });
    setP5Doc({
      ...p5Doc,
      rekapObservasiSiswa: updatedSiswa,
    });
  };

  // Unduh Word (.docx)
  const handleExportDocx = async () => {
    if (!p5Doc) return;
    try {
      setIsExporting(true);
      await exportP5ToDocx(p5Doc, profile);
    } catch (err) {
      console.error('Gagal ekspor Word P5:', err);
      alert('Terjadi kesalahan saat mengekspor dokumen Word P5.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Icon tema helper
  const getTemaIcon = (tema: P5Tema) => {
    switch (tema) {
      case 'Gaya Hidup Berkelanjutan':
        return <Leaf style={{ width: '20px', height: '20px', color: '#059669' }} />;
      case 'Kearifan Lokal':
        return <Compass style={{ width: '20px', height: '20px', color: '#d97706' }} />;
      case 'Bhinneka Tunggal Ika':
        return <HeartHandshake style={{ width: '20px', height: '20px', color: '#dc2626' }} />;
      case 'Bangunlah Jiwa dan Raganya':
        return <Smile style={{ width: '20px', height: '20px', color: '#2563eb' }} />;
      case 'Kewirausahaan':
        return <Coins style={{ width: '20px', height: '20px', color: '#7c3aed' }} />;
      case 'Suara Demokrasi':
        return <Globe style={{ width: '20px', height: '20px', color: '#0284c7' }} />;
      default:
        return <Sparkles style={{ width: '20px', height: '20px', color: '#2563eb' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #065f46 0%, #0d9488 55%, #0f766e 100%)',
        borderRadius: '18px',
        padding: '24px 28px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.3)',
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
              <HeartHandshake style={{ width: '15px', height: '15px', color: '#fde047' }} />
              Kokurikuler Kurikulum Merdeka
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Modul Projek Penguatan Profil Pelajar Pancasila (P5)
            </h1>
            <p style={{ fontSize: '13.5px', color: '#ccfbf1', margin: '6px 0 0 0', maxWidth: '720px', lineHeight: 1.5 }}>
              Modul projek kokurikuler terintegrasi dengan pemetaan Dimensi Profil Pelajar Pancasila, Alur 5 Tahap Pembelajaran Aktif, Rubrik Asesmen Berjenjang, serta Lembar Observasi Karakter Siswa (Bahan Rapor P5).
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleExportDocx}
              disabled={!p5Doc || isExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: '#ffffff',
                color: '#065f46',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: !p5Doc || isExporting ? 'not-allowed' : 'pointer',
                opacity: !p5Doc || isExporting ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download style={{ width: '16px', height: '16px', color: '#047857' }} />
              {isExporting ? 'Memproses Word...' : 'Unduh Modul (.docx)'}
            </button>
            <button
              onClick={handlePrint}
              disabled={!p5Doc}
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
                cursor: !p5Doc ? 'not-allowed' : 'pointer',
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
          color: '#ccfbf1',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <School style={{ width: '16px', height: '16px', color: '#fde047' }} />
            <span><strong>{profile.namaSekolah}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers style={{ width: '16px', height: '16px', color: '#6ee7b7' }} />
            <span>Kelas <strong>{profile.kelasUtama} ({profile.rombelAktif})</strong> • Fase {profile.jenjang === 'SD/MI' ? 'C' : profile.jenjang === 'SMP/MTs' ? 'D' : 'E'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar style={{ width: '16px', height: '16px', color: '#7dd3fc' }} />
            <span>Semester <strong>{profile.semester}</strong> • TA {profile.tahunAjaran}</span>
          </div>
        </div>
      </div>

      {/* 2. Selector Tema P5 */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '22px 26px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass style={{ width: '18px', height: '18px', color: '#059669' }} />
            <h2 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Pilih Tema Projek P5 yang Dijalankan
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Sesuai Panduan Resmi Kemendikbudristek
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {P5_TEMA_CATALOG.map((cat) => {
            const isSelected = selectedTema === cat.tema;
            return (
              <button
                key={cat.tema}
                type="button"
                onClick={() => setSelectedTema(cat.tema)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}>
                    {getTemaIcon(cat.tema)}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{cat.tema}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                    {cat.tagline}
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                  ⏱️ {cat.alurAktivitas.reduce((a, b) => a + b.alokasiJP, 0)} JP
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Konten Dokumen Projek P5 */}
      {p5Doc && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}>
          {/* Sub Navigation Bar */}
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
                onClick={() => setActiveTab('modul')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'modul' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'modul' ? '#ffffff' : 'transparent',
                  color: activeTab === 'modul' ? '#047857' : '#64748b',
                  boxShadow: activeTab === 'modul' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Award style={{ width: '15px', height: '15px' }} />
                1. Profil & Dimensi Projek
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alur')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'alur' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'alur' ? '#ffffff' : 'transparent',
                  color: activeTab === 'alur' ? '#047857' : '#64748b',
                  boxShadow: activeTab === 'alur' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Compass style={{ width: '15px', height: '15px' }} />
                2. Alur 5 Tahap ({p5Doc.alurAktivitas.length} Kegiatan)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rubrik')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'rubrik' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'rubrik' ? '#ffffff' : 'transparent',
                  color: activeTab === 'rubrik' ? '#047857' : '#64748b',
                  boxShadow: activeTab === 'rubrik' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                3. Rubrik Capaian (BB, MB, BSH, SB)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('observasi')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeTab === 'observasi' ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: activeTab === 'observasi' ? '#ffffff' : 'transparent',
                  color: activeTab === 'observasi' ? '#047857' : '#64748b',
                  boxShadow: activeTab === 'observasi' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Users style={{ width: '15px', height: '15px' }} />
                4. Lembar Observasi ({p5Doc.rekapObservasiSiswa.length} Siswa)
              </button>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              Total Alokasi: {p5Doc.alokasiTotalJP} JP
            </div>
          </div>

          {/* TAB 1: MODUL & PROFIL PROJEK */}
          {activeTab === 'modul' && (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Kop & Judul Projek */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#065f46', background: '#d1fae5', padding: '4px 12px', borderRadius: '9999px' }}>
                  Tema: {p5Doc.tema}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginTop: '12px', margin: '12px 0 0 0' }}>
                  {p5Doc.judulProjek}
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                  {p5Doc.namaSekolah} • Fase {p5Doc.fase} • Kelas {p5Doc.kelas} • Tahun Ajaran {p5Doc.tahunAjaran}
                </p>
              </div>

              {/* Rincian Tim & Waktu */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '14px',
                fontSize: '12.5px',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong style={{ display: 'inline-block', width: '130px', color: '#475569' }}>Koordinator:</strong> <span style={{ fontWeight: 700, color: '#0f172a' }}>{p5Doc.koordinatorProjek}</span></div>
                  <div><strong style={{ display: 'inline-block', width: '130px', color: '#475569' }}>Sasaran / Rombel:</strong> <span>Kelas {p5Doc.kelas} ({profile.rombelAktif})</span></div>
                  <div><strong style={{ display: 'inline-block', width: '130px', color: '#475569' }}>Total Waktu:</strong> <span style={{ fontWeight: 800, color: '#059669' }}>{p5Doc.alokasiTotalJP} Jam Pelajaran (JP)</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong style={{ display: 'inline-block', width: '120px', color: '#475569' }}>Fasilitator:</strong> <span>{p5Doc.fasilitatorList.join(', ')}</span></div>
                  <div><strong style={{ display: 'inline-block', width: '120px', color: '#475569' }}>Model Waktu:</strong> <span>Blok Mingguan / Reguler Terjadwal</span></div>
                </div>
              </div>

              {/* Deskripsi & Relevansi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: '15px', height: '15px', color: '#059669' }} />
                    Deskripsi Singkat Projek
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: 0 }}>
                    {p5Doc.deskripsiSingkat}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <School style={{ width: '15px', height: '15px', color: '#059669' }} />
                    Relevansi Projek bagi Sekolah & Peserta Didik
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: 0 }}>
                    {p5Doc.relevansiProjek}
                  </p>
                </div>
              </div>

              {/* Pemetaan Dimensi, Elemen, Sub Elemen */}
              <div style={{ paddingTop: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HeartHandshake style={{ width: '15px', height: '15px', color: '#059669' }} />
                  Dimensi & Target Pencapaian Profil Pelajar Pancasila
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                        <th style={{ padding: '10px', textAlign: 'left', width: '25%', border: '1px solid #e2e8f0' }}>Dimensi</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '20%', border: '1px solid #e2e8f0' }}>Elemen</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '20%', border: '1px solid #e2e8f0' }}>Sub-Elemen</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '35%', border: '1px solid #e2e8f0' }}>Target Capaian Fase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p5Doc.dimensiTarget.map((dt, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#065f46', border: '1px solid #e2e8f0' }}>{dt.dimensi}</td>
                          <td style={{ padding: '10px', color: '#334155', border: '1px solid #e2e8f0' }}>{dt.elemen}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>{dt.subElemen}</td>
                          <td style={{ padding: '10px', color: '#475569', lineHeight: 1.5, border: '1px solid #e2e8f0' }}>{dt.targetFase}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rencana Asesmen */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  Rencana Asesmen Projek (Diagnostik, Formatif, Sumatif)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                    <div style={{ fontWeight: 800, color: '#1e40af', marginBottom: '4px' }}>1. Asesmen Diagnostik (Awal)</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{p5Doc.rencanaAsesmen.diagnostik}</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #fde68a', background: '#fffbeb' }}>
                    <div style={{ fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>2. Asesmen Formatif (Proses)</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{p5Doc.rencanaAsesmen.formatif}</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
                    <div style={{ fontWeight: 800, color: '#065f46', marginBottom: '4px' }}>3. Asesmen Sumatif (Pameran Karya)</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{p5Doc.rencanaAsesmen.sumatif}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALUR 5 TAHAP AKTIVITAS */}
          {activeTab === 'alur' && (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ fontSize: '15.5px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Rangkaian Alur Pembelajaran Aktif Projek
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Terbagi dalam 5 tahap terstruktur: Pengenalan, Kontekstualisasi, Aksi Nyata, Refleksi, dan Tindak Lanjut.
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '9999px' }}>
                  Total {p5Doc.alokasiTotalJP} JP
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {p5Doc.alurAktivitas.map((akt) => (
                  <div key={akt.no} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: '#047857',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12.5px',
                          fontWeight: 800,
                        }}>
                          {akt.no}
                        </span>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', marginRight: '8px' }}>
                            Tahap {akt.tahap}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{akt.namaAktivitas}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        {akt.alokasiJP} JP
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong style={{ color: '#0f172a' }}>Tujuan Kegiatan:</strong> {akt.tujuanAktivitas}</div>
                      <div><strong style={{ color: '#0f172a' }}>Peran Fasilitator / Guru:</strong> {akt.peranGuru}</div>
                    </div>

                    {/* Langkah Pelaksanaan */}
                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Langkah Pelaksanaan Siswa:</div>
                      <ol style={{ paddingLeft: '20px', margin: 0, color: '#334155', lineHeight: 1.55 }}>
                        {akt.langkahKegiatan.map((lk, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{lk}</li>
                        ))}
                      </ol>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', paddingTop: '4px' }}>
                      <div style={{ color: '#64748b' }}>
                        <strong style={{ color: '#334155' }}>Alat & Bahan:</strong> {akt.alatDanBahan.join(', ')}
                      </div>
                      {akt.bentukAsesmen && (
                        <div style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                          Asesmen: {akt.bentukAsesmen}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RUBRIK CAPAIAN KARAKTER */}
          {activeTab === 'rubrik' && (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Rubrik Penilaian Capaian Dimensi Profil Pelajar Pancasila
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Instrumen penilaian berjenjang 4 skala: Belum Berkembang (BB), Mulai Berkembang (MB), Berkembang Sesuai Harapan (BSH), dan Sangat Berkembang (SB).
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {p5Doc.dimensiTarget.map((dt, idx) => (
                  <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{
                      background: '#f1f5f9',
                      padding: '12px 16px',
                      borderBottom: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '12.5px',
                    }}>
                      <div>
                        <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '14px' }}>{dt.dimensi}</span>
                        <div style={{ color: '#475569', marginTop: '2px' }}>
                          Elemen: <strong>{dt.elemen}</strong> • Sub-Elemen: <strong>{dt.subElemen}</strong>
                        </div>
                      </div>
                      <span style={{ color: '#065f46', background: '#d1fae5', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                        Target: {dt.targetFase}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', fontSize: '11.5px', lineHeight: 1.5 }}>
                      <div style={{ padding: '12px 14px', background: '#fef2f2', borderRight: '1px solid #fecaca' }}>
                        <div style={{ fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Belum Berkembang (BB)
                        </div>
                        <p style={{ color: '#334155', margin: 0 }}>{dt.rubrik.bb}</p>
                      </div>

                      <div style={{ padding: '12px 14px', background: '#fffbeb', borderRight: '1px solid #fde68a' }}>
                        <div style={{ fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Mulai Berkembang (MB)
                        </div>
                        <p style={{ color: '#334155', margin: 0 }}>{dt.rubrik.mb}</p>
                      </div>

                      <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRight: '1px solid #a7f3d0' }}>
                        <div style={{ fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669' }} />
                          Sesuai Harapan (BSH)
                        </div>
                        <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>{dt.rubrik.bsh}</p>
                      </div>

                      <div style={{ padding: '12px 14px', background: '#eff6ff' }}>
                        <div style={{ fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Sangat Berkembang (SB)
                        </div>
                        <p style={{ color: '#334155', margin: 0 }}>{dt.rubrik.sb}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LEMBAR OBSERVASI SISWA (RAPOR P5) */}
          {activeTab === 'observasi' && (
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15.5px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Lembar Observasi & Input Nilai Rapor P5
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Data siswa tersinkronisasi otomatis dari Rombel Kelas {profile.kelasUtama} ({profile.rombelAktif}). Klik predikat untuk menyesuaikan capaian karakter per siswa.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px' }}>
                  <span style={{ fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '3px 8px', borderRadius: '4px' }}>
                    BSH = Standar Lulus
                  </span>
                  <span style={{ fontWeight: 700, color: '#1e40af', background: '#dbeafe', padding: '3px 8px', borderRadius: '4px' }}>
                    SB = Sangat Berkembang
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '10px', textAlign: 'center', width: '45px', borderRight: '1px solid #cbd5e1' }}>No</th>
                      <th style={{ padding: '10px', textAlign: 'left', width: '220px', borderRight: '1px solid #cbd5e1' }}>Nama Siswa</th>
                      {p5Doc.dimensiTarget.map((dt, idx) => (
                        <th key={idx} style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                          <div>{dt.dimensi.split(',')[0]}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 400 }}>({dt.subElemen})</div>
                        </th>
                      ))}
                      <th style={{ padding: '10px', textAlign: 'left', width: '240px' }}>Catatan Proses Guru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p5Doc.rekapObservasiSiswa.map((sis, sIdx) => (
                      <tr key={sis.nis} style={{ background: sIdx % 2 === 0 ? '#fafafa' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#64748b', borderRight: '1px solid #e2e8f0' }}>{sIdx + 1}</td>
                        <td style={{ padding: '10px', borderRight: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{sis.nama}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>NIS: {sis.nis}</div>
                        </td>
                        {p5Doc.dimensiTarget.map((dt) => {
                          const currentVal = sis.nilaiDimensi[dt.dimensi] || 'BSH';
                          return (
                            <td key={dt.dimensi} style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                              <select
                                value={currentVal}
                                onChange={(e) =>
                                  handleUpdateNilaiSiswa(
                                    sis.nis,
                                    dt.dimensi,
                                    e.target.value as KategoriPerkembanganP5
                                  )
                                }
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: '1.5px solid #cbd5e1',
                                  background: currentVal === 'SB' ? '#dbeafe' : currentVal === 'BSH' ? '#d1fae5' : currentVal === 'MB' ? '#fef3c7' : '#fee2e2',
                                  color: currentVal === 'SB' ? '#1e40af' : currentVal === 'BSH' ? '#065f46' : currentVal === 'MB' ? '#92400e' : '#991b1b',
                                }}
                              >
                                <option value="BB">BB (Belum Berkembang)</option>
                                <option value="MB">MB (Mulai Berkembang)</option>
                                <option value="BSH">BSH (Sesuai Harapan)</option>
                                <option value="SB">SB (Sangat Berkembang)</option>
                              </select>
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px', color: '#475569', fontSize: '11px', lineHeight: 1.4 }}>
                          {sis.catatanProses}
                        </td>
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
