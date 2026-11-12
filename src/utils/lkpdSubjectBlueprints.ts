import type { JenjangKategori } from './kurikulumCatalog';
import type {
  LKPDPresetType,
  LKPDWorkMode,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
  LKPDPertanyaanItem,
  LKPDTeacherGuide,
  LKPDStimulusData,
  LKPDRuangJawabanJenis,
  LKPDPipelineValidation,
} from '../types/perangkatAjar';

export interface CuratedLKPDContent {
  isCuratedFixture: boolean;
  subJudulTopik: string;
  pendekatanKegiatan: string;
  modeKerja: LKPDWorkMode;
  alokasiWaktu: string;
  targetBelajarSiswa: string[];
  prasyaratMateri: string[];
  petunjukPengerjaan: string[];
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal?: string;
  };
  stimulusData?: LKPDStimulusData;
  eksperimenData?: LKPDEksperimenData;
  diferensiasiData?: LKPDDiferensiasiData;
  proyekData?: LKPDProyekData;
  langkahAktivitas: {
    langkahKe: number;
    judulLangkah?: string;
    instruksi: string;
    bantuanAtauTabel?: string[];
    ruangJawabanJenis?: LKPDRuangJawabanJenis;
    pemetaanSubTP?: string;
  }[];
  pemeriksaanHasil: string[];
  pertanyaanAnalisis: LKPDPertanyaanItem[];
  dukunganTambahan: string;
  pengayaan: {
    instruksi: string;
    tugas: string[];
  };
  kesimpulanRefleksi: string[];
  panduanGuru: LKPDTeacherGuide;
  validationStatus?: LKPDPipelineValidation;
}

export function cleanTopicHeading(rawTitle: string): string {
  return rawTitle
    .replace(/^lembar kerja peserta didik\s*(\(lkpd\))?\s*:?\s*/i, '')
    .replace(/^lkpd\s*(studi kasus|eksperimen|berdiferensiasi|proyek)?\s*:?\s*/i, '')
    .trim();
}

