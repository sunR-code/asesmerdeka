import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Sliders, 
  Zap, 
  Award, 
  Info 
} from 'lucide-react';
import type { GenerationRequest, JenjangFase, TipeAsesmen, LevelKognitif } from '../types/assessment';
import { KURIKULUM_MERDEKA_DATABASE } from '../data/kurikulumMerdekaCP';
import { KURIKULUM_CATALOG, detectKategoriFromFase, getSuggestedTopics } from '../utils/kurikulumCatalog';
import type { JenjangKategori } from '../utils/kurikulumCatalog';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { jenjangToDefaultFase } from '../utils/schoolProfileStorage';

interface GeneratorFormProps {
  onGenerate: (req: GenerationRequest) => Promise<void>;
  isLoading: boolean;
  schoolProfile?: SchoolProfile;
  prefillData?: Partial<GenerationRequest> | null;
}

const PRESETS = [
  {
    title: '📐 Matematika SMP (Fase D)',
    mataPelajaran: 'Matematika',
    jenjangFase: 'Fase D (Kelas 7-9 SMP)' as JenjangFase,
    kelas: '8',
    tipeAsesmen: 'Sumatif (Tengah Semester / STS)' as TipeAsesmen,
    materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV) Kontekstual',
    tujuanPembelajaran: 'Peserta didik dapat memodelkan dan memecahkan masalah kontekstual transaksi belanja menggunakan SPLDV.',
    alokasiWaktu: '80 Menit',
  },
  {
    title: '🌿 IPAS SD (Fase B)',
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    jenjangFase: 'Fase B (Kelas 3-4 SD)' as JenjangFase,
    kelas: '4',
    tipeAsesmen: 'Formatif (Proses Pembelajaran)' as TipeAsesmen,
    materiPokok: 'Bagian Tubuh Tumbuhan dan Fungsinya serta Fotosintesis',
    tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi bagian tubuh tumbuhan serta mengaitkan fungsinya dalam proses fotosintesis.',
    alokasiWaktu: '60 Menit',
  },
  {
    title: '📖 Bahasa Indonesia SMA (Fase E)',
    mataPelajaran: 'Bahasa Indonesia',
    jenjangFase: 'Fase E (Kelas 10 SMA/SMK)' as JenjangFase,
    kelas: '10',
    tipeAsesmen: 'Sumatif (Akhir Semester / SAS)' as TipeAsesmen,
    materiPokok: 'Mengevaluasi dan Menulis Teks Argumentasi Isu Ketahanan Pangan',
    tujuanPembelajaran: 'Mengevaluasi akurasi fakta serta opini dalam teks argumentasi dan menyusun argumen logis.',
    alokasiWaktu: '90 Menit',
  },
  {
    title: '💻 Informatika SMP (Fase D)',
    mataPelajaran: 'Informatika',
    jenjangFase: 'Fase D (Kelas 7-9 SMP)' as JenjangFase,
    kelas: '7',
    tipeAsesmen: 'Formatif (Proses Pembelajaran)' as TipeAsesmen,
    materiPokok: 'Berpikir Komputasional: Pola, Dekomposisi, dan Algoritma',
    tujuanPembelajaran: 'Peserta didik mampu menerapkan dekomposisi masalah dan menyusun algoritma sederhana secara runut.',
    alokasiWaktu: '70 Menit',
  }
];

