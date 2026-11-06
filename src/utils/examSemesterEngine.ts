import type { SchoolProfile, CustomTPItem } from './schoolProfileStorage';
import type { 
  NaskahUjianDokumen, 
  TipeUjianSemester, 
  KunciJawabanUjian, 
  RubrikUraianUjian 
} from '../types/examSemester';
import type { SoalPilihanGanda, SoalPilihanGandaKompleks, SoalUraian, GenerationRequest } from '../types/assessment';
import { getQuestionBankForRequest } from './asesmenKnowledgeEngine';

export interface ExamGenerationOptions {
  tipe: TipeUjianSemester;
  jumlahPG: number;
  jumlahPGK: number;
  jumlahUraian: number;
  alokasiWaktu?: string;
}

// Preset konfigurasi soal yang lazim digunakan di sekolah
export const EXAM_PRESETS = [
  {
    id: 'standar',
    label: 'Format Standar (20 PG + 5 Uraian)',
    deskripsi: 'Paling umum digunakan untuk STS/SAS jenjang SD & SMP',
    pg: 20,
    pgk: 0,
    uraian: 5,
    waktu: '90 Menit',
  },
  {
    id: 'komprehensif',
    label: 'Format Komprehensif (20 PG + 5 PGK + 5 Uraian)',
    deskripsi: 'Sesuai Asesmen Nasional (AKM) Kurikulum Merdeka untuk SMP & SMA',
    pg: 20,
    pgk: 5,
    uraian: 5,
    waktu: '120 Menit',
  },
  {
    id: 'ringkas',
    label: 'Format Ringkas (15 PG + 5 Uraian)',
    deskripsi: 'Ideal untuk evaluasi mid-semester waktu terbatas (60-75 Menit)',
    pg: 15,
    pgk: 0,
    uraian: 5,
    waktu: '60 Menit',
  },
  {
    id: 'akm_fokus',
    label: 'Format Model AKM (15 PG + 10 PGK + 5 Uraian)',
    deskripsi: 'Fokus penguatan literasi & nalar kritis Kurikulum Merdeka',
    pg: 15,
    pgk: 10,
    uraian: 5,
    waktu: '90 Menit',
  },
];

/**
 * Filter TP yang relevan dengan tipe ujian:
 * - STS (Sumatif Tengah Semester): Mengambil 50% TP pertama pada semester berjalan
 * - SAS (Sumatif Akhir Semester): Mengambil seluruh (100%) TP pada semester berjalan
 */
export function getTPCoverageForExam(tpList: CustomTPItem[], tipe: TipeUjianSemester): CustomTPItem[] {
  if (!tpList || tpList.length === 0) return [];
  if (tipe === 'STS') {
    const halfCount = Math.max(1, Math.ceil(tpList.length / 2));
    return tpList.slice(0, halfCount);
  }
  return tpList;
}

/**
 * Smart generator naskah ujian semester (STS & SAS)
 * Disesuaikan khusus untuk jenjang SD, SMP, dan SMA agar bahasa, stimulus, dan pilihan jawaban
 * sepenuhnya realistis, kontekstual, dan TANPA teks placeholder/pengecoh tiruan.
 */