export function adaptPresetExtras(
  preset: LKPDPresetType,
  materi: string,
  stimulusText: string,
  toolsAndSafety?: {
    tools: string[];
    hipotesis: string;
    safety: string[];
    table: { kolom: string[]; baris: string[][] };
  }
): {
  eksperimenData?: LKPDEksperimenData;
  diferensiasiData?: LKPDDiferensiasiData;
  proyekData?: LKPDProyekData;
} {
  if (preset === 'eksperimen') {
    return {
      eksperimenData: toolsAndSafety
        ? {
            alatDanBahan: toolsAndSafety.tools,
            hipotesisAwal: toolsAndSafety.hipotesis,
            keselamatanKerja: toolsAndSafety.safety,
            tabelObservasi: toolsAndSafety.table,
          }
        : {
            alatDanBahan: [
              'Lembar kerja pencatatan data terstruktur',
              `Kartu data / bahan bacaan terkait ${materi}`,
              'Alat tulis dan penggaris',
            ],
            hipotesisAwal: `Dengan menguji variasi data pada "${materi}", pola atau kesimpulan konsisten dapat dibuktikan dari bukti pengamatan.`,
            keselamatanKerja: ['Pastikan meja kerja rapi dan data awal dicatat sesuai satuannya sebelum memulai pengujian.'],
            tabelObservasi: {
              kolom: ['No', 'Variasi Uji', 'Data Awal', 'Hasil Pengamatan', 'Verifikasi Kesesuaian'],
              baris: [
                ['1', 'Kondisi awal sesuai stimulus', 'Tertera pada data', '......................', '[ ] Sesuai'],
                ['2', 'Uji variasi 1 syarat', 'Ubah 1 nilai terkontrol', '......................', '[ ] Sesuai'],
                ['3', 'Pengecekan batas / syarat', 'Bandingkan dengan aturan', '......................', '[ ] Sesuai'],
              ],
            },
          },
    };
  }

  if (preset === 'diferensiasi') {
    return {
      diferensiasiData: {
        tingkatDasar: {
          instruksi: `Penguatan konsep dasar menggunakan fakta langsung dari stimulus "${materi}".`,
          tugas: [
            'Catat ulang semua fakta kunci, besaran, atau kutipan penting dari stimulus beserta satuannya.',
            'Selesaikan bagian identifikasi awal mengikuti langkah terbimbing nomor 1 dan 2.',
            'Periksa hasil pekerjaanmu dengan mencocokkannya kembali ke bahan stimulus awal.',
          ],
        },
        tingkatMenengah: {
          instruksi: `Penerapan konsep lengkap untuk menyelesaikan persoalan inti pada "${materi}".`,
          tugas: [
            'Selesaikan seluruh tahapan langkah kerja dari identifikasi hingga kesimpulan akhir.',
            'Jawab seluruh pertanyaan analisis disertai bukti hitungan atau kutipan data stimulus.',
            'Tulis satu pemeriksaan ulang untuk memastikan jawabanmu konsisten terhadap syarat tugas.',
          ],
        },
        tingkatMahir: {
          instruksi: `Evaluasi kesalahan, perbandingan cara alternatif, dan analisis kondisi batas terkait "${materi}".`,
          tugas: [
            'Periksa kesimpulan/klaim pembanding pada soal analisis dan buktikan letak ketepatan atau kesalahannya.',
            'Gunakan cara atau bukti pembanding kedua untuk memperkuat argumen jawabanmu.',
            'Susun satu variasi kasus baru yang tetap konsisten dengan kaidah materi ini.',
          ],
        },
      },
    };
  }

  if (preset === 'proyek') {
    const shortStim = stimulusText.split('.').slice(0, 1).join('.').trim();
    return {
      proyekData: {
        tujuanProyek: `Menyusun sajian pemecahan masalah dan verifikasi berbasis data nyata terkait "${materi}" (${shortStim}).`,
        tahapanWaktu:
          'Sesi 1 (25 mnt): Analisis data & perencanaan; Sesi 2 (35 mnt): Penyusunan karya/hasil & pemeriksaan; Sesi 3 (20 mnt): Paparan & umpan balik.',
        peranAnggota: [
          { peran: 'Pencatat Data & Fakta', tanggungJawab: 'Memastikan seluruh fakta/angka dari stimulus disalin tepat beserta satuannya.' },
          { peran: 'Penyusun Model / Draf', tanggungJawab: 'Menyusun representasi atau kerangka kerja utama penyelesaian.' },
          { peran: 'Pemeriksa & Verifikator', tanggungJawab: 'Menguji hasil kerja balik ke semua syarat dan mencari potensi kekeliruan.' },
          { peran: 'Penyaji Hasil', tanggungJawab: 'Menyusun kesimpulan akhir yang jelas untuk dipaparkan.' },
        ],
        rubrikKarya: [
          {
            kriteria: 'Ketepatan Penggunaan Data Stimulus',
            deskripsiSkor: 'Seluruh data, kutipan, dan syarat dari bahan kajian dipakai konsisten tanpa diubah sepihak.',
          },
          {
            kriteria: 'Keruntutan Prosedur & Penalaran',
            deskripsiSkor: 'Langkah pemecahan tersusun runtut dari identifikasi hingga hasil akhir.',
          },
          {
            kriteria: 'Verifikasi Ulang & Interpretasi Konteks',
            deskripsiSkor: 'Hasil diperiksa balik terhadap syarat awal dan dijelaskan dengan bahasa lengkap.',
          },
        ],
      },
    };
  }

  return {};
}

export type SubjectFamily =
  | 'matematika'
  | 'bahasa'
  | 'sains'
  | 'sosial_sejarah'
  | 'pancasila_agama'
  | 'informatika_kejuruan'
  | 'seni_pjok';

export type GradeBand = 'sd_awal' | 'sd_atas' | 'smp' | 'sma' | 'smk';

export interface JenjangPedagogicalProfile {
  gradeBand: GradeBand;
  labelJenjang: string;
  readingParagraphsHint: string;
  languageTone: string;
  defaultWorkMode: LKPDWorkMode;
  defaultDurationMinutes: number;
  scaffoldingNote: string;
  allowHighAbstractMahir: boolean;
}

