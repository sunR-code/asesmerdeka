import type { JenjangFase } from '../types/assessment';
import type { CPReferenceMeta } from '../utils/schoolProfileStorage';

export const OFFICIAL_CP_REFERENCES = {
  PPA_REVISI_2025_URL: 'https://repositori.kemendikdasmen.go.id/33290/',
  KURIKULUM_DIRECTORY_URL: 'https://kurikulum.kemendikdasmen.go.id/',
  PANDUAN_MAPEL_URL: 'https://kurikulum.kemendikdasmen.go.id/panduan-mapel',
  SK_BSKAP_046_2025_URL:
    'https://bpmpbabel.kemendikdasmen.go.id/PPID/wp-content/uploads/2025/07/KepKaBSKAP-046_2025-ttg-CP.pdf',
  BKPDM_020_PRESS_RELEASE_URL:
    'https://www.kemendikdasmen.go.id/siaran-pers/15636-capaian-pembelajaran-baru-telah-terbit-yang-berubah-hanya-mata-pelajaran-agama-dan-budi-pekerti',
} as const;

export type CPRegulationPresetId =
  | 'bskap_046_2025'
  | 'bkpdm_020_2026'
  | 'bkpdm_021_2026'
  | 'kma_madrasah'
  | 'input_guru_sekolah';

export interface CPRegulationPreset {
  id: CPRegulationPresetId;
  label: string;
  namaDokumenSumber: string;
  nomorDokumen: string;
  tahunVersiDokumen: string;
  urlReferensi: string;
  catatanDefault: string;
  cakupan: string;
}

export const CP_REGULATION_PRESETS: readonly CPRegulationPreset[] = [
  {
    id: 'bskap_046_2025',
    label: 'Mapel Umum — SK Kepala BSKAP No. 046/H/KR/2025',
    namaDokumenSumber: 'Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Dikdas, dan Dikmen',
    nomorDokumen: 'SK Kepala BSKAP No. 046/H/KR/2025',
    tahunVersiDokumen: '2025',
    urlReferensi: OFFICIAL_CP_REFERENCES.SK_BSKAP_046_2025_URL,
    catatanDefault:
      'Rujukan regulasi nasional SK Kepala BSKAP No. 046/H/KR/2025. Pastikan teks CP asli disalin dan diverifikasi dari naskah resmi pemerintah.',
    cakupan: 'Mata pelajaran umum PAUD, SD, SMP, SMA, dan SMK',
  },
  {
    id: 'bkpdm_020_2026',
    label: 'Agama & Budi Pekerti — Keputusan Kepala BKPDM No. 020 Tahun 2026',
    namaDokumenSumber:
      'Pembaruan Capaian Pembelajaran Mata Pelajaran Pendidikan Agama dan Budi Pekerti (Perubahan atas SK 046/H/KR/2025)',
    nomorDokumen: 'Keputusan Kepala BKPDM No. 020 Tahun 2026',
    tahunVersiDokumen: '2026',
    urlReferensi: OFFICIAL_CP_REFERENCES.BKPDM_020_PRESS_RELEASE_URL,
    catatanDefault:
      'Mengakomodasi pembaruan CP Pendidikan Agama dan Budi Pekerti berdasarkan Keputusan Kepala BKPDM No. 020 Tahun 2026 atas SK 046/H/KR/2025.',
    cakupan: 'Pendidikan Agama (Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu) & Budi Pekerti',
  },
  {
    id: 'bkpdm_021_2026',
    label: 'Pendidikan Kepercayaan — Keputusan Kepala BKPDM No. 021 Tahun 2026',
    namaDokumenSumber:
      'Capaian Pembelajaran Mata Pelajaran Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
    nomorDokumen: 'Keputusan Kepala BKPDM No. 021 Tahun 2026',
    tahunVersiDokumen: '2026',
    urlReferensi: OFFICIAL_CP_REFERENCES.PANDUAN_MAPEL_URL,
    catatanDefault:
      'Referensi tersendiri berdasarkan Keputusan Kepala BKPDM No. 021 Tahun 2026 untuk mata pelajaran Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti. Teks lengkap belum diverifikasi secara lokal — mohon bandingkan dengan dokumen resmi.',
    cakupan: 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
  },
  {
    id: 'kma_madrasah',
    label: 'Rumpun Madrasah — Regulasi CP Kemenag (KMA)',
    namaDokumenSumber: 'Keputusan Menteri Agama (KMA) Capaian Pembelajaran PAI & Bahasa Arab Madrasah',
    nomorDokumen: 'KMA Kurikulum Madrasah (Verifikasi Naskah Kemenag)',
    tahunVersiDokumen: '2025/2026',
    urlReferensi: OFFICIAL_CP_REFERENCES.PANDUAN_MAPEL_URL,
    catatanDefault:
      'Rumpun mata pelajaran madrasah (MI/MTs/MA). Teks CP resmi belum tertanam penuh secara lokal — mohon verifikasi dengan naskah KMA yang berlaku.',
    cakupan: 'Al-Qur\'an Hadis, Akidah Akhlak, Fikih, SKI, Bahasa Arab (MI/MTs/MA)',
  },
  {
    id: 'input_guru_sekolah',
    label: 'Input / Penyesuaian Satuan Pendidikan & Guru',
    namaDokumenSumber: 'Penyesuaian Operasional Guru / Kurikulum Satuan Pendidikan (KSP)',
    nomorDokumen: 'Dokumen Satuan Pendidikan / Input Guru',
    tahunVersiDokumen: '2025/2026',
    urlReferensi: OFFICIAL_CP_REFERENCES.PPA_REVISI_2025_URL,
    catatanDefault:
      'Teks diinput atau disesuaikan oleh guru/satuan pendidikan. Tetap bedakan dari naskah CP resmi pemerintah.',
    cakupan: 'Penyesuaian guru, muatan lokal, atau konsentrasi keahlian SMK',
  },
] as const;

