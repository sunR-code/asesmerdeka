export interface KKORecommendationItem {
  verb: string;
  kategori: 'Pemahaman Konsep' | 'Penalaran & Analisis' | 'Penerapan & Pemodelan' | 'Karya, Komunikasi & Sikap';
  alasan: string;
  contohBukti: string;
}

export interface KKOAnalysisReport {
  needsRefinement: boolean;
  isBlocking: false;
  detectedGeneralVerbs: string[];
  alasan: string;
  catatanKonteksMapel: string;
  rekomendasiKKO: KKORecommendationItem[];
  contohRumusanTP: string[];
  saranBuktiKetercapaian: string[];
}

const GENERAL_VERBS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bmemahami\b/i, label: 'memahami' },
  { pattern: /\bpemahaman\b/i, label: 'pemahaman' },
  { pattern: /\bmengetahui\b/i, label: 'mengetahui' },
  { pattern: /\bmengerti\b/i, label: 'mengerti' },
  { pattern: /\bmengenal\b/i, label: 'mengenal' },
  { pattern: /\bmempelajari\b/i, label: 'mempelajari' },
  { pattern: /\bmenguasai\b/i, label: 'menguasai' },
  { pattern: /\bmenyadari\b/i, label: 'menyadari' },
  { pattern: /\bmenghayati\b/i, label: 'menghayati' },
  { pattern: /\bmenikmati\b/i, label: 'menikmati' },
];

const MEASURABLE_KKO_CATALOG: KKORecommendationItem[] = [
  {
    verb: 'menjelaskan',
    kategori: 'Pemahaman Konsep',
    alasan: 'Menuntut murid menguraikan hubungan sebab-akibat atau makna konsep dengan bahasanya sendiri.',
    contohBukti: 'Murid menjelaskan langkah dan alasan logis di balik konsep secara lisan maupun tertulis.',
  },
  {
    verb: 'mengidentifikasi',
    kategori: 'Pemahaman Konsep',
    alasan: 'Dapat diamati langsung melalui ketepatan murid memilih ciri, pola, atau unsur pada contoh nyata.',
    contohBukti: 'Murid menandai minimal 3 unsur kunci dan membedakan contoh dari bukan contoh.',
  },
  {
    verb: 'menganalisis',
    kategori: 'Penalaran & Analisis',
    alasan: 'Mengukur kemampuan memecah informasi, membandingkan bukti, dan menemukan hubungan antarbagian.',
    contohBukti: 'Murid menguraikan faktor penyebab dan membandingkan data pada studi kasus.',
  },
  {
    verb: 'memodelkan',
    kategori: 'Penerapan & Pemodelan',
    alasan: 'Cocok untuk Sains, Matematika, IPS, dan Informatika agar murid menerjemahkan masalah nyata ke representasi konsep.',
    contohBukti: 'Murid menyusun model/diagram/persamaan yang merepresentasikan situasi masalah dengan satuan tepat.',
  },
  {
    verb: 'menyelesaikan',
    kategori: 'Penerapan & Pemodelan',
    alasan: 'Terukur melalui ketepatan prosedur dan kewajaran hasil penyelesaian masalah kontekstual.',
    contohBukti: 'Murid menuliskan langkah penyelesaian runtut serta memeriksa kesesuaian jawaban akhir.',
  },
  {
    verb: 'mendemonstrasikan',
    kategori: 'Karya, Komunikasi & Sikap',
    alasan: 'Ideal untuk Agama/Budi Pekerti, PJOK, Seni, Bahasa, dan Kejuruan karena sikap/keterampilan tampak melalui unjuk kerja.',
    contohBukti: 'Murid mempraktikkan prosedur atau perilaku nyata sesuai daftar cek observasi.',
  },
  {
    verb: 'menyusun',
    kategori: 'Karya, Komunikasi & Sikap',
    alasan: 'Menghasilkan artefak konkret (teks, laporan, rencana, prototipe) yang dapat dinilai memakai rubrik.',
    contohBukti: 'Murid menghasilkan produk terstruktur yang memenuhi kriteria isi dan keterpaduan.',
  },
  {
    verb: 'mengevaluasi',
    kategori: 'Penalaran & Analisis',
    alasan: 'Mendorong murid menilai ketepatan argumen, solusi, atau keputusan berdasarkan kriteria yang jelas.',
    contohBukti: 'Murid memberikan penilaian disertai alasan berbasis bukti atau norma yang disepakati.',
  },
];