export interface SubjectApproachRule {
  family: SubjectFamily;
  labelRumpun: string;
  preferredModesByPreset: Record<LKPDPresetType, string>;
  stimulusRequirement: string;
  activityRequirement: string;
  requiresEquipmentAndSafetyCheck: boolean;
}

export function resolveSubjectFamily(mataPelajaran: string): SubjectFamily {
  const lower = mataPelajaran.toLowerCase();
  if (lower.includes('matematika')) return 'matematika';
  if (lower.includes('indonesia') || lower.includes('inggris') || lower.includes('arab')) {
    return 'bahasa';
  }
  if (
    lower.includes('ipa') ||
    lower.includes('fisika') ||
    lower.includes('kimia') ||
    lower.includes('biologi')
  ) {
    return 'sains';
  }
  if (
    lower.includes('ips') ||
    lower.includes('ekonomi') ||
    lower.includes('sejarah') ||
    lower.includes('sosiologi') ||
    lower.includes('geografi')
  ) {
    return 'sosial_sejarah';
  }
  if (
    lower.includes('pancasila') ||
    lower.includes('ppkn') ||
    lower.includes('agama') ||
    lower.includes('fikih') ||
    lower.includes('akidah') ||
    lower.includes('qur') ||
    lower.includes('hadis') ||
    lower.includes('ski')
  ) {
    return 'pancasila_agama';
  }
  if (
    lower.includes('informatika') ||
    lower.includes('kejuruan') ||
    lower.includes('pkk') ||
    lower.includes('kewirausahaan')
  ) {
    return 'informatika_kejuruan';
  }
  if (
    lower.includes('pjok') ||
    lower.includes('jasmani') ||
    lower.includes('olahraga') ||
    lower.includes('seni') ||
    lower.includes('prakarya')
  ) {
    return 'seni_pjok';
  }
  return 'sosial_sejarah';
}

export function resolveJenjangPedagogicalProfile(
  jenjang: JenjangKategori,
  kelas: string
): JenjangPedagogicalProfile {
  const k = parseInt(kelas.replace(/[^0-9]/g, ''), 10);
  if (jenjang === 'SD/MI' && (k === 1 || k === 2)) {
    return {
      gradeBand: 'sd_awal',
      labelJenjang: 'SD/MI Kelas Awal (Fase A)',
      readingParagraphsHint: '1 paragraf sangat singkat (maks. 3–4 kalimat sederhana dengan benda konkret)',
      languageTone: 'Kalimat pendek, konkret, menyapa hangat, dan dibantu petunjuk langkah visual',
      defaultWorkMode: 'Berpasangan',
      defaultDurationMinutes: 60,
      scaffoldingNote: 'Berikan contoh pengerjaan pertama atau kotak isian terstruktur agar siswa tidak bingung.',
      allowHighAbstractMahir: false,
    };
  }
  if (jenjang === 'SD/MI') {
    return {
      gradeBand: 'sd_atas',
      labelJenjang: `SD/MI Kelas ${k || 4} (Fase ${k >= 5 ? 'C' : 'B'})`,
      readingParagraphsHint: '1–2 paragraf singkat jelas dengan bilangan/objek konkret sehari-hari',
      languageTone: 'Bahasa lugas ramah anak SD kelas atas disertai pemecahan langkah konkret',
      defaultWorkMode: 'Berpasangan',
      defaultDurationMinutes: 70,
      scaffoldingNote: 'Mulai dari identifikasi fakta nyata menuju penghitungan atau pengamatan terarah.',
      allowHighAbstractMahir: false,
    };
  }
  if (jenjang === 'SMP/MTs') {
    return {
      gradeBand: 'smp',
      labelJenjang: `SMP/MTs Kelas ${k || 8} (Fase D)`,
      readingParagraphsHint: 'Wacana atau data terstruktur berisi angka/kutipan/pengamatan autentik yang cukup dikerjakan',
      languageTone: 'Bahasa semi-formal jelas, menuntun transisi dari konkret ke model simbolik/tabel',
      defaultWorkMode: 'Berpasangan',
      defaultDurationMinutes: 80,
      scaffoldingNote: 'Pandu pemodelan, penyelesaian, pemeriksaan balik, dan identifikasi kesalahan umum.',
      allowHighAbstractMahir: true,
    };
  }
  if (jenjang === 'SMK') {
    return {
      gradeBand: 'smk',
      labelJenjang: `SMK/MAK Kelas ${k || 10} (Fase ${k >= 11 ? 'F' : 'E'})`,
      readingParagraphsHint: 'Skenario kerja teknis/bengkel/usaha/industri disertai data parameter dan syarat K3LH',
      languageTone: 'Bahasa profesional kejuruan berorientasi prosedur, efisiensi, dan keselamatan kerja',
      defaultWorkMode: 'Kelompok Kecil (3–4 Siswa)',
      defaultDurationMinutes: 90,
      scaffoldingNote: 'Tekankan ketelitian satuan, audit langkah SOP, K3LH, dan kelayakan keputusan.',
      allowHighAbstractMahir: true,
    };
  }
  return {
    gradeBand: 'sma',
    labelJenjang: `SMA/MA Kelas ${k || 10} (Fase ${k >= 11 ? 'F' : 'E'})`,
    readingParagraphsHint: 'Data primer, kasus autentik, atau teks utuh berargumen dengan asumsi terdefinisi jelas',
    languageTone: 'Bahasa akademik lugas menuntut pembuktian, evaluasi asumsi, dan justifikasi logis',
    defaultWorkMode: 'Individu',
    defaultDurationMinutes: 90,
    scaffoldingNote: 'Dorong verifikasi konsistensi hasil, perbandingan metode, dan analisis kondisi batas.',
    allowHighAbstractMahir: true,
  };
}