export interface ElemenCP {
  elemen: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  contohKelas: string;
}

export interface MapelDatabase {
  mataPelajaran: string;
  faseList: {
    fase: JenjangFase;
    elemenList: ElemenCP[];
  }[];
}

export function isKepercayaanSubject(mataPelajaran: string): boolean {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  if (!lower || isKemenagSubject(lower)) return false;
  return (
    /pendidikan\s+kepercayaan\b/.test(lower) ||
    /\bkepercayaan\s+terhadap\s+tuhan\b/.test(lower) ||
    /\bpenghayat\s+kepercayaan\b/.test(lower)
  );
}

export function isAgamaBudiPekertiSubject(mataPelajaran: string): boolean {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  if (!lower || isKemenagSubject(lower) || isKepercayaanSubject(lower)) {
    return false;
  }
  return (
    /\bpendidikan\s+agama\b/.test(lower) ||
    /\bpai\s*(?:&|dan)\s*budi\s*pekerti\b/.test(lower) ||
    /\bpabp\b/.test(lower) ||
    /\bpak\b/.test(lower) ||
    /\bagama\s+(?:islam|kristen|katolik|hindu|buddha|budha|khonghucu|konghucu)\b/.test(lower)
  );
}

export function isKemenagSubject(mataPelajaran: string): boolean {
  const lower = (mataPelajaran || '').toLowerCase();
  return (
    lower.includes('fikih') ||
    lower.includes('akidah') ||
    lower.includes('qur') ||
    lower.includes('hadis') ||
    lower.includes('ski') ||
    lower.includes('kebudayaan islam') ||
    lower.includes('bahasa arab') ||
    lower.includes('(mi)') ||
    lower.includes('(mts)') ||
    lower.includes('(ma)') ||
    lower.includes('madrasah')
  );
}

export function resolveDefaultCPRegulationPreset(
  mataPelajaran: string,
  explicitPresetId?: CPRegulationPresetId
): CPRegulationPreset {
  if (explicitPresetId) {
    const matched = CP_REGULATION_PRESETS.find((p) => p.id === explicitPresetId);
    if (matched) return matched;
  }
  if (isKemenagSubject(mataPelajaran)) {
    return CP_REGULATION_PRESETS.find((p) => p.id === 'kma_madrasah')!;
  }
  if (isKepercayaanSubject(mataPelajaran)) {
    return CP_REGULATION_PRESETS.find((p) => p.id === 'bkpdm_021_2026')!;
  }
  if (isAgamaBudiPekertiSubject(mataPelajaran)) {
    return CP_REGULATION_PRESETS.find((p) => p.id === 'bkpdm_020_2026')!;
  }
  return CP_REGULATION_PRESETS.find((p) => p.id === 'bskap_046_2025')!;
}

