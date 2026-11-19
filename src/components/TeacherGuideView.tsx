import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Compass,
  FileText,
  HelpCircle,
  Info,
  List,
  Printer,
  Search,
  Sparkles,
  Type,
  X,
} from 'lucide-react';
import {
  GUIDE_QUICK_INTENTS,
  TEACHER_GUIDE_CHAPTERS,
  type GuideChapter,
} from '../data/teacherGuideCatalog';
import { BrandLogo } from './BrandLogo';

export interface TeacherGuideViewProps {
  onBackToApp: () => void;
  initialChapterId?: string;
}

export const TeacherGuideView: React.FC<TeacherGuideViewProps> = ({
  onBackToApp,
  initialChapterId,
}) => {
  const [activeChapterId, setActiveChapterId] = useState<string>(() => {
    if (initialChapterId && TEACHER_GUIDE_CHAPTERS.some((c) => c.id === initialChapterId)) {
      return initialChapterId;
    }
    return TEACHER_GUIDE_CHAPTERS[0].id;
  });
  const [showAllChapters, setShowAllChapters] = useState<boolean>(false);
  const [isLargeFont, setIsLargeFont] = useState<boolean>(false);
  const [isMobileChapterDrawerOpen, setIsMobileChapterDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const bodyFontSize = isLargeFont ? 18 : 16;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileChapterDrawerOpen) {
        setIsMobileChapterDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileChapterDrawerOpen]);

  const activeChapterIndex = useMemo(() => {
    const idx = TEACHER_GUIDE_CHAPTERS.findIndex((c) => c.id === activeChapterId);
    return idx >= 0 ? idx : 0;
  }, [activeChapterId]);

  const activeChapter = TEACHER_GUIDE_CHAPTERS[activeChapterIndex];
  const prevChapter = activeChapterIndex > 0 ? TEACHER_GUIDE_CHAPTERS[activeChapterIndex - 1] : null;
  const nextChapter =
    activeChapterIndex < TEACHER_GUIDE_CHAPTERS.length - 1
      ? TEACHER_GUIDE_CHAPTERS[activeChapterIndex + 1]
      : null;

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TEACHER_GUIDE_CHAPTERS;
    return TEACHER_GUIDE_CHAPTERS.filter((ch) => {
      const hay = [
        ch.codeLabel,
        ch.category,
        ch.shortTitle,
        ch.fullTitle,
        ch.subtitle,
        ch.tujuan,
        ch.kapanDigunakan,
        ...ch.persiapan,
        ...ch.langkahLangkah.map((s) => `${s.action} ${s.detail}`),
        ...ch.hasilDiharapkan,
        ...ch.kesalahanUmum.map((m) => `${m.mistake} ${m.solution}`),
        ...ch.faqs.map((f) => `${f.question} ${f.answer}`),
        ...ch.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery]);

  const displayedChapters: GuideChapter[] = useMemo(() => {
    if (searchQuery.trim()) return filteredChapters;
    if (showAllChapters) return TEACHER_GUIDE_CHAPTERS;
    return [activeChapter];
  }, [searchQuery, filteredChapters, showAllChapters, activeChapter]);

  const handleSelectChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setShowAllChapters(false);
    setSearchQuery('');
    setIsMobileChapterDrawerOpen(false);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // ignore in SSR/test
      }
    }
  };

  const handlePrintGuide = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <div
      data-testid="teacher-guide-view"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'var(--font-family)',
        fontSize: bodyFontSize,
        lineHeight: 1.72,
      }}
    >
      {/* Top Sticky Navbar Panduan */}
      <header
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #cbd5e1',
          padding: '10px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onBackToApp}
              className="btn btn-outline"
              style={{
                minHeight: 44,
                padding: '8px 14px',
                fontSize: 14,
                fontWeight: 700,
                borderColor: '#93c5fd',
                background: '#eff6ff',
                color: '#1e40af',
                whiteSpace: 'normal',
              }}
            >
              <ArrowLeft size={17} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>Kembali ke Aplikasi</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <BrandLogo size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Panduan Praktis Guru AsesMerdeka
                </div>
                {/* Breadcrumb jelas */}
                <nav
                  aria-label="Breadcrumb panduan"
                  style={{ fontSize: 12.5, color: '#475569', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
                >
                  <span>Aplikasi</span>
                  <span aria-hidden="true">/</span>
                  <span>Panduan Guru</span>
                  <span aria-hidden="true">/</span>
                  <strong style={{ color: '#1e40af' }}>
                    {showAllChapters
                      ? 'Semua Bagian (1–8)'
                      : `${activeChapter.codeLabel}: ${activeChapter.shortTitle}`}
                  </strong>
                </nav>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsLargeFont((v) => !v)}
              className="btn btn-outline"
              aria-pressed={isLargeFont}
              style={{
                minHeight: 44,
                padding: '8px 14px',
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: 'normal',
                background: isLargeFont ? '#f0fdf4' : '#ffffff',
                borderColor: isLargeFont ? '#86efac' : '#cbd5e1',
                color: isLargeFont ? '#166534' : '#1e293b',
              }}
            >
              <Type size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>{isLargeFont ? 'Ukuran Tulisan: Besar (18px)' : 'Ukuran Tulisan: 16px / 18px'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintGuide}
              className="btn btn-primary"
              style={{
                minHeight: 44,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 800,
                whiteSpace: 'normal',
              }}
            >
              <Printer size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div
        className="teacher-guide-print-area"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 16px 72px' }}
      >
        {/* Hero Card */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1e40af 100%)',
            color: '#ffffff',
            borderRadius: 18,
            padding: 'clamp(22px, 3vw, 34px)',
            marginBottom: 24,
            boxShadow: '0 14px 32px -8px rgba(15, 23, 42, 0.24)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>Panduan Langkah Demi Langkah Sesuai Urutan Kerja Guru</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 3.6vw, 36px)',
              fontWeight: 800,
              lineHeight: 1.22,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Buku Panduan Praktis Penggunaan AsesMerdeka
          </h1>

          <p
            style={{
              fontSize: bodyFontSize,
              lineHeight: 1.65,
              color: '#e2e8f0',
              maxWidth: 820,
              margin: 0,
            }}
          >
            Disusun dengan bahasa sederhana dan satu langkah untuk satu tindakan. Bapak/Ibu dapat langsung memilih tujuan pekerjaan di bawah ini atau mengikuti Bagian 1 sampai Bagian 8 secara berurutan.
          </p>
        </section>

        {/* Jalur Cepat "Saya ingin..." + Pencarian Sederhana */}
        <section
          aria-labelledby="quick-intents-heading"
          className="no-print"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 16,
            padding: '22px 20px',
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                id="quick-intents-heading"
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Compass size={22} color="#1e40af" aria-hidden="true" />
                <span>Saya ingin...</span>
              </h2>
              <p style={{ fontSize: 15, color: '#475569', margin: '4px 0 0' }}>
                Klik salah satu kebutuhan di bawah untuk langsung membuka panduan langkah demi langkahnya:
              </p>
            </div>

            {/* Pencarian Sederhana */}
            <div style={{ minWidth: 'min(100%, 280px)', flex: '0 1 320px', position: 'relative' }}>
              <label htmlFor="guide-search-input" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Cari Topik Panduan
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={16}
                    color="#64748b"
                    style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
                    aria-hidden="true"
                  />
                  <input
                    id="guide-search-input"
                    type="search"
                    className="form-input"
                    placeholder="Contoh: ATP, Modul Ajar, KKTP, Backup..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 34,
                      minHeight: 44,
                      fontSize: 15,
                      borderColor: '#94a3b8',
                    }}
                  />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="btn btn-outline"
                    style={{ minHeight: 44, padding: '8px 12px', fontSize: 13 }}
                    aria-label="Hapus pencarian panduan"
                  >
                    <X size={15} aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))',
              gap: 12,
            }}
          >
            {GUIDE_QUICK_INTENTS.map((item) => {
              const isTargetActive = !showAllChapters && activeChapterId === item.targetChapterId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectChapter(item.targetChapterId)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: isTargetActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isTargetActive ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                    minHeight: 44,
                    transition: 'border-color 140ms ease, background-color 140ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.35, marginBottom: 4 }}>
                      {item.intent}
                    </div>
                    <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                      {item.summary}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
                    Lokasi: {item.whereToClick} →
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Kartu Kategori & Daftar Isi Klik Langsung */}
        <section
          aria-labelledby="toc-cards-heading"
          className="no-print"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <h2 id="toc-cards-heading" style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Daftar Isi Panduan (Bagian 1 – Bagian 8)
              </h2>
              <p style={{ fontSize: 14.5, color: '#475569', margin: '3px 0 0' }}>
                Pilih bagian yang dibutuhkan sesuai tahapan pekerjaan Bapak/Ibu hari ini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowAllChapters((v) => !v);
              }}
              className="btn btn-outline"
              style={{
                minHeight: 44,
                padding: '8px 14px',
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: 'normal',
              }}
            >
              <List size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>{showAllChapters ? 'Fokus 1 Bagian Saja' : 'Tampilkan Semua Bagian (1–8)'}</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))',
              gap: 10,
            }}
          >
            {TEACHER_GUIDE_CHAPTERS.map((ch) => {
              const isSelected = !showAllChapters && !searchQuery.trim() && activeChapterId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelectChapter(ch.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 11,
                    border: isSelected ? '2px solid #1e40af' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    minHeight: 44,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: isSelected ? '#ffffff' : '#1e40af',
                        background: isSelected ? '#1e40af' : '#dbeafe',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      {ch.codeLabel}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                      {ch.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {ch.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mobile Collapsible Chapter Drawer */}
        <div className="teacher-guide-mobile-drawer-wrap no-print" style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setIsMobileChapterDrawerOpen((v) => !v)}
            aria-expanded={isMobileChapterDrawerOpen}
            className="btn btn-outline"
            style={{
              width: '100%',
              minHeight: 48,
              justifyContent: 'space-between',
              padding: '12px 16px',
              fontSize: 15,
              fontWeight: 800,
              background: '#ffffff',
              borderColor: '#93c5fd',
              color: '#0f172a',
              whiteSpace: 'normal',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <List size={18} color="#1e40af" style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>
                Navigasi Bab: {activeChapter.codeLabel} — {activeChapter.shortTitle}
              </span>
            </span>
            {isMobileChapterDrawerOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>

          {isMobileChapterDrawerOpen && (
            <nav
              aria-label="Daftar bab panduan mobile"
              style={{
                marginTop: 8,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {TEACHER_GUIDE_CHAPTERS.map((ch) => {
                const active = activeChapterId === ch.id && !showAllChapters;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChapter(ch.id)}
                    style={{
                      width: '100%',
                      minHeight: 46,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: active ? '#eff6ff' : '#f8fafc',
                      color: active ? '#1e3a8a' : '#0f172a',
                      textAlign: 'left',
                      fontSize: 15,
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ch.codeLabel} — {ch.shortTitle}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Layout 2 Kolom Desktop (Sidebar Sticky + Konten Utama) */}
        <div className="teacher-guide-layout">
          <aside
            className="teacher-guide-sidebar no-print"
            aria-label="Daftar bab panduan"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 14,
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#475569',
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              Daftar Bab (8 Bagian)
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEACHER_GUIDE_CHAPTERS.map((ch) => {
                const active = !showAllChapters && !searchQuery.trim() && activeChapterId === ch.id;
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectChapter(ch.id)}
                      aria-current={active ? 'step' : undefined}
                      style={{
                        width: '100%',
                        minHeight: 46,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: active ? '2px solid #2563eb' : '1px solid transparent',
                        background: active ? '#eff6ff' : 'transparent',
                        color: active ? '#1e3a8a' : '#1e293b',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: active ? '#2563eb' : '#f1f5f9',
                          color: active ? '#ffffff' : '#334155',
                          fontSize: 13,
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {ch.number}
                      </span>
                      <span style={{ fontSize: 14.5, fontWeight: active ? 800 : 600, lineHeight: 1.4 }}>
                        {ch.shortTitle}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Konten Utama Artikel Panduan */}
          <main style={{ minWidth: 0 }}>
            {displayedChapters.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 16,
                  padding: 28,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                  Topik "{searchQuery}" tidak ditemukan di daftar panduan.
                </p>
                <p style={{ fontSize: 15, color: '#475569', margin: '0 0 16px' }}>
                  Coba kata kunci lain seperti: Profil, Semester, CP, ATP, Modul Ajar, Presensi, Nilai, KKTP, Supervisi, atau Backup.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn btn-primary"
                  style={{ minHeight: 44 }}
                >
                  Tampilkan Kembali Panduan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {displayedChapters.map((chapter) => (
                  <article
                    key={chapter.id}
                    id={chapter.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 18,
                      padding: 'clamp(20px, 3vw, 32px)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Header Bab */}
                    <div
                      style={{
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: 18,
                        marginBottom: 22,
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: 99,
                            background: '#1e40af',
                            color: '#ffffff',
                          }}
                        >
                          {chapter.codeLabel}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 99,
                            background: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          {chapter.category}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 99,
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          {chapter.estimatedTime}
                        </span>
                      </div>

                      <h2
                        style={{
                          fontSize: 'clamp(24px, 3vw, 30px)',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.28,
                          margin: '0 0 8px',
                        }}
                      >
                        {chapter.fullTitle}
                      </h2>

                      <p style={{ fontSize: bodyFontSize, color: '#334155', margin: '0 0 12px', lineHeight: 1.65 }}>
                        {chapter.subtitle}
                      </p>

                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 10,
                          padding: '10px 14px',
                          fontSize: 14.5,
                          color: '#1e293b',
                        }}
                      >
                        <strong>Letak di Aplikasi:</strong> {chapter.uiLocationHint}
                      </div>
                    </div>

                    {/* Referensi Tombol Nyata UI jika ada */}
                    {chapter.uiButtonPills && chapter.uiButtonPills.length > 0 && (
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '14px 16px',
                          marginBottom: 22,
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                          Tombol Asli di Layar Aplikasi:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {chapter.uiButtonPills.map((btn) => (
                            <div
                              key={btn.label}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: 10,
                                padding: '6px 10px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: 7,
                                  background:
                                    btn.tone === 'primary'
                                      ? '#2563eb'
                                      : btn.tone === 'success'
                                        ? '#059669'
                                        : '#f1f5f9',
                                  color: btn.tone === 'outline' ? '#0f172a' : '#ffffff',
                                  border: btn.tone === 'outline' ? '1px solid #94a3b8' : 'none',
                                }}
                              >
                                {btn.label}
                              </span>
                              <span style={{ fontSize: 13.5, color: '#334155' }}>{btn.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Struktur Konsisten 7 Bagian */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                      {/* 1. Tujuan */}
                      <section aria-label="1. Tujuan">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e3a8a', margin: '0 0 6px' }}>
                          1. Tujuan
                        </h3>
                        <p style={{ fontSize: bodyFontSize, color: '#1e293b', margin: 0 }}>
                          {chapter.tujuan}
                        </p>
                      </section>

                      {/* 2. Kapan digunakan? */}
                      <section aria-label="2. Kapan digunakan?">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e3a8a', margin: '0 0 6px' }}>
                          2. Kapan digunakan?
                        </h3>
                        <p style={{ fontSize: bodyFontSize, color: '#1e293b', margin: 0 }}>
                          {chapter.kapanDigunakan}
                        </p>
                      </section>

                      {/* 3. Persiapan */}
                      <section aria-label="3. Persiapan">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e3a8a', margin: '0 0 8px' }}>
                          3. Persiapan
                        </h3>
                        <ul style={{ margin: '0 0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {chapter.persiapan.map((prep, idx) => (
                            <li key={idx} style={{ fontSize: bodyFontSize, color: '#1e293b' }}>
                              {prep}
                            </li>
                          ))}
                        </ul>
                      </section>

                      {/* Callout Penting bila ada */}
                      {chapter.importantCallout && (
                        <div
                          style={{
                            borderRadius: 12,
                            padding: '16px 18px',
                            background:
                              chapter.importantCallout.tone === 'warning'
                                ? '#fffbeb'
                                : chapter.importantCallout.tone === 'success'
                                  ? '#ecfdf5'
                                  : '#eff6ff',
                            borderLeft: `5px solid ${
                              chapter.importantCallout.tone === 'warning'
                                ? '#d97706'
                                : chapter.importantCallout.tone === 'success'
                                  ? '#059669'
                                  : '#2563eb'
                            }`,
                            color: '#0f172a',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          {chapter.importantCallout.tone === 'warning' ? (
                            <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />
                          ) : (
                            <Info size={20} color="#1e40af" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />
                          )}
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                              Catatan Penting: {chapter.importantCallout.title}
                            </div>
                            <p style={{ fontSize: bodyFontSize, margin: 0, color: '#1e293b' }}>
                              {chapter.importantCallout.body}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 4. Langkah-langkah */}
                      <section aria-label="4. Langkah-langkah">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e3a8a', margin: '0 0 12px' }}>
                          4. Langkah-langkah
                        </h3>
                        <ol
                          style={{
                            listStyle: 'none',
                            margin: 0,
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {chapter.langkahLangkah.map((step, idx) => (
                            <li
                              key={idx}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: 12,
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                              }}
                            >
                              <span
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  background: '#1e40af',
                                  color: '#ffffff',
                                  fontSize: 14,
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              >
                                {idx + 1}
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: bodyFontSize, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                                  {step.action}
                                </div>
                                <div style={{ fontSize: bodyFontSize, color: '#334155', lineHeight: 1.65 }}>
                                  {step.detail}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>

                      {/* Tabel Perbandingan (misal Bagian 2 & Bagian 3) */}
                      {chapter.comparisonTable && (
                        <section
                          aria-label={chapter.comparisonTable.title}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 12,
                            padding: '16px',
                          }}
                        >
                          <h4 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                            {chapter.comparisonTable.title}
                          </h4>
                          <p style={{ fontSize: 14.5, color: '#475569', margin: '0 0 12px' }}>
                            {chapter.comparisonTable.caption}
                          </p>
                          <div className="ws-table-wrap">
                            <table className="ws-table" style={{ fontSize: 14.5 }}>
                              <thead>
                                <tr>
                                  {chapter.comparisonTable.columns.map((col) => (
                                    <th key={col} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13.5 }}>
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {chapter.comparisonTable.rows.map((row) => (
                                  <tr key={row.term}>
                                    <td style={{ fontWeight: 800, color: '#1e3a8a', padding: '10px 12px', verticalAlign: 'top' }}>
                                      {row.term}
                                    </td>
                                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{row.meaning}</td>
                                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{row.simpleExample}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}

                      {/* Tabel Contoh Simulasi Berlabel Jelas (Bagian 6) */}
                      {chapter.simulationExampleTable && (
                        <section
                          aria-label={chapter.simulationExampleTable.title}
                          style={{
                            background: '#fffbeb',
                            border: '1px solid #fcd34d',
                            borderRadius: 12,
                            padding: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #f59e0b',
                                padding: '2px 10px',
                                borderRadius: 99,
                              }}
                            >
                              {chapter.simulationExampleTable.badgeLabel}
                            </span>
                            <h4 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                              {chapter.simulationExampleTable.title}
                            </h4>
                          </div>
                          <p style={{ fontSize: 14.5, color: '#475569', margin: '0 0 12px' }}>
                            {chapter.simulationExampleTable.description}
                          </p>
                          <div className="ws-table-wrap">
                            <table className="ws-table" style={{ fontSize: 14 }}>
                              <thead>
                                <tr>
                                  {chapter.simulationExampleTable.headers.map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 13 }}>
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {chapter.simulationExampleTable.rows.map((cells, rIdx) => (
                                  <tr key={rIdx}>
                                    {cells.map((cell, cIdx) => (
                                      <td
                                        key={cIdx}
                                        style={{
                                          padding: '9px 10px',
                                          fontWeight: cIdx === 0 || cIdx === cells.length - 1 ? 700 : 400,
                                        }}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}

                      {/* 5. Hasil yang diharapkan */}
                      <section aria-label="5. Hasil yang diharapkan">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#065f46', margin: '0 0 8px' }}>
                          5. Hasil yang diharapkan
                        </h3>
                        <div
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          {chapter.hasilDiharapkan.map((res, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: 4 }} aria-hidden="true" />
                              <span style={{ fontSize: bodyFontSize, color: '#064e3b' }}>{res}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* 6. Kesalahan umum */}
                      <section aria-label="6. Kesalahan umum">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#9a3412', margin: '0 0 10px' }}>
                          6. Kesalahan umum
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {chapter.kesalahanUmum.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: 12,
                                padding: '14px 16px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: bodyFontSize, fontWeight: 800, color: '#9a3412', marginBottom: 4 }}>
                                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 4 }} aria-hidden="true" />
                                <span>Kendala: {item.mistake}</span>
                              </div>
                              <div style={{ fontSize: bodyFontSize, color: '#1e293b', paddingLeft: 26 }}>
                                <strong>Solusi:</strong> {item.solution}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* 7. Langkah selanjutnya */}
                      <section aria-label="7. Langkah selanjutnya">
                        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e3a8a', margin: '0 0 8px' }}>
                          7. Langkah selanjutnya
                        </h3>
                        <div
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <p style={{ fontSize: bodyFontSize, color: '#1e293b', margin: 0 }}>
                            {chapter.langkahSelanjutnya.text}
                          </p>
                          {chapter.langkahSelanjutnya.nextChapterId && (
                            <div className="no-print">
                              <button
                                type="button"
                                onClick={() => handleSelectChapter(chapter.langkahSelanjutnya.nextChapterId!)}
                                className="btn btn-primary"
                                style={{
                                  minHeight: 44,
                                  fontSize: 14.5,
                                  fontWeight: 700,
                                  whiteSpace: 'normal',
                                  textAlign: 'left',
                                }}
                              >
                                <Sparkles size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                                <span>Lanjut ke {chapter.langkahSelanjutnya.nextChapterTitle}</span>
                                <ArrowRight size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* FAQ Topik */}
                      {chapter.faqs.length > 0 && (
                        <section
                          aria-label={`Tanya Jawab ${chapter.codeLabel}`}
                          style={{
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: 18,
                          }}
                        >
                          <h3
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: '#0f172a',
                              margin: '0 0 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <HelpCircle size={18} color="#1e40af" aria-hidden="true" />
                            <span>Tanya Jawab (FAQ) — {chapter.shortTitle}</span>
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {chapter.faqs.map((faq, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 11,
                                  padding: '14px 16px',
                                }}
                              >
                                <div style={{ fontSize: bodyFontSize, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                                  Tanya: {faq.question}
                                </div>
                                <div style={{ fontSize: bodyFontSize, color: '#334155' }}>
                                  <strong>Jawab:</strong> {faq.answer}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Navigasi Artikel Sebelumnya / Selanjutnya */}
            {!showAllChapters && !searchQuery.trim() && (
              <nav
                aria-label="Navigasi antar bagian panduan"
                className="no-print"
                style={{
                  marginTop: 22,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                  gap: 12,
                }}
              >
                {prevChapter ? (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(prevChapter.id)}
                    className="btn btn-outline"
                    style={{
                      minHeight: 54,
                      padding: '12px 16px',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      background: '#ffffff',
                      borderColor: '#cbd5e1',
                    }}
                  >
                    <ArrowLeft size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                        Bagian Sebelumnya
                      </div>
                      <div style={{ fontSize: 14.5, color: '#0f172a', fontWeight: 800 }}>
                        {prevChapter.codeLabel}: {prevChapter.shortTitle}
                      </div>
                    </div>
                  </button>
                ) : (
                  <div />
                )}

                {nextChapter ? (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(nextChapter.id)}
                    className="btn btn-primary"
                    style={{
                      minHeight: 54,
                      padding: '12px 16px',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#dbeafe', fontWeight: 700 }}>
                        Bagian Selanjutnya
                      </div>
                      <div style={{ fontSize: 14.5, color: '#ffffff', fontWeight: 800 }}>
                        {nextChapter.codeLabel}: {nextChapter.shortTitle}
                      </div>
                    </div>
                    <ArrowRight size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onBackToApp}
                    className="btn btn-success"
                    style={{
                      minHeight: 54,
                      padding: '12px 16px',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#d1fae5', fontWeight: 700 }}>
                        Selesai Membaca Panduan
                      </div>
                      <div style={{ fontSize: 14.5, color: '#ffffff', fontWeight: 800 }}>
                        Kembali ke Aplikasi AsesMerdeka
                      </div>
                    </div>
                    <FileText size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
                  </button>
                )}
              </nav>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default TeacherGuideView;