function resolveSubjectContextNote(mataPelajaran?: string): string {
  const lower = (mataPelajaran || '').toLowerCase();
  if (lower.includes('agama') || lower.includes('pancasila') || lower.includes('akidah') || lower.includes('fikih')) {
    return 'Pada mapel Agama, Akidah, atau Pendidikan Pancasila, kata seperti "memahami" atau "menyadari" tetap boleh dipertahankan bila dilengkapi indikator perilaku/praktik yang dapat diamati (misalnya melalui demonstrasi, studi kasus nilai, atau refleksi).';
  }
  if (lower.includes('pjok') || lower.includes('seni') || lower.includes('kejuruan') || lower.includes('pkk')) {
    return 'Pada mapel praktik/kejuruan/seni/PJOK, utamakan kata kerja unjuk kerja (mendemonstrasikan, mempraktikkan, merancang, mengoperasikan) beserta kriteria K3 atau rubrik kinerja.';
  }
  if (lower.includes('bahasa')) {
    return 'Pada mapel Bahasa, padukan KKO berbahasa yang jelas (menelaah, menyimpulkan informasi, menyusun teks, mempresentasikan) sesuai elemen Menyimak, Membaca, Berbicara, atau Menulis.';
  }
  return 'Sesuai Panduan Pembelajaran dan Asesmen Edisi Revisi 2025, TP sebaiknya memadukan Kompetensi terukur dan Lingkup Materi, namun konteks kelas tetap menjadi keputusan guru.';
}

export function analyzeTPMeasurability(params: {
  tujuanPembelajaran: string;
  kompetensi?: string;
  lingkupMateri?: string;
  materiPokok?: string;
  mataPelajaran?: string;
}): KKOAnalysisReport {
  const combinedText = `${params.kompetensi || ''} ${params.tujuanPembelajaran || ''}`.trim();
  const detectedGeneralVerbs: string[] = [];

  for (const item of GENERAL_VERBS) {
    if (item.pattern.test(combinedText)) {
      detectedGeneralVerbs.push(item.label);
    }
  }

  const scopePhrase =
    (params.lingkupMateri || '').trim() ||
    (params.materiPokok || '').trim() ||
    'materi pokok yang dipelajari';

  const hasText = combinedText.length > 0;
  const needsRefinement = hasText && detectedGeneralVerbs.length > 0;
  const alasan = needsRefinement
    ? `Ditemukan kata kerja umum (${detectedGeneralVerbs.join(', ')}) yang sulit diamati secara langsung tanpa indikator unjuk kerja. Pertimbangkan menggantinya atau melengkapinya dengan bukti ketercapaian konkret. Guru tetap memegang keputusan akhir.`
    : hasText
    ? 'Rumusan TP tidak hanya bergantung pada kata kerja umum dan dapat langsung ditautkan ke bukti ketercapaian. Anda tetap dapat memilih variasi KKO di bawah sesuai strategi asesmen.'
    : 'Tuliskan rumusan TP atau Kompetensi untuk memperoleh rekomendasi KKO yang lebih terukur.';

  const chosenVerbs = needsRefinement
    ? [MEASURABLE_KKO_CATALOG[0], MEASURABLE_KKO_CATALOG[2], MEASURABLE_KKO_CATALOG[4], MEASURABLE_KKO_CATALOG[5]]
    : [MEASURABLE_KKO_CATALOG[1], MEASURABLE_KKO_CATALOG[2], MEASURABLE_KKO_CATALOG[6], MEASURABLE_KKO_CATALOG[7]];

  const contohRumusanTP = [
    `Peserta didik mampu menjelaskan dan mengidentifikasi unsur penting pada ${scopePhrase} menggunakan contoh konkret.`,
    `Peserta didik mampu menganalisis permasalahan kontekstual terkait ${scopePhrase} serta menyelesaikan langkah pemecahannya secara runtut.`,
    `Peserta didik mampu mendemonstrasikan atau menyusun karya terstruktur tentang ${scopePhrase} sesuai rubrik kriteria.`,
  ];

  const saranBuktiKetercapaian = chosenVerbs.map(
    (v) => `${v.contohBukti} (konteks: ${scopePhrase})`
  );

  return {
    needsRefinement,
    isBlocking: false,
    detectedGeneralVerbs,
    alasan,
    catatanKonteksMapel: resolveSubjectContextNote(params.mataPelajaran),
    rekomendasiKKO: MEASURABLE_KKO_CATALOG,
    contohRumusanTP,
    saranBuktiKetercapaian,
  };
}