export function inferRegulationPresetIdFromEntry(
  entry: { asalCP?: string; nomorDokumen?: string },
  mataPelajaran: string
): CPRegulationPresetId {
  if (entry.asalCP === 'input_guru') {
    return 'input_guru_sekolah';
  }
  const num = (entry.nomorDokumen || '').toLowerCase();
  if (num.includes('021')) return 'bkpdm_021_2026';
  if (num.includes('020')) return 'bkpdm_020_2026';
  if (num.includes('kma') || num.includes('madrasah')) return 'kma_madrasah';
  if (num.includes('046')) return 'bskap_046_2025';
  return resolveDefaultCPRegulationPreset(mataPelajaran).id;
}

export function resolveCPReferenceMetadata(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  elemen: string,
  jenjang?: string
): CPReferenceMeta {
  const isKemenag = isKemenagSubject(mataPelajaran);
  const preset = resolveDefaultCPRegulationPreset(mataPelajaran);
  const faseLabel = jenjangFase || 'Fase D';
  return {
    sumber: isKemenag
      ? 'Katalog Referensi Madrasah AsesMerdeka (ruang lingkup PAI & Bahasa Arab — belum ditautkan ke dokumen KMA resmi)'
      : `Katalog Referensi Kurikulum Merdeka AsesMerdeka (${preset.nomorDokumen} — belum dibandingkan kata-per-kata secara lokal)`,
    elemenCP: elemen || 'Pemahaman Konsep & Keterampilan Proses',
    fase: faseLabel,
    mataPelajaran: mataPelajaran || '',
    jenjang: jenjang || '',
    asalCP: 'referensi_sistem',
    namaDokumenSumber: preset.namaDokumenSumber,
    nomorDokumen: preset.nomorDokumen,
    tahunVersiDokumen: preset.tahunVersiDokumen,
    urlReferensi: preset.urlReferensi,
    statusVerifikasi: 'referensi_belum_verifikasi',
    terverifikasiResmi: false,
    catatan: isKemenag
      ? 'Pembagian bab, semester, dan rincian sub-TP adalah rancangan aplikasi. Mohon tinjau terhadap naskah CP/KMA madrasah yang berlaku.'
      : `${preset.catatanDefault} Pembagian bab dan rincian sub-TP adalah rancangan aplikasi, bukan teks CP verbatim.`,
  };
}

export interface SystemCPReferenceCandidate {
  id: string;
  mataPelajaran: string;
  fase: JenjangFase;
  elemenCP: string;
  ringkasanFokusAplikasi: string;
  contohTPAplikasi: string;
  contohKelas: string;
  referensiMeta: CPReferenceMeta;
}