export function resolveSubjectApproachRule(
  family: SubjectFamily,
  preset: LKPDPresetType
): SubjectApproachRule {
  const rules: Record<SubjectFamily, SubjectApproachRule> = {
    matematika: {
      family: 'matematika',
      labelRumpun: 'Matematika',
      preferredModesByPreset: {
        kasus: 'Pemodelan Masalah & Penyelesaian Matematis',
        eksperimen: 'Eksplorasi Pola & Penyelidikan Numerik/Geometris',
        diferensiasi: 'Latihan Bertahap & Pemecahan Masalah Berjenjang',
        proyek: 'Aplikasi Perencanaan & Perhitungan Kontekstual',
      },
      stimulusRequirement: 'Wajib memuat bilangan, objek, satuan, dan asumsi yang lengkap sehingga soal dapat dihitung dan diverifikasi.',
      activityRequirement: 'Mengarahkan siswa mencatat data, menentukan variabel/rumus, menghitung/memodelkan, dan memeriksa kembali jawaban.',
      requiresEquipmentAndSafetyCheck: preset === 'eksperimen',
    },
    bahasa: {
      family: 'bahasa',
      labelRumpun: 'Bahasa & Sastra',
      preferredModesByPreset: {
        kasus: 'Membaca Kritis, Analisis Teks & Menulis Terarah',
        eksperimen: 'Eksplorasi Struktur Kebahasaan & Penyuntingan Teks',
        diferensiasi: 'Analisis & Produksi Teks Berjenjang',
        proyek: 'Proyek Penyusunan Karya Tulis / Dialog Autentik',
      },
      stimulusRequirement: 'Wajib menampilkan kutipan teks, paragraf, atau dialog nyata secara utuh agar dapat dianalisis langsung tanpa menebak teks luar.',
      activityRequirement: 'Memuat aktivitas membaca/memirsa, mengidentifikasi unsur/struktur teks dari kutipan nyata, dan memproduksi/menyunting tulisan.',
      requiresEquipmentAndSafetyCheck: false,
    },
    sains: {
      family: 'sains',
      labelRumpun: 'Sains (IPA / IPAS / Fisika / Kimia / Biologi)',
      preferredModesByPreset: {
        kasus: 'Analisis Data Pengamatan & Penjelasan Ilmiah',
        eksperimen: 'Penyelidikan Ilmiah, Praktikum & Verifikasi Hipotesis',
        diferensiasi: 'Penyelidikan Fenomena Alam Berjenjang',
        proyek: 'Proyek Solusi Sains & Lingkungan',
      },
      stimulusRequirement: 'Wajib memuat data pengamatan, besaran ber-satuan, variabel jelas, dan fakta ilmiah akurat.',
      activityRequirement: 'Untuk eksperimen/praktik wajib menyertakan alat-bahan realistis, prosedur keselamatan kerja, tabel data terukur, serta analisis bukti.',
      requiresEquipmentAndSafetyCheck: preset === 'eksperimen',
    },
    sosial_sejarah: {
      family: 'sosial_sejarah',
      labelRumpun: 'IPS / Sejarah / Ekonomi / Geografi / Sosiologi',
      preferredModesByPreset: {
        kasus: 'Analisis Sumber, Data & Hubungan Sebab-Akibat',
        eksperimen: 'Uji Data Empiris & Perbandingan Tren Sosial/Ekonomi',
        diferensiasi: 'Kajian Fenomena Sosial/Sejarah Berjenjang',
        proyek: 'Proyek Kajian Sumber & Rekomendasi Sosial',
      },
      stimulusRequirement: 'Wajib memuat data tabel/statistik, kutipan sumber sejarah/kronologi tahun, atau skenario ekonomi terukur.',
      activityRequirement: 'Mengarahkan perbandingan bukti, analisis kronologi/kausalitas, serta perhitungan bila terkait data ekonomi/demografi.',
      requiresEquipmentAndSafetyCheck: false,
    },
    pancasila_agama: {
      family: 'pancasila_agama',
      labelRumpun: 'Pendidikan Pancasila / PAI & Mapel Kemenag',
      preferredModesByPreset: {
        kasus: 'Analisis Situasi Nilai, Penalaran Alasan & Penerapan',
        eksperimen: 'Identifikasi Kaidah / Simulasi Praktik Tertib',
        diferensiasi: 'Pendalaman Nilai & Penerapan Berjenjang',
        proyek: 'Aksi Penerapan Nilai & Adab Kolaboratif',
      },
      stimulusRequirement: 'Menyajikan skenario dilema moral/ibadah/muamalah nyata atau potongan contoh lafaz/kasus jelas tanpa mengarang nomor aturan atau dalil.',
      activityRequirement: 'Meminta siswa mengklasifikasikan fakta situasi, memberikan alasan berdasar prinsip materi, dan merumuskan sikap nyata yang santun.',
      requiresEquipmentAndSafetyCheck: false,
    },
    informatika_kejuruan: {
      family: 'informatika_kejuruan',
      labelRumpun: 'Informatika & Kejuruan / PKK',
      preferredModesByPreset: {
        kasus: 'Penelusuran Algoritma, Audit Kasus & Pemecahan Masalah',
        eksperimen: 'Uji Coba Input-Proses-Output & Debugging Langkah',
        diferensiasi: 'Latihan Logika Komputasional / Kejuruan Berjenjang',
        proyek: 'Perancangan Alur Kerja / Purwarupa Solutif',
      },
      stimulusRequirement: 'Wajib menyertakan algoritma/pseudocode/tabel data sel/BOM produksi atau kasus phishing konkret dengan input jelas.',
      activityRequirement: 'Melatih penelusuran langkah (trace), pengujian kasus batas (debugging), audit K3LH/SOP, atau penghitungan HPP/BEP.',
      requiresEquipmentAndSafetyCheck: preset === 'eksperimen',
    },
    seni_pjok: {
      family: 'seni_pjok',
      labelRumpun: 'Seni Budaya, Prakarya & PJOK',
      preferredModesByPreset: {
        kasus: 'Observasi Teknik/Karya & Perencanaan Praktik',
        eksperimen: 'Praktik Terukur, Pengukuran Kinerja & Keselamatan',
        diferensiasi: 'Latihan Unjuk Kerja & Apresiasi Berjenjang',
        proyek: 'Penciptaan Karya / Program Latihan Kolaboratif',
      },
      stimulusRequirement: 'Menyertakan acuan teknik, ukuran/proporsi, data kebugaran/gizi, atau kriteria observasi praktik yang jelas.',
      activityRequirement: 'Menyertakan cek keselamatan alat/pemanasan, langkah praktik/observasi konkret, catatan hasil diri, dan refleksi.',
      requiresEquipmentAndSafetyCheck: preset === 'eksperimen',
    },
  };

  return rules[family];
}
