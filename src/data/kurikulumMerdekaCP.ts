import type { JenjangFase } from '../types/assessment';
import type { CPReferenceMeta } from '../utils/schoolProfileStorage';

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

export function isKemenagSubject(mataPelajaran: string): boolean {
  const lower = mataPelajaran.toLowerCase();
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
    lower.includes('(ma)')
  );
}

export function resolveCPReferenceMetadata(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  elemen: string
): CPReferenceMeta {
  const isKemenag = isKemenagSubject(mataPelajaran);
  const faseLabel = jenjangFase || 'Fase D';
  return {
    sumber: isKemenag
      ? 'Katalog Referensi Madrasah AsesMerdeka (ruang lingkup PAI & Bahasa Arab — belum ditautkan ke dokumen KMA resmi)'
      : 'Katalog Referensi Kurikulum Merdeka AsesMerdeka (ringkasan elemen — belum ditautkan ke naskah keputusan BSKAP resmi)',
    elemenCP: elemen || 'Pemahaman Konsep & Keterampilan Proses',
    fase: faseLabel,
    terverifikasiResmi: false,
    catatan: isKemenag
      ? 'Pembagian bab, semester, dan rincian sub-TP adalah rancangan aplikasi. Mohon tinjau terhadap naskah CP/KMA madrasah yang berlaku.'
      : 'Pembagian bab, semester, dan rincian sub-TP adalah rancangan aplikasi, bukan ketetapan nasional. Silakan tinjau terhadap CP fase satuan pendidikan Anda.',
  };
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