function normalizeSubjectBaseName(subject: string): string {
  return (subject || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAvailableCPReferenceEntries(
  mataPelajaran: string,
  jenjangFase: JenjangFase
): SystemCPReferenceCandidate[] {
  const targetMapel = (mataPelajaran || '').toLowerCase().trim();
  // Jangan mencampurkan katalog sekolah umum ke mapel Madrasah/Kemenag atau query kosong.
  if (!targetMapel || isKemenagSubject(targetMapel)) {
    return [];
  }
  const targetBase = normalizeSubjectBaseName(targetMapel);
  const fasePrefix = (jenjangFase || '').split('(')[0].trim().toLowerCase();
  const candidates: SystemCPReferenceCandidate[] = [];

  for (const mapelItem of KURIKULUM_MERDEKA_DATABASE) {
    const dbMapel = mapelItem.mataPelajaran.toLowerCase().trim();
    const dbBase = normalizeSubjectBaseName(dbMapel);
    const isMapelMatch =
      dbMapel === targetMapel ||
      (targetBase.length > 0 && dbBase === targetBase) ||
      (dbBase.length >= 4 && targetBase.startsWith(`${dbBase} `));
    if (!isMapelMatch) continue;

    for (const faseItem of mapelItem.faseList) {
      const dbFasePrefix = faseItem.fase.split('(')[0].trim().toLowerCase();
      if (fasePrefix && dbFasePrefix !== fasePrefix) continue;

      faseItem.elemenList.forEach((el, idx) => {
        candidates.push({
          id: `sysref_${dbMapel.replace(/[^a-z0-9]/g, '_')}_${dbFasePrefix.replace(/[^a-z0-9]/g, '_')}_${idx + 1}`,
          mataPelajaran: mapelItem.mataPelajaran,
          fase: faseItem.fase,
          elemenCP: el.elemen,
          ringkasanFokusAplikasi: el.materiPokok,
          contohTPAplikasi: el.tujuanPembelajaran,
          contohKelas: el.contohKelas,
          referensiMeta: resolveCPReferenceMetadata(mataPelajaran, faseItem.fase, el.elemen),
        });
      });
    }
  }

  return candidates;
}

export const KURIKULUM_MERDEKA_DATABASE: MapelDatabase[] = [
  {
    mataPelajaran: 'Matematika',
    faseList: [
      {
        fase: 'Fase D (Kelas 7-9 SMP)',
        elemenList: [
          {
            elemen: 'Aljabar',
            materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
            tujuanPembelajaran: 'Peserta didik dapat menyelesaikan masalah kontekstual transaksi belanja dan selisih nilai menggunakan model SPLDV.',
            contohKelas: '8'
          },
          {
            elemen: 'Geometri',
            materiPokok: 'Teorema Pythagoras dan Penerapan Bangun Ruang Sisi Datar',
            tujuanPembelajaran: 'Menemukan hubungan antarsisi segitiga siku-siku serta menghitung jarak dan ketinggian objek nyata.',
            contohKelas: '8'
          },
          {
            elemen: 'Analisis Data & Peluang',
            materiPokok: 'Penyajian Data Statistik dan Ukuran Pemusatan (Mean, Median, Modus)',
            tujuanPembelajaran: 'Menganalisis tren data lingkungan sekolah dan menyimpulkan distribusi data secara objektif.',
            contohKelas: '7'
          },
          {
            elemen: 'Bilangan',
            materiPokok: 'Operasi Bilangan Bulat dan Pecahan dalam Keuangan Sehari-hari',
            tujuanPembelajaran: 'Menerapkan operasi hitung bilangan bulat dan pecahan dalam pemecahan masalah anggaran belanja hemat.',
            contohKelas: '7'
          }
        ]
      },
      {
        fase: 'Fase E (Kelas 10 SMA/SMK)',
        elemenList: [
          {
            elemen: 'Aljabar & Fungsi',
            materiPokok: 'Fungsi Kuadrat dan Penerapannya pada Gerak Parabola',
            tujuanPembelajaran: 'Menganalisis karakteristik grafik fungsi kuadrat dan memprediksi titik maksimum lintasan benda.',
            contohKelas: '10'
          },
          {
            elemen: 'Geometri',
            materiPokok: 'Perbandingan Trigonometri Segitiga Siku-siku (Sin, Cos, Tan)',
            tujuanPembelajaran: 'Menggunakan perbandingan trigonometri untuk menentukan tinggi pohon/gedung dengan klinometer.',
            contohKelas: '10'
          },
          {
            elemen: 'Analisis Data & Peluang',
            materiPokok: 'Peluang Kejadian Majemuk Saling Lepas dan Bebas',
            tujuanPembelajaran: 'Menghitung peluang kejadian dalam pengambilan sampel acak dan menyimpulkan resiko.',
            contohKelas: '10'
          }
        ]
      },
      {
        fase: 'Fase B (Kelas 3-4 SD)',
        elemenList: [
          {
            elemen: 'Bilangan',
            materiPokok: 'Operasi Perkalian dan Pembagian Bilangan Cacah',
            tujuanPembelajaran: 'Peserta didik mampu menghitung perkalian dan pembagian bilangan cacah sampai 100 dengan benda konkret.',
            contohKelas: '4'
          },
          {
            elemen: 'Pengukuran',
            materiPokok: 'Keliling dan Luas Persegi serta Persegi Panjang',
            tujuanPembelajaran: 'Menghitung keliling dan luas bangun datar di sekitar ruang kelas menggunakan satuan baku.',
            contohKelas: '4'
          }
        ]
      }
    ]
  },
  {
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    faseList: [
      {
        fase: 'Fase B (Kelas 3-4 SD)',
        elemenList: [
          {
            elemen: 'Pemahaman IPAS (Sains)',
            materiPokok: 'Bagian Tubuh Tumbuhan, Fotosintesis, dan Perkembangbiakan',
            tujuanPembelajaran: 'Mengidentifikasi fungsi akar, batang, daun, bunga, serta menguraikan proses fotosintesis.',
            contohKelas: '4'
          },
          {
            elemen: 'Pemahaman IPAS (Sosial)',
            materiPokok: 'Kebutuhan Manusia vs Keinginan dan Kegiatan Ekonomi Masyarakat',
            tujuanPembelajaran: 'Membedakan kebutuhan primer, sekunder, tersier dan menganalisis peran produsen, distributor, konsumen.',
            contohKelas: '4'
          },
          {
            elemen: 'Pemahaman IPAS (Sains)',
            materiPokok: 'Wujud Zat dan Perubahannya (Mencair, Membeku, Menguap)',
            tujuanPembelajaran: 'Menyelidiki perubahan wujud benda dalam siklus air dan kehidupan sehari-hari.',
            contohKelas: '3'
          }
        ]
      },
      {
        fase: 'Fase C (Kelas 5-6 SD)',
        elemenList: [
          {
            elemen: 'Sains & Lingkungan',
            materiPokok: 'Ekosistem, Rantai Makanan, dan Keseimbangan Jaring-Jaring Makanan',
            tujuanPembelajaran: 'Menganalisis hubungan antar makhluk hidup dan dampak campur tangan manusia terhadap rantai makanan.',
            contohKelas: '5'
          },
          {
            elemen: 'Sistem Tubuh Manusia',
            materiPokok: 'Sistem Pencernaan dan Pola Hidup Sehat Bergizi Seimbang',
            tujuanPembelajaran: 'Menjelaskan organ pencernaan manusia dan dampaknya terhadap penyerapan nutrisi tubuh.',
            contohKelas: '5'
          }
        ]
      }
    ]
  },
  {
    mataPelajaran: 'Bahasa Indonesia',
    faseList: [
      {
        fase: 'Fase D (Kelas 7-9 SMP)',
        elemenList: [
          {
            elemen: 'Membaca & Memirsa',
            materiPokok: 'Teks Deskripsi Objek Wisata dan Budaya Nusantara',
            tujuanPembelajaran: 'Menemukan informasi tersirat, pencerapan pancaindra, dan majas dalam teks deskripsi autentik.',
            contohKelas: '7'
          },
          {
            elemen: 'Menulis',
            materiPokok: 'Teks Prosedur Membuat Sesuatu dan Tips Gaya Hidup Sehat',
            tujuanPembelajaran: 'Menyusun teks prosedur dengan struktur yang runtut, kalimat perintah, dan kata keterangan yang tepat.',
            contohKelas: '7'
          },
          {
            elemen: 'Berbicara & Mempresentasikan',
            materiPokok: 'Teks Diskusi Isu Lingkungan dan Penggunaan Gawai pada Remaja',
            tujuanPembelajaran: 'Menyampaikan argumen pro dan kontra secara santun berbasis data faktual.',
            contohKelas: '9'
          }
        ]
      },
      {
        fase: 'Fase E (Kelas 10 SMA/SMK)',
        elemenList: [
          {
            elemen: 'Membaca & Menulis',
            materiPokok: 'Teks Laporan Hasil Observasi (LHO) tentang Keanekaragaman Hayati',
            tujuanPembelajaran: 'Mengevaluasi keakuratan fakta dan struktur ilmiah dalam teks LHO.',
            contohKelas: '10'
          },
          {
            elemen: 'Menulis',
            materiPokok: 'Teks Anekdot sebagai Kritik Sosial dan Sarana Edukasi',
            tujuanPembelajaran: 'Menyusun teks anekdot dengan menyematkan struktur sindiran halus dan pesan moral.',
            contohKelas: '10'
          }
        ]
      }
    ]
  },
  {
    mataPelajaran: 'Informatika',
    faseList: [
      {
        fase: 'Fase D (Kelas 7-9 SMP)',
        elemenList: [
          {
            elemen: 'Berpikir Komputasional (BK)',
            materiPokok: 'Dekomposisi, Pengenalan Pola, dan Algoritma Optimasi',
            tujuanPembelajaran: 'Menerapkan 4 pilar berpikir komputasional dalam menyelesaikan persoalan penjadwalan efisien.',
            contohKelas: '7'
          },
          {
            elemen: 'Teknologi Informasi & Komunikasi (TIK)',
            materiPokok: 'Pengelolaan File, Surel, dan Kolaborasi Dokumen Daring',
            tujuanPembelajaran: 'Mengorganisasi struktur folder komputer dan membuat dokumen bersama secara produktif.',
            contohKelas: '7'
          },
          {
            elemen: 'Dampak Sosial Informatika (DSI)',
            materiPokok: 'Keamanan Data Pribadi dan Etika Berjejaring Sosial',
            tujuanPembelajaran: 'Menganalisis ancaman phising/cyberbullying dan menerapkan proteksi akun digital.',
            contohKelas: '8'
          }
        ]
      }
    ]
  }
];