export const GeneratorForm: React.FC<GeneratorFormProps> = ({
  onGenerate,
  isLoading,
  schoolProfile,
  prefillData,
}) => {
  const [selectedKategori, setSelectedKategori] = useState<JenjangKategori>(
    schoolProfile?.jenjang || 'SMP/MTs'
  );
  const [jenjangFase, setJenjangFase] = useState<JenjangFase>('Fase D (Kelas 7-9 SMP)');
  const [kelas, setKelas] = useState('8');
  const [mataPelajaran, setMataPelajaran] = useState('Matematika');
  const [tipeAsesmen, setTipeAsesmen] = useState<TipeAsesmen>('Sumatif (Tengah Semester / STS)');
  const [materiPokok, setMateriPokok] = useState('Sistem Persamaan Linear Dua Variabel (SPLDV)');
  const [tujuanPembelajaranInput, setTujuanPembelajaranInput] = useState(
    'Peserta didik dapat menyelesaikan masalah kontekstual yang berkaitan dengan sistem persamaan linear dua variabel dengan bernalar kritis.'
  );
  const [alokasiWaktu, setAlokasiWaktu] = useState('80 Menit');
  const [showMadrasahMapel, setShowMadrasahMapel] = useState(false);
  
  // Komposisi Soal
  const [jumlahPG, setJumlahPG] = useState(5);
  const [jumlahPGK, setJumlahPGK] = useState(2);
  const [jumlahUraian, setJumlahUraian] = useState(2);
  const [levelKognitif, setLevelKognitif] = useState<LevelKognitif>('Campuran Berimbang');
  const [sertakanRubrik, setSertakanRubrik] = useState(true);
  
  // Info Sekolah
  const [namaSekolah, setNamaSekolah] = useState(schoolProfile?.namaSekolah || '');
  const [namaGuru, setNamaGuru] = useState(schoolProfile?.namaGuru || '');

  // Helper: otomatis perbarui saran topik & TP saat guru memilih mapel/jenjang/kelas
  const syncSuggestedMateri = (targetMapel: string, targetFase: JenjangFase, targetKelas: string) => {
    const suggestions = getSuggestedTopics(targetMapel, targetFase, targetKelas);
    if (suggestions.length > 0) {
      setMateriPokok(suggestions[0].topik);
      setTujuanPembelajaranInput(suggestions[0].tujuanPembelajaran);
    }
  };

  const suggestedTopicList = getSuggestedTopics(mataPelajaran, jenjangFase, kelas);

  useEffect(() => {
    if (schoolProfile) {
      setNamaSekolah(schoolProfile.namaSekolah);
      setNamaGuru(schoolProfile.namaGuru);
      if (!prefillData) {
        const targetFase = jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama);
        setSelectedKategori(schoolProfile.jenjang);
        setJenjangFase(targetFase);
        setKelas(schoolProfile.kelasUtama || '8');
        if (schoolProfile.mataPelajaranUtama) {
          setMataPelajaran(schoolProfile.mataPelajaranUtama);
          syncSuggestedMateri(schoolProfile.mataPelajaranUtama, targetFase, schoolProfile.kelasUtama || '8');
        }
      }
    }
  }, [schoolProfile]);

  useEffect(() => {
    if (prefillData) {
      if (prefillData.mataPelajaran) setMataPelajaran(prefillData.mataPelajaran);
      if (prefillData.jenjangFase) {
        setJenjangFase(prefillData.jenjangFase);
        setSelectedKategori(detectKategoriFromFase(prefillData.jenjangFase, prefillData.mataPelajaran));
      }
      if (prefillData.kelas) setKelas(prefillData.kelas);
      if (prefillData.materiPokok) setMateriPokok(prefillData.materiPokok);
      if (prefillData.tujuanPembelajaranInput) setTujuanPembelajaranInput(prefillData.tujuanPembelajaranInput);
    }
  }, [prefillData]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setMataPelajaran(preset.mataPelajaran);
    setJenjangFase(preset.jenjangFase);
    setSelectedKategori(detectKategoriFromFase(preset.jenjangFase));
    setKelas(preset.kelas);
    setTipeAsesmen(preset.tipeAsesmen);
    setMateriPokok(preset.materiPokok);
    setTujuanPembelajaranInput(preset.tujuanPembelajaran);
    setAlokasiWaktu(preset.alokasiWaktu);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSourceRangkuman =
      prefillData?.sourceRangkuman && prefillData.materiPokok === materiPokok
        ? prefillData.sourceRangkuman
        : undefined;
    onGenerate({
      mataPelajaran,
      jenjangFase,
      kelas,
      tipeAsesmen,
      materiPokok,
      tujuanPembelajaranInput,
      jumlahPG,
      jumlahPGK,
      jumlahUraian,
      levelKognitif,
      sertakanRubrik,
      alokasiWaktu,
      namaSekolah,
      namaGuru,
      sourceRangkuman: matchedSourceRangkuman,
    });
  };

  const totalSoal = jumlahPG + jumlahPGK + jumlahUraian;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
      
      {/* Banner Intro */}
      <div className="glass-panel" style={{
        padding: '24px 30px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)',
        border: '1px solid #bfdbfe'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-indigo">
                <Sparkles size={12} /> AI Generator Kurikulum Merdeka
              </span>
              <span className="badge badge-emerald">
                Termasuk Tabel Kisi-Kisi & Rubrik KKTP
              </span>
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Susun Soal, Kisi-Kisi & Rubrik Kelas Bapak/Ibu dalam Hitungan Detik
            </h1>
            <p style={{ color: '#475569', fontSize: 14, maxWidth: 650 }}>
              Otomatis menghasilkan soal berbasis stimulus kontekstual, AKM (Pilihan Ganda Kompleks), Uraian HOTS, Tabel Kisi-Kisi, serta Rubrik KKTP yang siap diunduh ke Word, PDF, atau Gambar WA.
            </p>
          </div>
          
          <div style={{ background: '#ffffff', padding: '12px 18px', borderRadius: 'var(--radius-md)', border: '1px solid #dbeafe', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Estimasi Paket Dokumen
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>
              {totalSoal} Soal <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>+ Kisi-Kisi & KKTP</span>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #dbeafe' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#d97706" /> Contoh Cepat (Preset Siap Pakai):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="btn btn-sm btn-outline"
                style={{ fontSize: 12, padding: '6px 12px', background: '#ffffff' }}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Generator Form */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '30px' }}>
        
        {/* Section 1: Identitas & Fase */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <BookOpen size={18} color="#2563eb" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              1. Pilih Kelas & Mata Pelajaran Bapak/Ibu (Ketuk Cepat)
            </h2>
          </div>

          {/* Interactive Chips: Jenjang -> Kelas -> Mapel */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 18
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
                A. Pilih Jenjang Sekolah / Madrasah:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(KURIKULUM_CATALOG) as JenjangKategori[]).map((kat) => {
                  const cfg = KURIKULUM_CATALOG[kat];
                  const active = selectedKategori === kat;
                  return (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => {
                        setSelectedKategori(kat);
                        const firstKelas = cfg.kelasList[0];
                        const defaultMapel = cfg.mapelUmum[0];
                        setKelas(firstKelas.kelas);
                        setJenjangFase(firstKelas.fase);
                        setMataPelajaran(defaultMapel);
                        syncSuggestedMateri(defaultMapel, firstKelas.fase, firstKelas.kelas);
                      }}
                      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      {cfg.label} <span style={{ opacity: 0.85, fontSize: 11 }}>({cfg.subLabel})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                B. Pilih Kelas:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {KURIKULUM_CATALOG[selectedKategori].kelasList.map((kl) => {
                  const active = kelas === kl.kelas;
                  return (
                    <button
                      key={kl.kelas}
                      type="button"
                      onClick={() => {
                        setKelas(kl.kelas);
                        setJenjangFase(kl.fase);
                        syncSuggestedMateri(mataPelajaran, kl.fase, kl.kelas);
                      }}
                      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '5px 14px', fontSize: 12 }}
                    >
                      Kelas {kl.kelas}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                  C. Pilih Mata Pelajaran (atau ketik manual di bawah):
                </span>
                <button
                  type="button"
                  onClick={() => setShowMadrasahMapel(!showMadrasahMapel)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {showMadrasahMapel ? 'Sembunyikan Mapel Madrasah/Kemenag' : '+ Tampilkan Mapel Madrasah (MI/MTs/MA)'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {KURIKULUM_CATALOG[selectedKategori].mapelUmum.map((mp) => (
                  <button
                    key={mp}
                    type="button"
                    onClick={() => {
                      setMataPelajaran(mp);
                      syncSuggestedMateri(mp, jenjangFase, kelas);
                    }}
                    className={`btn btn-sm ${mataPelajaran === mp ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    {mp}
                  </button>
                ))}
                {showMadrasahMapel &&
                  KURIKULUM_CATALOG[selectedKategori].mapelMadrasah.map((mp) => (
                    <button
                      key={mp}
                      type="button"
                      onClick={() => {
                        setMataPelajaran(mp);
                        syncSuggestedMateri(mp, jenjangFase, kelas);
                      }}
                      className={`btn btn-sm ${mataPelajaran === mp ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: 11.5, padding: '4px 10px', borderColor: '#6ee7b7', color: mataPelajaran === mp ? '#ffffff' : '#047857' }}
                    >
                      🕌 {mp}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            
            <div className="form-group">
              <label className="form-label">Jenjang & Fase Kurikulum</label>
              <select 
                className="form-select"
                value={jenjangFase}
                onChange={(e) => setJenjangFase(e.target.value as JenjangFase)}
              >
                <option value="Fase A (Kelas 1-2 SD)">Fase A (Kelas 1-2 SD)</option>
                <option value="Fase B (Kelas 3-4 SD)">Fase B (Kelas 3-4 SD)</option>
                <option value="Fase C (Kelas 5-6 SD)">Fase C (Kelas 5-6 SD)</option>
                <option value="Fase D (Kelas 7-9 SMP)">Fase D (Kelas 7-9 SMP)</option>
                <option value="Fase E (Kelas 10 SMA/SMK)">Fase E (Kelas 10 SMA/SMK)</option>
                <option value="Fase F (Kelas 11-12 SMA/SMK)">Fase F (Kelas 11-12 SMA/SMK)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kelas Spesifik</label>
              <input
                type="text"
                className="form-input"
                placeholder="Misal: 7, 8, atau 10-A"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mata Pelajaran</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Matematika, IPAS, Bahasa Indonesia"
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipe Asesmen</label>
              <select 
                className="form-select"
                value={tipeAsesmen}
                onChange={(e) => setTipeAsesmen(e.target.value as TipeAsesmen)}
              >
                <option value="Formatif (Diagnostik Awal)">Formatif (Diagnostik Awal Siswa)</option>
                <option value="Formatif (Proses Pembelajaran)">Formatif (Saat Proses Pembelajaran)</option>
                <option value="Sumatif (Tengah Semester / STS)">Sumatif Tengah Semester (STS)</option>
                <option value="Sumatif (Akhir Semester / SAS)">Sumatif Akhir Semester (SAS)</option>
                <option value="Sumatif (Akhir Fase / Ujian Sekolah)">Sumatif Akhir Fase / Kelulusan</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Alokasi Waktu</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: 80 Menit"
                value={alokasiWaktu}
                onChange={(e) => setAlokasiWaktu(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Sekolah (Kop Dokumen)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: SMP Negeri 1 Merdeka Belajar"
                value={namaSekolah}
                onChange={(e) => setNamaSekolah(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Guru Penyusun</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Fajar Hidayat, S.Pd."
                value={namaGuru}
                onChange={(e) => setNamaGuru(e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* Section 2: Konten Materi & TP */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <Award size={18} color="#0d9488" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              2. Capaian & Tujuan Pembelajaran (TP)
            </h2>
          </div>

          {/* Rekomendasi Topik & TP Otomatis sesuai Mapel & Kelas */}
          {suggestedTopicList.length > 0 && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: 14
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#2563eb" /> Rekomendasi Materi Pokok {mataPelajaran} (Kelas {kelas}) — Klik untuk memilih:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestedTopicList.map((sug, idx) => {
                  const isSelected = materiPokok === sug.topik;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMateriPokok(sug.topik);
                        setTujuanPembelajaranInput(sug.tujuanPembelajaran);
                      }}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        fontSize: 11.5,
                        padding: '5px 12px',
                        background: isSelected ? undefined : '#ffffff',
                        borderColor: isSelected ? undefined : '#93c5fd',
                        color: isSelected ? '#ffffff' : '#1e40af'
                      }}
                    >
                      {sug.topik}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick CP Chips from Kemendikbud Database */}
          {(() => {
            const matchingMapel = KURIKULUM_MERDEKA_DATABASE.find(m => 
              m.mataPelajaran.toLowerCase().includes(mataPelajaran.toLowerCase()) ||
              mataPelajaran.toLowerCase().includes(m.mataPelajaran.toLowerCase())
            );
            const matchingFase = matchingMapel?.faseList.find(f => f.fase === jenjangFase);
            const availableCPElemen = matchingFase?.elemenList || [];

            if (availableCPElemen.length === 0) return null;

            return (
              <div style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} /> Pilihan Capaian Pembelajaran (CP) Resmi Kemendikbudristek:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableCPElemen.map((el, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => {
                        setMateriPokok(el.materiPokok);
                        setTujuanPembelajaranInput(el.tujuanPembelajaran);
                        setKelas(el.contohKelas);
                      }}
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 11, padding: '5px 10px', background: '#ffffff' }}
                      title={`Klik untuk otomatis mengisi TP: ${el.tujuanPembelajaran}`}
                    >
                      <strong>{el.elemen}:</strong> {el.materiPokok}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="form-group">
            <label className="form-label">Materi Pokok / Topik Bahasan</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: Teorema Pythagoras dalam Pemecahan Masalah Nyata"
              value={materiPokok}
              onChange={(e) => setMateriPokok(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Tujuan Pembelajaran (TP) / Indikator</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Disarankan memuat kata kerja operasional</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Contoh: Peserta didik mampu menganalisis permasalahan sehari-hari dan merumuskan model penyelesaian secara kritis..."
              value={tujuanPembelajaranInput}
              onChange={(e) => setTujuanPembelajaranInput(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 3: Konfigurasi Soal & Level Kognitif */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <Sliders size={18} color="#059669" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              3. Komposisi Butir Asesmen & Level Kognitif
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            
            <div className="form-group">
              <label className="form-label">Pilihan Ganda (PG)</label>
              <select 
                className="form-select"
                value={jumlahPG}
                onChange={(e) => setJumlahPG(Number(e.target.value))}
              >
                <option value={3}>3 Butir Soal</option>
                <option value={5}>5 Butir Soal (Rekomendasi)</option>
                <option value={10}>10 Butir Soal</option>
                <option value={15}>15 Butir Soal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>PG Kompleks (AKM)</span>
                <span title="Model Benar/Salah berbasis stimulus data" style={{ cursor: 'pointer' }}><Info size={13} /></span>
              </label>
              <select 
                className="form-select"
                value={jumlahPGK}
                onChange={(e) => setJumlahPGK(Number(e.target.value))}
              >
                <option value={0}>Tidak ada</option>
                <option value={1}>1 Stimulus (3 Pernyataan)</option>
                <option value={2}>2 Stimulus (AKM Standar)</option>
                <option value={3}>3 Stimulus</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Uraian / Kasus HOTS</label>
              <select 
                className="form-select"
                value={jumlahUraian}
                onChange={(e) => setJumlahUraian(Number(e.target.value))}
              >
                <option value={0}>Tidak ada</option>
                <option value={1}>1 Soal Analisis</option>
                <option value={2}>2 Soal HOTS Berbobot</option>
                <option value={3}>3 Soal HOTS</option>
                <option value={5}>5 Soal Uraian Lengkap</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kedalaman Kognitif</label>
              <select 
                className="form-select"
                value={levelKognitif}
                onChange={(e) => setLevelKognitif(e.target.value as LevelKognitif)}
              >
                <option value="Campuran Berimbang">Campuran Berimbang (LOTS 20%, MOTS 50%, HOTS 30%)</option>
                <option value="HOTS (C4-C6)">Fokus HOTS (Analisis, Evaluasi & Kreasi)</option>
                <option value="MOTS (C3)">Fokus Penerapan (Aplikasi Konsep)</option>
                <option value="LOTS (C1-C2)">Fokus Pengetahuan Dasar (C1-C2)</option>
              </select>
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <input
              type="checkbox"
              id="rubrikCheck"
              checked={sertakanRubrik}
              onChange={(e) => setSertakanRubrik(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#4f46e5', cursor: 'pointer' }}
            />
            <label htmlFor="rubrikCheck" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
              Sertakan Rubrik Penilaian KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) 4 Tingkat Kategori
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: 15 }}
          >
            {isLoading ? (
              <>
                <Sparkles size={18} className="spin-animation" /> Merancang Asesmen dengan AI...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Buat Asesmen Sekarang ✨
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