export function generateSmartNaskahUjian(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  options: ExamGenerationOptions
): NaskahUjianDokumen {
  const { tipe, jumlahPG, jumlahPGK, jumlahUraian, alokasiWaktu = '90 Menit' } = options;
  
  // Deteksi jenjang pendidikan secara akurat
  const kelasStr = (profile.kelasUtama || '').trim();
  const isSD = profile.jenjang === 'SD/MI' || 
    /^[1-6]$/.test(kelasStr) || 
    /^(I|II|III|IV|V|VI)$/i.test(kelasStr) ||
    /kelas\s*[1-6]/i.test(kelasStr);

  const isSMA = profile.jenjang === 'SMA/MA' || profile.jenjang === 'SMK' ||
    /^(10|11|12|X|XI|XII)$/i.test(kelasStr) ||
    /kelas\s*(10|11|12|X|XI|XII)/i.test(kelasStr);

  const isSMP = !isSD && !isSMA;

  // Tentukan cakupan TP
  const coveredTPs = getTPCoverageForExam(tpList, tipe);
  const activeTPs = coveredTPs.length > 0 ? coveredTPs : [
    {
      id: 'tp_fallback_1',
      kode: 'TP-01',
      elemen: 'Pemahaman Konseptual',
      materiPokok: profile.mataPelajaranUtama || 'Materi Inti Semester',
      tujuanPembelajaran: `Memahami dan menerapkan materi esensial dalam kehidupan sehari-hari.`,
      arahanRangkuman: '',
      alokasiJP: 12,
      mingguMulai: 1,
      mingguSelesai: 4,
    }
  ];

  const namaUjianLengkap = tipe === 'STS'
    ? `SUMATIF TENGAH SEMESTER (STS) ${profile.semester.toUpperCase()}`
    : `SUMATIF AKHIR SEMESTER (SAS) ${profile.semester.toUpperCase()}`;

  const petunjukUmum = [
    'Berdoalah terlebih dahulu sebelum mulai mengerjakan soal ujian.',
    'Tuliskan identitas Anda (Nama, Nomor Peserta, Kelas, dan Ruang) secara lengkap dan jelas pada Lembar Jawaban.',
    'Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya.',
    'Dahulukan menjawab butir soal yang Anda anggap paling mudah.',
    isSD
      ? 'Untuk soal Pilihan Ganda (PG), berilah tanda silang (X) pada salah satu huruf A, B, C, atau D yang paling benar.'
      : isSMA
      ? 'Untuk soal Pilihan Ganda (PG), hitamkan atau silanglah pilihan A, B, C, D, atau E pada lembar jawaban.'
      : 'Untuk soal Pilihan Ganda (PG), berilah tanda silang (X) pada huruf A, B, C, atau D yang paling tepat.',
    'Untuk soal Pilihan Ganda Kompleks (PGK), berilah tanda centang (✓) pada kolom Benar atau Salah sesuai analisis pernyataan.',
    'Untuk soal Uraian, tuliskan jawaban dengan kalimat yang jelas, runtut, dan rapi pada tempat yang disediakan.',
    'Periksa kembali seluruh lembar jawaban Anda sebelum diserahkan kepada bapak/ibu guru pengawas.',
  ];

  // Pilihan huruf A-D untuk SD & SMP, A-E untuk SMA/SMK
  const labelOptions: ('A' | 'B' | 'C' | 'D' | 'E')[] = isSMA 
    ? ['A', 'B', 'C', 'D', 'E'] 
    : ['A', 'B', 'C', 'D'];

  // Bank Opsi Jawaban Realistis untuk SD (Fase A-C)
  const bankBenarSD = [
    'Menghargai perbedaan pendapat, saling tolong-menolong, dan melaksanakan tugas dengan rasa tanggung jawab.',
    'Bekerja sama menyelesaikan tugas piket bersama teman agar lingkungan sekolah tetap bersih dan nyaman.',
    'Mendengarkan penjelasan bapak/ibu guru dengan tertib serta mematuhi aturan kelas yang disepakati.',
    'Membantu kawan yang sedang terjatuh dan merapikan buku-bukunya tanpa pamrih atau meminta imbalan.',
    'Mengutamakan musyawarah secara santun untuk menentukan kesepakatan kelompok belajar bersama.',
    'Menjaga kerukunan antar teman dengan tidak membeda-bedakan suku, agama, maupun asal daerah.',
    'Mengakui kesalahan dengan jujur dan berani meminta maaf secara tulus kepada teman sekelas.',
    'Menggunakan perlengkapan belajar bersama secara berhati-hati, cermat, dan merawatnya dengan baik.',
    'Membagi giliran tugas bermain atau belajar secara adil dan sportif tanpa bertengkar.',
    'Menunjukkan rasa syukur atas keberagaman lingkungan sekitar dengan hidup rukun dan damai.',
  ];

  const bankDistraktorSD = [
    [
      'Hanya mau membantu teman apabila diberi upah atau imbalan uang saku.',
      'Membiarkan teman bekerja sendirian sementara yang lain asyik bermain di luar.',
      'Memaksakan kehendak sendiri agar seluruh teman kelompok harus selalu menuruti keinginannya.',
    ],
    [
      'Menyalahkan teman lain ketika kelompok belajar mendapatkan nilai yang kurang memuaskan.',
      'Memilih-milih kawan bermain hanya berdasarkan barang atau mainan mahal yang mereka miliki.',
      'Mengerjakan tugas secara tergesa-gesa tanpa memperhatikan kerapian dan arahan guru.',
    ],
    [
      'Menuntut hak bermain sepuasnya namun enggan menjalankan kewajiban piket kelas.',
      'Membantah perkataan guru dan mengejek teman yang berani menyampaikan pendapat di depan kelas.',
      'Menyembunyikan perlengkapan sekolah milik kawan lain sebagai bahan bercandaan yang keterlaluan.',
    ],
    [
      'Menolak ajakan kerja bakti sekolah karena merasa takut lelah dan berkeringat.',
      'Hanya mau berteman akrab dengan teman yang berasal dari daerah atau suku yang sama.',
      'Membuang bungkus makanan sembarangan di bawah laci meja kelas daripada ke tempat sampah.',
    ],
    [
      'Menyerobot antrean teman saat berbaris masuk ke ruang kelas atau saat berada di kantin.',
      'Mengambil keputusan sendiri secara sepihak tanpa meminta persetujuan teman satu kelompok.',
      'Menunda-nunda tugas yang telah diberikan guru hingga waktu pengumpulan telah berakhir.',
    ],
  ];

  // Bank Opsi Jawaban Realistis untuk SMP
  const bankBenarSMP = [
    'Menganalisis permasalahan secara objektif dan mengedepankan solusi musyawarah yang berkeadilan sosial.',
    'Mengintegrasikan pelaksanaan hak dan pemenuhan kewajiban secara selaras dan seimbang dalam kehidupan bermasyarakat.',
    'Mengembangkan sikap toleransi aktif serta menghargai kemajemukan budaya dalam bingkai persatuan bangsa.',
    'Memverifikasi keabsahan setiap informasi secara kritis sebelum membagikannya demi mencegah perpecahan.',
    'Menunjukkan komitmen kebangsaan melalui aksi nyata kepedulian terhadap lingkungan dan sesama warga sekolah.',
    'Mengevaluasi alternatif tindakan berdasarkan pertimbangan etika, norma hukum, dan kemaslahatan bersama.',
  ];

  const bankDistraktorSMP = [
    [
      'Menomorsatukan kepentingan kelompok sendiri dan mengabaikan hak-hak anggota kelompok yang lain.',
      'Menyelesaikan perselisihan secara emosional tanpa memberikan ruang klarifikasi dan musyawarah.',
      'Menerima dan menyebarkan berita dari internet secara mentah-mentah tanpa memeriksa fakta sebenarnya.',
      'Menganggap keberagaman sosial budaya sebagai penghambat utama dalam kemajuan suatu bangsa.',
    ],
    [
      'Menuntut pemenuhan hak secara mutlak tanpa memedulikan kewajiban sosial yang seharusnya ditunaikan.',
      'Bersikap pasif dan acuh tak acuh terhadap permasalahan kebersihan dan ketertiban lingkungan sekitar.',
      'Mengambil tindakan sepihak yang hanya menguntungkan sebagian kecil anggota organisasi.',
      'Mengabaikan aturan tata tertib dengan dalih kebebasan berekspresi tanpa batas moralitas.',
    ],
    [
      'Menolak berinteraksi dengan kelompok lain yang memiliki sudut pandang berbeda dalam pemecahan masalah.',
      'Menyerahkan seluruh tanggung jawab pemeliharaan sarana sekolah sepenuhnya kepada petugas kebersihan.',
      'Mengutamakan popularitas pribadi di media sosial di atas nilai kejujuran dan integritas diri.',
      'Membuat kesimpulan terburu-buru tanpa didasari pengamatan fakta dan data yang valid.',
    ],
  ];

  // Bank Opsi Jawaban Realistis untuk SMA/SMK
  const bankBenarSMA = [
    'Menganalisis keterkaitan kausalitas antar variabel secara komprehensif berdasarkan prinsip keilmuan dan norma etis.',
    'Merumuskan solusi strategis yang adaptif, berkelanjutan, dan berorientasi pada kemaslahatan masyarakat luas.',
    'Mengimplementasikan prinsip tata kelola partisipatif yang menjunjung tinggi transparansi, supremasi hukum, dan keadilan.',
    'Mengevaluasi implikasi kebijakan publik berbasis data empiris yang valid untuk mengoptimalkan efisiensi sistem.',
    'Mengembangkan inovasi solutif yang memadukan wawasan kebangsaan dengan dinamika transformasi global.',
  ];

  const bankDistraktorSMA = [
    [
      'Menggeneralisasi fenomena sosial secara parsial tanpa mempertimbangkan konteks historis dan dinamika kultural.',
      'Mengedepankan efisiensi teknokratis semata dengan mengesampingkan dampak sosial kemasyarakatan jangka panjang.',
      'Menerapkan kebijakan seragam yang mengabaikan kearifan lokal serta kekhasan karakteristik daerah.',
      'Menyederhanakan problematika multidimensional menjadi sekadar isu prosedural administratif.',
    ],
    [
      'Mengambil simpulan deduktif tanpa didukung bukti metodologis yang teruji validitas dan reliabilitasnya.',
      'Menjadikan opini kelompok mayoritas sebagai tolok ukur tunggal kebenaran ilmiah dalam pemecahan masalah.',
      'Mengabaikan prinsip transparansi publik demi mempermudah eksekusi program dalam jangka pendek.',
      'Menolak adaptasi teknologi mutakhir karena kekhawatiran terhadap perubahan tata kerja konvensional.',
    ],
  ];

  // Stimulus naratif sesuai jenjang
  const getStimulus = (materi: string, index: number): string => {
    if (isSD) {
      const narasiSD = [
        `Saat kegiatan piket bersama di kelas, Made melihat seorang teman kesulitan mengangkat ember air untuk mengepel lantai.`,
        `Siti dan teman-teman sekelompoknya sedang berdiskusi untuk menentukan pembagian tugas belajar mengenai ${materi}.`,
        `Di kampung tempat tinggal Edo, warga bersama-sama mengadakan kegiatan kerja bakti membersihkan lingkungan sekitar.`,
        `Lani memiliki kawan baru di kelas yang baru saja pindah dari daerah lain dan memiliki logat berbicara yang berbeda.`,
        `Pada waktu jam istirahat sekolah, Beni menemukan sebuah tempat pensil yang tertinggal di atas meja perpustakaan.`,
        `Dayu dan teman-temannya sedang bermusyawarah secara tertib untuk memilih ketua regu kegiatan kepramukaan.`,
        `Saat bermain di halaman sekolah, Udin melihat dua orang adik kelas berselisih paham karena berebut bola mainan.`,
        `Ibu Guru mengajarkan nilai kebaikan bahwa dalam mempelajari ${materi}, kita harus senantiasa bersikap jujur dan bertanggung jawab.`,
      ];
      return narasiSD[index % narasiSD.length];
    }

    if (isSMP) {
      const narasiSMP = [
        `Dalam rangka memperingati Hari Kemerdekaan, pengurus OSIS menyelenggarakan program bakti sosial yang melibatkan seluruh perwakilan kelas.`,
        `Sekelompok siswa kelas ${profile.kelasUtama} melakukan pengamatan langsung mengenai implementasi ${materi} di lingkungan sekolah.`,
        `Berdasarkan laporan hasil diskusi kelompok remaja mengenai tantangan menjaga toleransi dan kerukunan di era media digital:`,
        `Saat terjadi perbedaan pendapat yang cukup tajam dalam musyawarah penataan mading sekolah, ketua kelas berinisiatif menengahi.`,
        `Dalam sebuah proyek investigasi sederhana, peserta didik menganalisis korelasi antara penerapan ${materi} dan ketertiban umum.`,
      ];
      return narasiSMP[index % narasiSMP.length];
    }

    // SMA
    const narasiSMA = [
      `Berdasarkan studi komparatif mengenai dinamika penerapan prinsip ${materi} dalam merespons tantangan sosial di era modern:`,
      `Sebuah penelitian sosiologis di lingkungan perkotaan mengungkap bahwa efektivitas pelaksanaan ${materi} dipengaruhi oleh kesadaran partisipatif masyarakat.`,
      `Dalam seminar kepemudaan, peserta mendiskusikan dilema moral dan hukum yang muncul terkait penegakan ${materi} di ruang publik digital.`,
      `Data survei kepuasan publik menunjukkan adanya disparitas pemahaman antara regulasi formal dan implementasi nyata materi ${materi}.`,
    ];
    return narasiSMA[index % narasiSMA.length];
  };

  // Pertanyaan sesuai jenjang
  const getPertanyaan = (materi: string, index: number): string => {
    if (isSD) {
      const pertanyaanSD = [
        `Berdasarkan cerita di atas, contoh tindakan terpuji yang mencerminkan materi "${materi}" adalah...`,
        `Sikap terbaik yang sebaiknya ditunjukkan oleh seorang siswa yang bertanggung jawab berkaitan dengan ${materi} adalah...`,
        `Manfaat positif yang akan kita rasakan bersama jika mengamalkan nilai-nilai ${materi} dalam kehidupan sehari-hari adalah...`,
        `Tindakan berikut ini yang merupakan contoh penerapan ${materi} yang tepat di lingkungan sekolah adalah...`,
        `Jika kita menghadapi situasi seperti cerita di atas, sikap bijaksana yang perlu kita lakukan adalah...`,
      ];
      return pertanyaanSD[index % pertanyaanSD.length];
    }

    if (isSMP) {
      const pertanyaanSMP = [
        `Berdasarkan narasi peristiwa di atas, langkah strategis yang paling tepat berkaitan dengan esensi ${materi} adalah...`,
        `Pernyataan berikut yang paling akurat merefleksikan hubungan timbal balik antara pemahaman ${materi} dan kehidupan sosial adalah...`,
        `Solusi konstruktif yang sesuai dengan prinsip demokrasi Pancasila dan capaian ${materi} adalah...`,
        `Sikap kritis yang sebaiknya dikembangkan oleh generasi muda dalam menyikapi persoalan ${materi} tersebut adalah...`,
      ];
      return pertanyaanSMP[index % pertanyaanSMP.length];
    }

    // SMA
    const pertanyaanSMA = [
      `Berdasarkan analisis terhadap fenomena tersebut, simpulan paling rasional dan berkeadilan mengenai prinsip ${materi} adalah...`,
      `Implikasi yuridis dan sosiologis utama dari inkonsistensi pelaksanaan ${materi} sebagaimana diuraikan dalam wacana adalah...`,
      `Strategi intervensi kebijakan yang paling efektif untuk memitigasi dampak negatif pada kasus ${materi} tersebut adalah...`,
      `Argumen ilmiah yang paling valid untuk mempertahankan relevansi nilai-nilai dasar ${materi} di tengah perubahan sosial adalah...`,
    ];
    return pertanyaanSMA[index % pertanyaanSMA.length];
  };

  // Dapatkan Bank Soal Otentik Sesuai Mata Pelajaran & Jenjang (Pendidikan Pancasila, IPAS, Matematika, B. Indo, B. Inggris, dll)
  const domainReq: GenerationRequest = {
    mataPelajaran: profile.mataPelajaranUtama || 'Pendidikan Pancasila',
    jenjangFase: isSD ? 'Fase B (Kelas 3-4 SD)' : isSMA ? 'Fase E (Kelas 10 SMA/SMK)' : 'Fase D (Kelas 7-9 SMP)',
    kelas: profile.kelasUtama || (isSD ? '3' : isSMA ? '10' : '7'),
    tipeAsesmen: tipe === 'STS' ? 'Sumatif (Tengah Semester / STS)' : 'Sumatif (Akhir Semester / SAS)',
    materiPokok: activeTPs[0]?.materiPokok || 'Materi Inti Semester',
    tujuanPembelajaranInput: activeTPs.map((t) => t.tujuanPembelajaran).join('; '),
    jumlahPG,
    jumlahPGK,
    jumlahUraian,
    levelKognitif: 'Campuran Berimbang',
    sertakanRubrik: true,
    alokasiWaktu,
  };

  const domainBank = getQuestionBankForRequest(domainReq, isSMA);

  // 1. Generate Soal Pilihan Ganda (PG)
  const soalPG: SoalPilihanGanda[] = [];
  const kunciPG: KunciJawabanUjian[] = [];

  for (let i = 0; i < jumlahPG; i++) {
    const no = i + 1;
    const tp = activeTPs[i % activeTPs.length];

    // Jalur Utama: Gunakan butir soal otentik dari Domain Question Bank jika tersedia
    if (domainBank && domainBank.pgPool && domainBank.pgPool.length > 0) {
      const tpl = domainBank.pgPool[i % domainBank.pgPool.length];
      const cycle = Math.floor(i / domainBank.pgPool.length);

      const rawOptions = [...tpl.opsi5];
      while (rawOptions.length < labelOptions.length) {
        rawOptions.push(`Pilihan jawaban ${rawOptions.length + 1}`);
      }
      const trimmed = rawOptions.slice(0, labelOptions.length);

      const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
      const origKeyIdx = letterToIndex[tpl.kunci] ?? 0;
      const targetIdx = i % labelOptions.length;
      const targetLetter = labelOptions[targetIdx];
      const correctText = trimmed[origKeyIdx] ?? trimmed[0];

      if (origKeyIdx !== targetIdx && origKeyIdx < trimmed.length) {
        const temp = trimmed[targetIdx];
        trimmed[targetIdx] = trimmed[origKeyIdx];
        trimmed[origKeyIdx] = temp;
      }

      const pilihan = labelOptions.map((label, idx) => ({
        label,
        teks: trimmed[idx] || correctText,
      }));

      const updatedPembahasan = tpl.pembahasan
        .replace(/\(Pilihan\s+[A-E]\)/g, `(Pilihan ${targetLetter})`)
        .replace(/adalah\s+pilihan\s+[A-E]\b/gi, `adalah pilihan ${targetLetter}`)
        .replace(/jawaban\s+yang\s+tepat\s+adalah\s+[A-E]\b/gi, `jawaban yang tepat adalah ${targetLetter}`);

      const prefix = cycle > 0 ? `[Pengayaan Butir #${cycle + 1}] ` : '';

      soalPG.push({
        id: `soal_pg_${no}`,
        nomor: no,
        tipe: 'pilihan_ganda',
        stimulus: tpl.stimulus,
        pertanyaan: `${prefix}${tpl.pertanyaan}`,
        pilihan,
        kunci: targetLetter,
        pembahasan: `${updatedPembahasan} [Kunci: ${targetLetter}]`,
        levelKognitif: tpl.levelKognitif,
        indikatorSoal: tpl.indikatorSoal || `Disajikan stimulus kontekstual tentang ${tp.materiPokok}, peserta didik mampu menentukan jawaban yang paling tepat.`,
        skor: 1,
      });

      kunciPG.push({
        nomor: no,
        tipe: 'pilihan_ganda',
        kunci: targetLetter,
        pembahasan: `${updatedPembahasan} [Kunci: ${targetLetter}]`,
        skor: 1,
      });
      continue;
    }

    // Jalur Cadangan Kontekstual
    const correctLetter = labelOptions[i % labelOptions.length];
    const stimulus = getStimulus(tp.materiPokok, i);
    const pertanyaan = getPertanyaan(tp.materiPokok, i);

    // Dapatkan teks jawaban benar
    let teksBenar = '';
    if (isSD) {
      teksBenar = bankBenarSD[i % bankBenarSD.length];
    } else if (isSMP) {
      teksBenar = bankBenarSMP[i % bankBenarSMP.length];
    } else {
      teksBenar = bankBenarSMA[i % bankBenarSMA.length];
    }

    // Dapatkan kumpulan distraktor
    let distractorPool: string[] = [];
    if (isSD) {
      distractorPool = bankDistraktorSD[i % bankDistraktorSD.length];
    } else if (isSMP) {
      distractorPool = bankDistraktorSMP[i % bankDistraktorSMP.length];
    } else {
      distractorPool = bankDistraktorSMA[i % bankDistraktorSMA.length];
    }

    // Susun pilihan A, B, C, D (atau E)
    let distractorIndex = 0;
    const pilihan = labelOptions.map((opt) => {
      if (opt === correctLetter) {
        return { label: opt, teks: teksBenar };
      }
      const distText = distractorPool[distractorIndex % distractorPool.length];
      distractorIndex++;
      return { label: opt, teks: distText };
    });

    const pembahasan = isSD
      ? `Kunci jawaban ${correctLetter}: Opsi ini merupakan cerminan sikap terpuji, adil, dan bertanggung jawab yang sesuai dengan materi "${tp.materiPokok}".`
      : isSMP
      ? `Kunci jawaban ${correctLetter}: Pilihan ini mengedepankan nalar kritis, musyawarah, dan pemenuhan tanggung jawab sosial sesuai capaian ${tp.kode}.`
      : `Kunci jawaban ${correctLetter}: Opsi ini menyajikan argumentasi paling komprehensif, logis, dan koheren dengan landasan teori materi ${tp.materiPokok}.`;

    const levelKognitif = isSD
      ? (i % 2 === 0 ? 'C2 (Memahami)' : 'C3 (Menerapkan)')
      : (i % 3 === 0 ? 'C4 (Menganalisis)' : i % 2 === 0 ? 'C3 (Menerapkan)' : 'C2 (Memahami)');

    soalPG.push({
      id: `soal_pg_${no}`,
      nomor: no,
      tipe: 'pilihan_ganda',
      stimulus,
      pertanyaan,
      pilihan,
      kunci: correctLetter,
      pembahasan,
      levelKognitif,
      indikatorSoal: `Disajikan stimulus kontekstual tentang ${tp.materiPokok}, peserta didik mampu menentukan pilihan sikap/solusi yang paling tepat.`,
      skor: 1,
    });

    kunciPG.push({
      nomor: no,
      tipe: 'pilihan_ganda',
      kunci: correctLetter,
      pembahasan,
      skor: 1,
    });
  }

  // 2. Generate Soal Pilihan Ganda Kompleks (PGK)
  const soalPGK: SoalPilihanGandaKompleks[] = [];
  const kunciPGK: KunciJawabanUjian[] = [];

  for (let j = 0; j < jumlahPGK; j++) {
    const no = jumlahPG + j + 1;
    const tp = activeTPs[(jumlahPG + j) % activeTPs.length];

    // Jalur Utama: Ambil butir soal PGK dari domain bank jika tersedia
    if (domainBank && domainBank.pgkPool && domainBank.pgkPool.length > 0) {
      const tpl = domainBank.pgkPool[j % domainBank.pgkPool.length];
      const cycle = Math.floor(j / domainBank.pgkPool.length);
      const prefix = cycle > 0 ? `[Analisis Lanjutan #${cycle + 1}] ` : '';

      const pernyataan = tpl.pernyataan.map((p, idx) => ({
        id: `p_${no}_${idx + 1}`,
        teks: p.teks,
        isBenar: p.isBenar,
      }));

      const formatKunciPGK = pernyataan.map((p, idx) => `(${idx + 1}) ${p.isBenar ? 'B' : 'S'}`).join(', ');

      soalPGK.push({
        id: `soal_pgk_${no}`,
        nomor: no,
        tipe: 'pilihan_ganda_kompleks',
        stimulus: tpl.stimulus,
        pertanyaan: `${prefix}${tpl.pertanyaan}`,
        pernyataan,
        pembahasan: tpl.pembahasan,
        levelKognitif: isSD ? 'C3 (Menerapkan)' : 'C4 (Menganalisis)',
        indikatorSoal: tpl.indikatorSoal || `Peserta didik mampu memvalidasi kebenaran butir pernyataan terkait ${tp.materiPokok}.`,
        skor: 2,
      });

      kunciPGK.push({
        nomor: no,
        tipe: 'pilihan_ganda_kompleks',
        kunci: formatKunciPGK,
        pembahasan: `Kunci: ${formatKunciPGK}`,
        skor: 2,
      });
      continue;
    }

    let pernyataan: { id: string; teks: string; isBenar: boolean }[] = [];

    if (isSD) {
      pernyataan = [
        {
          id: `p_${no}_1`,
          teks: `Membantu teman yang sedang mengalami kesulitan saat belajar merupakan pengamalan sikap yang terpuji.`,
          isBenar: true,
        },
        {
          id: `p_${no}_2`,
          teks: `Tata tertib sekolah hanya perlu ditaati ketika ada bapak atau ibu guru yang sedang memperhatikan.`,
          isBenar: false,
        },
        {
          id: `p_${no}_3`,
          teks: `Menghargai pendapat teman yang berbeda saat berdiskusi dapat menciptakan kerukunan di kelas.`,
          isBenar: true,
        },
        {
          id: `p_${no}_4`,
          teks: `Kita boleh mengejek kawan yang memiliki kegemaran atau kebiasaan yang berbeda dengan kita.`,
          isBenar: false,
        },
      ];
    } else if (isSMP) {
      pernyataan = [
        {
          id: `p_${no}_1`,
          teks: `Pelaksanaan hak warga negara harus senantiasa diimbangi dengan kesadaran menunaikan kewajiban sosial.`,
          isBenar: true,
        },
        {
          id: `p_${no}_2`,
          teks: `Keberagaman suku dan budaya di Indonesia merupakan ancaman bagi persatuan dan kemajuan bangsa.`,
          isBenar: false,
        },
        {
          id: `p_${no}_3`,
          teks: `Musyawarah mufakat merupakan mekanisme penyelesaian masalah bersama yang mengutamakan kepentingan umum.`,
          isBenar: true,
        },
        {
          id: `p_${no}_4`,
          teks: `Keputusan sepihak lebih efektif dan demokratis dibandingkan keputusan yang diambil melalui musyawarah.`,
          isBenar: false,
        },
      ];
    } else {
      pernyataan = [
        {
          id: `p_${no}_1`,
          teks: `Penerapan prinsip ${tp.materiPokok} secara konsisten berkorelasi positif terhadap stabilitas tatanan hukum dan sosial.`,
          isBenar: true,
        },
        {
          id: `p_${no}_2`,
          teks: `Prinsip supremasi hukum dapat dikesampingkan jika bertentangan dengan kehendak kelompok mayoritas.`,
          isBenar: false,
        },
        {
          id: `p_${no}_3`,
          teks: `Transparansi dan akuntabilitas publik adalah pilar fundamental dalam mencegah distorsi kewenangan kekuasaan.`,
          isBenar: true,
        },
        {
          id: `p_${no}_4`,
          teks: `Dinamika globalisasi meniadakan relevansi nilai kearifan lokal dalam perumusan kebijakan publik nasional.`,
          isBenar: false,
        },
      ];
    }

    const stimulusPGK = isSD
      ? `Bacalah dengan saksama beberapa pernyataan tentang kebiasaan hidup rukun dan bertanggung jawab di lingkungan sekolah berikut ini:`
      : `Cermatilah infografis naratif mengenai dinamika penerapan ${tp.materiPokok} dalam kehidupan nyata peserta didik berikut:`;

    const pertanyaanPGK = `Tentukan kebenaran dari setiap butir pernyataan di bawah ini dengan memberi tanda centang (✓) pada kolom Benar atau Salah!`;

    const pembahasanPGK = `Pernyataan 1 dan 3 bernilai BENAR karena merefleksikan nilai-nilai positif materi. Pernyataan 2 dan 4 bernilai SALAH karena bertentangan dengan norma dan aturan bersama.`;

    soalPGK.push({
      id: `soal_pgk_${no}`,
      nomor: no,
      tipe: 'pilihan_ganda_kompleks',
      stimulus: stimulusPGK,
      pertanyaan: pertanyaanPGK,
      pernyataan,
      pembahasan: pembahasanPGK,
      levelKognitif: isSD ? 'C3 (Menerapkan)' : 'C4 (Menganalisis)',
      indikatorSoal: `Peserta didik mampu memvalidasi kebenaran butir pernyataan etis/analitis terkait materi ${tp.materiPokok}.`,
      skor: 2,
    });

    const formatKunciPGK = pernyataan.map((p, idx) => `(${idx + 1}) ${p.isBenar ? 'B' : 'S'}`).join(', ');
    kunciPGK.push({
      nomor: no,
      tipe: 'pilihan_ganda_kompleks',
      kunci: formatKunciPGK,
      pembahasan: `Kunci: ${formatKunciPGK}`,
      skor: 2,
    });
  }

  // 3. Generate Soal Uraian HOTS
  const soalUraian: SoalUraian[] = [];
  const rubrikUraian: RubrikUraianUjian[] = [];

  const daftarUraianSD = [
    {
      tanya: `Tuliskan 2 (dua) contoh perbuatan baik yang dapat kamu lakukan di sekolah terkait dengan materi `,
      jawab: `1. Membantu teman yang sedang kesulitan belajar atau membawa barang tanpa pamrih.\n2. Mengikuti kegiatan piket kebersihan kelas secara tertib dan bersikap sopan kepada bapak/ibu guru.`,
      kriteria: [
        { skor: 4, deskripsi: 'Menyebutkan 2 contoh perbuatan baik secara tepat, jelas, dan sangat sesuai dengan kehidupan sehari-hari.' },
        { skor: 3, deskripsi: 'Menyebutkan 2 contoh, namun 1 contoh masih kurang jelas penjelasannya.' },
        { skor: 2, deskripsi: 'Hanya menyebutkan 1 contoh perbuatan baik yang relevan.' },
        { skor: 1, deskripsi: 'Memberikan jawaban yang sangat singkat atau kurang tepat.' },
        { skor: 0, deskripsi: 'Tidak menuliskan jawaban sama sekali.' },
      ],
    },
    {
      tanya: `Mengapa kita harus saling menghormati dan bekerja sama dengan teman di sekolah? Jelaskan dengan kalimatmu sendiri!`,
      jawab: `Kita harus saling menghormati dan bekerja sama agar suasana di kelas menjadi rukun, belajar terasa menyenangkan, dan kita memiliki banyak teman yang saling menyayangi.`,
      kriteria: [
        { skor: 4, deskripsi: 'Menjelaskan alasan secara runtut, jelas, dan memuat nilai kerukunan serta kerja sama.' },
        { skor: 3, deskripsi: 'Menjelaskan alasan dengan baik meskipun bahasanya masih sangat sederhana.' },
        { skor: 2, deskripsi: 'Alasan yang disampaikan kurang lengkap atau kurang mengena pada inti soal.' },
        { skor: 1, deskripsi: 'Hanya menuliskan satu atau dua kata tanpa kalimat yang utuh.' },
        { skor: 0, deskripsi: 'Tidak menjawab.' },
      ],
    },
    {
      tanya: `Sebutkan manfaat yang kita peroleh jika selalu mematuhi tata tertib sekolah dan hidup rukun bersama teman!`,
      jawab: `Manfaatnya adalah kelas menjadi tertib, kegiatan belajar berjalan lancar tanpa pertengkaran, dan sekolah menjadi tempat yang aman dan nyaman bagi semua anak.`,
      kriteria: [
        { skor: 4, deskripsi: 'Menjelaskan 2 atau lebih manfaat nyata dengan kalimat yang baik dan tepat.' },
        { skor: 3, deskripsi: 'Menjelaskan 1-2 manfaat secara singkat.' },
        { skor: 2, deskripsi: 'Menjelaskan manfaat namun masih kurang relevan dengan tata tertib.' },
        { skor: 1, deskripsi: 'Jawaban sangat terbatas.' },
        { skor: 0, deskripsi: 'Tidak ada jawaban.' },
      ],
    },
    {
      tanya: `Bagaimana sikapmu jika melihat ada teman sekelas yang berselisih paham saat bermain bersama di waktu istirahat?`,
      jawab: `Sikap saya adalah berusaha melerai mereka secara baik-baik, menasihati agar saling memaafkan dan berdamai, atau segera memberitahukan kepada bapak/ibu guru jika mereka tidak mau berhenti bertengkar.`,
      kriteria: [
        { skor: 4, deskripsi: 'Menyampaikan sikap melerai secara damai dan melibatkan guru secara bijak.' },
        { skor: 3, deskripsi: 'Menyampaikan sikap melerai namun belum lengkap langkah penyelesaiannya.' },
        { skor: 2, deskripsi: 'Hanya menjawab melapor guru tanpa ada inisiatif baik.' },
        { skor: 1, deskripsi: 'Jawaban kurang tepat.' },
        { skor: 0, deskripsi: 'Tidak menjawab.' },
      ],
    },
    {
      tanya: `Tuliskan apa saja kewajiban seorang murid di dalam kelas saat kegiatan pembelajaran sedang berlangsung!`,
      jawab: `Kewajiban murid antara lain: mendengarkan penjelasan guru dengan tenang, tidak berbicara sendiri saat guru menerangkan, dan mengerjakan tugas yang diberikan dengan sungguh-sungguh.`,
      kriteria: [
        { skor: 4, deskripsi: 'Menyebutkan 2-3 kewajiban murid di kelas secara tepat dan jelas.' },
        { skor: 3, deskripsi: 'Menyebutkan 2 kewajiban dengan baik.' },
        { skor: 2, deskripsi: 'Hanya menyebutkan 1 kewajiban.' },
        { skor: 1, deskripsi: 'Jawaban kurang sesuai konteks belajar di kelas.' },
        { skor: 0, deskripsi: 'Tidak menjawab.' },
      ],
    },
  ];

  for (let k = 0; k < jumlahUraian; k++) {
    const no = jumlahPG + jumlahPGK + k + 1;
    const tp = activeTPs[(jumlahPG + jumlahPGK + k) % activeTPs.length];

    // Jalur Utama: Ambil butir soal Uraian dari domain bank jika tersedia
    if (domainBank && domainBank.uraianPool && domainBank.uraianPool.length > 0) {
      const tpl = domainBank.uraianPool[k % domainBank.uraianPool.length];
      const cycle = Math.floor(k / domainBank.uraianPool.length);
      const prefix = cycle > 0 ? `[Studi Kasus Mandiri #${cycle + 1}] ` : '';

      const uraianPertanyaan = `${prefix}${tpl.pertanyaan}`;
      const contohJawaban = tpl.contohJawaban;
      const pedomanPenskoran = tpl.pedomanPenskoran;

      const kriteriaSkor = [
        { skor: 4, deskripsi: 'Penjelasan lengkap, analisis sangat logis, dan memuat contoh solusi konkret yang akurat sesuai konsep materi.' },
        { skor: 3, deskripsi: 'Penjelasan baik dan alasan cukup tepat, meskipun beberapa detail masih bersifat umum.' },
        { skor: 2, deskripsi: 'Penjelasan cukup, namun pemahaman konsep masih terbatas atau contoh kurang spesifik.' },
        { skor: 1, deskripsi: 'Jawaban sangat singkat dan pemahaman konsep masih minim atau parsial.' },
        { skor: 0, deskripsi: 'Tidak ada jawaban atau jawaban menyimpang dari topik soal.' },
      ];

      soalUraian.push({
        id: `soal_uraian_${no}`,
        nomor: no,
        tipe: 'uraian',
        stimulus: tpl.stimulus,
        pertanyaan: uraianPertanyaan,
        pedomanPenskoran,
        contohJawaban,
        levelKognitif: isSD ? 'C3-C4 (Aplikasi & Pemecahan Masalah)' : 'C4-C5 (Evaluasi & Analisis Kritis)',
        indikatorSoal: tpl.indikatorSoal || `Disajikan studi kasus tentang ${tp.materiPokok}, peserta didik mampu menyusun uraian jawaban secara terstruktur.`,
        skorMaksimal: 4,
      });

      rubrikUraian.push({
        nomor: no,
        soalRingkas: uraianPertanyaan.slice(0, 100),
        kriteriaSkor,
        skorMaksimal: 4,
      });
      continue;
    }

    let uraianPertanyaan = '';
    let contohJawaban = '';
    let kriteriaSkor = [
      { skor: 4, deskripsi: 'Penjelasan lengkap, alasan esensial sangat logis, dan memuat 2 contoh solusi konkret yang relevan.' },
      { skor: 3, deskripsi: 'Penjelasan baik, alasan cukup tepat, dan memuat 1-2 contoh solusi yang relevan.' },
      { skor: 2, deskripsi: 'Penjelasan cukup, namun contoh penerapan kurang spesifik atau kurang kontekstual.' },
      { skor: 1, deskripsi: 'Jawaban sangat singkat, pemahaman konsep masih sangat minim atau parsial.' },
      { skor: 0, deskripsi: 'Tidak ada jawaban atau jawaban menyimpang dari topik soal.' },
    ];

    if (isSD) {
      const itemUraian = daftarUraianSD[k % daftarUraianSD.length];
      uraianPertanyaan = `${itemUraian.tanya} "${tp.materiPokok}"!`;
      contohJawaban = itemUraian.jawab;
      kriteriaSkor = itemUraian.kriteria;
    } else if (isSMP) {
      uraianPertanyaan = `Jelaskan mengapa pemahaman mengenai "${tp.materiPokok}" sangat penting bagi generasi muda saat ini! Berikan 2 (dua) contoh konkret aksi nyata yang dapat kalian terapkan di lingkungan sekolah atau masyarakat!`;
      contohJawaban = `Pemahaman tentang ${tp.materiPokok} penting sebagai fondasi karakter dan etika dalam bergaul serta berorganisasi. Dua contoh aksi nyata:\n1. Mengedepankan musyawarah dalam setiap penyelesaian masalah antarsiswa di sekolah.\n2. Berpartisipasi aktif dalam kegiatan sosial kemasyarakatan dengan menjunjung tinggi nilai persatuan.`;
    } else {
      uraianPertanyaan = `Analisislah korelasi kritis antara penerapan prinsip "${tp.materiPokok}" dengan upaya penguatan integrasi nasional! Berikan rekomendasi solutif yang aplikatif untuk mengatasi hambatan implementasinya di era digital!`;
      contohJawaban = `Penerapan ${tp.materiPokok} berfungsi sebagai katalisator kohesi sosial dan benteng pertahanan moral di ruang publik. Rekomendasi solutif mencakup penguatan literasi digital berbasis etika kebangsaan dan penegakan regulasi yang adil serta transparan.`;
    }

    const pedomanPenskoran = kriteriaSkor.map((kr) => `Skor ${kr.skor}: ${kr.deskripsi}`).join('\n');

    soalUraian.push({
      id: `soal_uraian_${no}`,
      nomor: no,
      tipe: 'uraian',
      stimulus: isSD
        ? `Perhatikan pertanyaan uraian berikut dengan saksama dan tulislah jawabanmu secara rapi!`
        : `Studi Kasus Pembelajaran Mendalam terkait materi ${tp.materiPokok}:`,
      pertanyaan: uraianPertanyaan,
      pedomanPenskoran,
      contohJawaban,
      levelKognitif: isSD ? 'C3 (Menerapkan) / C4 (Menjelaskan)' : 'C5 (Mengevaluasi) / C6 (Mencipta)',
      indikatorSoal: `Peserta didik mampu menguraikan alasan dan memberikan contoh nyata penerapan materi ${tp.materiPokok}.`,
      skorMaksimal: 4,
    });

    rubrikUraian.push({
      nomor: no,
      soalRingkas: `Uraian penerapan dan contoh nyata materi ${tp.materiPokok}`,
      kriteriaSkor,
      skorMaksimal: 4,
    });
  }

  // Hitung distribusi TP
  const tpTerliput = activeTPs.map((tp, idx) => {
    const alokasi = Math.max(1, Math.round((jumlahPG + jumlahPGK + jumlahUraian) / activeTPs.length));
    return {
      kode: tp.kode || `TP-${String(idx + 1).padStart(2, '0')}`,
      materiPokok: tp.materiPokok || tp.tujuanPembelajaran,
      alokasiSoal: alokasi,
    };
  });

  const totalSoal = jumlahPG + jumlahPGK + jumlahUraian;
  const skorMaksimalTotal = (jumlahPG * 1) + (jumlahPGK * 2) + (jumlahUraian * 4);

  return {
    id: `exam_${tipe.toLowerCase()}_${Date.now()}`,
    tipe,
    namaUjian: namaUjianLengkap,
    mataPelajaran: profile.mataPelajaranUtama || 'Mata Pelajaran',
    jenjang: profile.jenjang,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    alokasiWaktu,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    petunjukUmum,
    tpTerliput,
    soalPG,
    soalPGK,
    soalUraian,
    kunciPG,
    kunciPGK,
    rubrikUraian,
    totalSoal,
    skorMaksimalTotal,
    tanggalPenyusunan: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}
