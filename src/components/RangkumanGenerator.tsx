import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  BookOpen, 
  Lightbulb, 
  Zap
} from 'lucide-react';
import type { JenjangFase } from '../types/assessment';
import type { RangkumanRequest, GayaRangkuman } from '../types/summary';
import { KURIKULUM_CATALOG, detectKategoriFromFase, getSuggestedTopics } from '../utils/kurikulumCatalog';
import type { JenjangKategori } from '../utils/kurikulumCatalog';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { jenjangToDefaultFase } from '../utils/schoolProfileStorage';

interface RangkumanGeneratorProps {
  onGenerate: (req: RangkumanRequest) => Promise<void>;
  isLoading: boolean;
  schoolProfile?: SchoolProfile;
  prefillData?: Partial<RangkumanRequest> | null;
}

const PRESET_RANGKUMAN = [
  {
    title: '🌿 Fotosintesis (SD Kelas 4)',
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    jenjangFase: 'Fase B (Kelas 3-4 SD)' as JenjangFase,
    kelas: '4',
    topik: 'Fotosintesis: Dapur Ajaib Tumbuhan Hijau',
    catatanKeinginan: 'Jelaskan dengan analogi koki yang sedang memasak di dapur, peran klorofil, dan mengapa fotosintesis penting bagi oksigen bumi.',
    gayaBahasa: 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)' as GayaRangkuman
  },
  {
    title: '❤️ Sistem Peredaran Darah (SMP Kelas 8)',
    mataPelajaran: 'IPA',
    jenjangFase: 'Fase D (Kelas 7-9 SMP)' as JenjangFase,
    kelas: '8',
    topik: 'Sistem Peredaran Darah Manusia dan Fungsi Jantung',
    catatanKeinginan: 'Bedakan peredaran darah besar dan kecil menggunakan analogi jalan tol dan kurir pengantar oksigen ke seluruh sel tubuh.',
    gayaBahasa: 'Struktur Ringkas & Poin Kunci (Infografis)' as GayaRangkuman
  },
  {
    title: '⚖️ Demokrasi & Hak Warga Negara (SMA Kelas 10)',
    mataPelajaran: 'Pendidikan Pancasila',
    jenjangFase: 'Fase E (Kelas 10 SMA/SMK)' as JenjangFase,
    kelas: '10',
    topik: 'Demokrasi Pancasila dan Perlindungan Hak Asasi Manusia',
    catatanKeinginan: 'Sertakan contoh kasus penerapan hak dan kewajiban siswa di lingkungan sekolah dan media sosial.',
    gayaBahasa: 'Analitis & Mendalam (Cocok SMA/SMK)' as GayaRangkuman
  },
  {
    title: '💻 Berpikir Komputasional (SMP Kelas 7)',
    mataPelajaran: 'Informatika',
    jenjangFase: 'Fase D (Kelas 7-9 SMP)' as JenjangFase,
    kelas: '7',
    topik: '4 Fondasi Berpikir Komputasional (BK)',
    catatanKeinginan: 'Jelaskan dekomposisi, pengenalan pola, abstraksi, dan algoritma dengan contoh merencanakan liburan sekolah.',
    gayaBahasa: 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)' as GayaRangkuman
  }
];

