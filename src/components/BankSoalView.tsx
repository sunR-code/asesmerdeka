import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderOpen, 
  Search, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Download, 
  Calendar, 
  BookOpen, 
  Sparkles,
  FileDown
} from 'lucide-react';
import type { AsesmenDokumen } from '../types/assessment';
import { downloadJsonAssessment } from '../utils/bankSoalStorage';
import { exportToDocx } from '../utils/docxExporter';

interface BankSoalViewProps {
  bankList: AsesmenDokumen[];
  onSelectAssessment: (doc: AsesmenDokumen, targetTab: 'worksheet' | 'teacher_guide') => void;
  onDeleteAssessment: (id: string) => void;
  onGoToGenerator: () => void;
}

export const BankSoalView: React.FC<BankSoalViewProps> = ({
  bankList,
  onSelectAssessment,
  onDeleteAssessment,
  onGoToGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'formatif' | 'sumatif'>('all');

  const filteredList = bankList.filter((item) => {
    const matchesSearch = 
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mataPelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materiPokok.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'formatif') {
      return item.tipeAsesmen.toLowerCase().includes('formatif');
    }
    if (filterType === 'sumatif') {
      return item.tipeAsesmen.toLowerCase().includes('sumatif');
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
      
      {/* Header Bar */}
      <div className="v21-bento-card" style={{
        padding: '24px 30px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="badge badge-indigo">
              <FolderOpen size={12} /> Bank Dokumen Guru
            </span>
            <span className="badge badge-emerald">
              {bankList.length} Asesmen Tersimpan
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
            Bank Asesmen & Arsip Kurikulum Merdeka
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Akses kembali seluruh modul asesmen, lembar siswa, dan rubrik KKTP yang pernah Anda rancang.
          </p>
        </div>

        <button onClick={onGoToGenerator} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          <Sparkles size={16} /> Buat Asesmen Baru
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          maxWidth: 400,
          width: '100%'
        }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: 12 }} />
          <input
            type="text"
            className="form-input"
            placeholder="Cari materi, mapel, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFilterType('all')}
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            Semua ({bankList.length})
          </button>
          <button
            onClick={() => setFilterType('formatif')}
            className={`btn btn-sm ${filterType === 'formatif' ? 'btn-primary' : 'btn-outline'}`}
          >
            Formatif
          </button>
          <button
            onClick={() => setFilterType('sumatif')}
            className={`btn btn-sm ${filterType === 'sumatif' ? 'btn-primary' : 'btn-outline'}`}
          >
            Sumatif
          </button>
        </div>
      </div>

      {/* Grid List */}
      {filteredList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
            {bankList.length === 0 ? 'Belum Ada Asesmen di Bank Soal' : 'Tidak Ada Asesmen yang Cocok dengan Pencarian'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 450, margin: '0 auto 20px' }}>
            {bankList.length === 0 
              ? 'Seluruh asesmen yang Anda buat otomatis tersimpan di sini sehingga Anda tidak perlu khawatir kehilangan data saat menutup browser.'
              : 'Coba ubah kata kunci pencarian atau reset filter di atas.'}
          </p>
          {bankList.length === 0 && (
            <button onClick={onGoToGenerator} className="btn btn-primary">
              <Sparkles size={16} /> Rancang Asesmen Pertama Sekarang
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18
        }}>
          {filteredList.map((doc) => {
            const countPG = doc.soalList.filter(s => s.tipe === 'pilihan_ganda').length;
            const countPGK = doc.soalList.filter(s => s.tipe === 'pilihan_ganda_kompleks').length;
            const countUraian = doc.soalList.filter(s => s.tipe === 'uraian').length;
            const isFormatif = doc.tipeAsesmen.toLowerCase().includes('formatif');

            return (
              <motion.div 
                key={doc.id}
                whileHover={{ y: -3 }}
                className="v21-bento-card"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(226, 232, 240, 0.85)',
                  cursor: 'default'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className={`badge ${isFormatif ? 'badge-amber' : 'badge-indigo'}`} style={{ fontSize: 11 }}>
                      {doc.tipeAsesmen.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {doc.createdAt}
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, lineHeight: 1.4 }}>
                    {doc.judul}
                  </h3>
                  
                  <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>
                    {doc.mataPelajaran} • Kelas {doc.kelas} ({doc.jenjangFase.split(' ')[0]})
                  </div>

                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginBottom: 14,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    Materi: {doc.materiPokok}
                  </p>

                  {/* Question Composition Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {countPG > 0 && (
                      <span style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {countPG} PG
                      </span>
                    )}
                    {countPGK > 0 && (
                      <span style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {countPGK} AKM
                      </span>
                    )}
                    {countUraian > 0 && (
                      <span style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {countUraian} Uraian
                      </span>
                    )}
                    {doc.rubrikKKTP.length > 0 && (
                      <span style={{ fontSize: 11, background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        Rubrik KKTP
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => onSelectAssessment(doc, 'worksheet')}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      title="Buka Lembar Siswa"
                    >
                      <Eye size={13} /> Lembar Siswa
                    </button>
                    <button
                      onClick={() => onSelectAssessment(doc, 'teacher_guide')}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      title="Buka Kunci Jawaban & Rubrik"
                    >
                      <CheckCircle2 size={13} /> Kunci & Rubrik
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => exportToDocx(doc, true)}
                      className="btn btn-sm btn-outline"
                      style={{ padding: '6px 8px', color: '#2563eb' }}
                      title="Unduh File Word (.docx) Lengkap"
                    >
                      <FileDown size={13} />
                    </button>
                    <button
                      onClick={() => downloadJsonAssessment(doc)}
                      className="btn btn-sm btn-outline"
                      style={{ padding: '6px 8px' }}
                      title="Unduh Cadangan JSON"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus asesmen "${doc.judul}" dari Bank Soal?`)) {
                          onDeleteAssessment(doc.id);
                        }
                      }}
                      className="btn btn-sm btn-outline"
                      style={{ padding: '6px 8px', color: '#dc2626' }}
                      title="Hapus Asesmen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
};