export const RangkumanGenerator: React.FC<RangkumanGeneratorProps> = ({
  onGenerate,
  isLoading,
  schoolProfile,
  prefillData,
}) => {
  const [selectedKategori, setSelectedKategori] = useState<JenjangKategori>('SD/MI');
  const [showMadrasahMapel, setShowMadrasahMapel] = useState(false);
  const [modeInput, setModeInput] = useState<'upload' | 'keinginan_user'>('keinginan_user');
  const [mataPelajaran, setMataPelajaran] = useState('IPAS (Ilmu Pengetahuan Alam dan Sosial)');
  const [jenjangFase, setJenjangFase] = useState<JenjangFase>('Fase B (Kelas 3-4 SD)');
  const [kelas, setKelas] = useState('4');
  const [topik, setTopik] = useState('Fotosintesis dan Rantai Makanan');
  const [catatanKeinginan, setCatatanKeinginan] = useState(
    'Buat rangkuman visual yang ramah anak, sertakan analogi koki dapur untuk proses fotosintesis, poin penting, fakta menakjubkan, dan kuis kilat.'
  );
  const [gayaBahasa, setGayaBahasa] = useState<GayaRangkuman>('Ceria & Analogi Sehari-hari (Cocok SD/SMP)');
  
  // Upload State
  const [teksUpload, setTeksUpload] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Helper: otomatis sesuaikan topik, arahan, dan gaya bahasa saat mapel/jenjang/kelas dipilih
  const syncSuggestedTopic = (targetMapel: string, targetFase: JenjangFase, targetKelas: string) => {
    const suggestions = getSuggestedTopics(targetMapel, targetFase, targetKelas);
    if (suggestions.length > 0) {
      setTopik(suggestions[0].topik);
      setCatatanKeinginan(suggestions[0].arahanRangkuman);
    }
    if (targetFase.includes('SMA') || targetFase.includes('SMK')) {
      setGayaBahasa('Analitis & Mendalam (Cocok SMA/SMK)');
    } else if (targetFase.includes('SMP')) {
      setGayaBahasa('Struktur Ringkas & Poin Kunci (Infografis)');
    } else {
      setGayaBahasa('Ceria & Analogi Sehari-hari (Cocok SD/SMP)');
    }
  };

  const suggestedTopicList = getSuggestedTopics(mataPelajaran, jenjangFase, kelas);

  useEffect(() => {
    if (prefillData) {
      setModeInput('keinginan_user');
      if (prefillData.mataPelajaran) setMataPelajaran(prefillData.mataPelajaran);
      if (prefillData.jenjangFase) {
        setJenjangFase(prefillData.jenjangFase);
        setSelectedKategori(detectKategoriFromFase(prefillData.jenjangFase, prefillData.mataPelajaran));
      }
      if (prefillData.kelas) setKelas(prefillData.kelas);
      if (prefillData.topik) setTopik(prefillData.topik);
      if (prefillData.catatanKeinginan) setCatatanKeinginan(prefillData.catatanKeinginan);
      return;
    }

    if (schoolProfile) {
      const targetFase = jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama);
      setSelectedKategori(schoolProfile.jenjang);
      setJenjangFase(targetFase);
      setKelas(schoolProfile.kelasUtama || '8');
      if (schoolProfile.mataPelajaranUtama) {
        setMataPelajaran(schoolProfile.mataPelajaranUtama);
        syncSuggestedTopic(schoolProfile.mataPelajaranUtama, targetFase, schoolProfile.kelasUtama || '8');
      }
    }
  }, [schoolProfile, prefillData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_BYTES) {
      alert('Ukuran file terlalu besar (maksimal 2 MB). Silakan unggah file catatan teks (.txt, .md, .csv) yang lebih ringkas.');
      e.target.value = '';
      return;
    }

    const lowerName = file.name.toLowerCase();
    const allowedExts = ['.txt', '.md', '.csv', '.json'];
    if (!allowedExts.some((ext) => lowerName.endsWith(ext))) {
      alert('Format file tidak didukung. Silakan unggah file teks murni (.txt, .md, .csv, atau .json).');
      e.target.value = '';
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setTeksUpload(content.slice(0, 150_000));
      // Auto-set title from filename
      setTopik(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsText(file);
  };

  const applyPreset = (preset: typeof PRESET_RANGKUMAN[0]) => {
    setModeInput('keinginan_user');
    setMataPelajaran(preset.mataPelajaran);
    setJenjangFase(preset.jenjangFase);
    setSelectedKategori(detectKategoriFromFase(preset.jenjangFase));
    setKelas(preset.kelas);
    setTopik(preset.topik);
    setCatatanKeinginan(preset.catatanKeinginan);
    setGayaBahasa(preset.gayaBahasa);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      modeInput,
      teksUpload: modeInput === 'upload' ? teksUpload : undefined,
      namaFile: modeInput === 'upload' ? uploadedFileName : undefined,
      topik: modeInput === 'keinginan_user' ? topik : (topik || uploadedFileName),
      catatanKeinginan: modeInput === 'keinginan_user' ? catatanKeinginan : undefined,
      mataPelajaran,
      jenjangFase,
      kelas,
      gayaBahasa,
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 30px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)',
        border: '1px solid #99f6e4'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-emerald">
                <Sparkles size={12} /> Generator Rangkuman & Lembar Belajar Visual
              </span>
              <span className="badge badge-indigo">
                Ekspor Gambar PNG + Word + PDF
              </span>
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Rangkum Materi Pembelajaran Menjadi Menarik & Mudah Dipahami Siswa
            </h1>
            <p style={{ color: '#475569', fontSize: 14, maxWidth: 650 }}>
              Ubah materi buku yang panjang atau ide topik Bapak/Ibu menjadi <strong>Lembar Rangkuman Visual (Cheat Sheet)</strong> dengan analogi nyata, peta konsep, fakta seru, dan kuis kilat!
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 18px', borderRadius: 'var(--radius-md)', border: '1px solid #99f6e4', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Format Hasil
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0d9488', marginTop: 4 }}>
              📸 Gambar WA • 📄 Word • 🖨️ PDF
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #ccfbf1' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#d97706" /> Contoh Ide Rangkuman Cepat:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_RANGKUMAN.map((p, idx) => (
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
        
        {/* Source Mode Toggle */}
        <div style={{ marginBottom: 28 }}>
          <label className="form-label" style={{ marginBottom: 10, fontSize: 14 }}>
            Pilih Sumber Materi yang Ingin Dirangkum:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <button
              type="button"
              onClick={() => setModeInput('keinginan_user')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: modeInput === 'keinginan_user' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                background: modeInput === 'keinginan_user' ? '#eff6ff' : '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Lightbulb size={24} color={modeInput === 'keinginan_user' ? '#2563eb' : '#64748b'} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Buat dari Topik & Keinginan Bapak/Ibu</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Cukup ketik judul topik & gaya yang diinginkan</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModeInput('upload')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: modeInput === 'upload' ? '2px solid #0d9488' : '1px solid var(--border-subtle)',
                background: modeInput === 'upload' ? '#f0fdfa' : '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={24} color={modeInput === 'upload' ? '#0d9488' : '#64748b'} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Unggah / Tempel Materi Panjang</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Upload file dokumen atau copas teks buku</div>
              </div>
            </button>
          </div>
        </div>

        {/* Section Identitas Kurikulum */}
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
                        syncSuggestedTopic(defaultMapel, firstKelas.fase, firstKelas.kelas);
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
                        syncSuggestedTopic(mataPelajaran, kl.fase, kl.kelas);
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
                      syncSuggestedTopic(mp, jenjangFase, kelas);
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
                        syncSuggestedTopic(mp, jenjangFase, kelas);
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
              <label className="form-label">Kelas</label>
              <input
                type="text"
                className="form-input"
                placeholder="Misal: 4, 7, atau 10"
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
                placeholder="Contoh: IPAS, Bahasa Indonesia, Matematika"
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gaya Bahasa Rangkuman</label>
              <select 
                className="form-select"
                value={gayaBahasa}
                onChange={(e) => setGayaBahasa(e.target.value as GayaRangkuman)}
              >
                <option value="Ceria & Analogi Sehari-hari (Cocok SD/SMP)">Ceria & Analogi Sehari-hari (Cocok SD/SMP)</option>
                <option value="Struktur Ringkas & Poin Kunci (Infografis)">Struktur Ringkas & Poin Kunci (Infografis)</option>
                <option value="Analitis & Mendalam (Cocok SMA/SMK)">Analitis & Mendalam (Cocok SMA/SMK)</option>
                <option value="Tanya-Jawab & Rumus Praktis">Tanya-Jawab & Rumus Praktis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section Konten Berdasarkan Mode */}
        {modeInput === 'keinginan_user' ? (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <Lightbulb size={18} color="#d97706" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                2. Topik & Arahan Rangkuman yang Diinginkan
              </h2>
            </div>

            {/* Rekomendasi Topik Otomatis sesuai Mapel & Kelas */}
            {suggestedTopicList.length > 0 && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="#d97706" /> Rekomendasi Topik {mataPelajaran} (Kelas {kelas}) — Klik untuk memilih:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggestedTopicList.map((sug, idx) => {
                    const isSelected = topik === sug.topik;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTopik(sug.topik);
                          setCatatanKeinginan(sug.arahanRangkuman);
                        }}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                        style={{
                          fontSize: 11.5,
                          padding: '5px 12px',
                          background: isSelected ? undefined : '#ffffff',
                          borderColor: isSelected ? undefined : '#fcd34d',
                          color: isSelected ? '#ffffff' : '#92400e'
                        }}
                      >
                        {sug.topik}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Topik Utama Pembelajaran</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Ekosistem dan Rantai Makanan Sawah"
                value={topik}
                onChange={(e) => setTopik(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Catatan / Keinginan Khusus Bapak/Ibu Guru</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opsional: minta analogi, studi kasus, atau fokus bab</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Contoh: Buatkan analogi rantai makanan seperti aliran pesanan di restoran, tekankan peran pengurai, dan berikan 2 fakta unik..."
                value={catatanKeinginan}
                onChange={(e) => setCatatanKeinginan(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <Upload size={18} color="#0d9488" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                2. Unggah atau Tempel Teks Materi
              </h2>
            </div>

            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'center',
              background: '#f8fafc',
              marginBottom: 16
            }}>
              <input
                type="file"
                id="fileMateri"
                accept=".txt,.md,.doc,.docx,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="fileMateri" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#ccfbf1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <Upload size={22} color="#0d9488" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  {uploadedFileName ? `File Terpilih: ${uploadedFileName}` : 'Klik untuk Unggah File Materi (.txt, .md)'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Atau Bapak/Ibu juga dapat langsung menempelkan teks materi di kotak bawah
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Teks Materi Asli (Bisa Langsung Copy-Paste dari Buku/Modul)</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Tempel teks materi lengkap di sini (misal 1-5 halaman materi modul)... AI akan mengekstrak poin penting dan merangkumnya secara visual dan terstruktur."
                value={teksUpload}
                onChange={(e) => setTeksUpload(e.target.value)}
                required={modeInput === 'upload'}
              />
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            disabled={isLoading || (modeInput === 'upload' && !teksUpload.trim())}
            className="btn btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: 15,
              background: 'linear-gradient(135deg, #0d9488 0%, #4f46e5 100%)'
            }}
          >
            {isLoading ? (
              <>
                <Sparkles size={18} className="spin-animation" /> Meracik Rangkuman Cerdas AI...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Rangkum Menjadi Lembar Belajar Menarik ✨
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
