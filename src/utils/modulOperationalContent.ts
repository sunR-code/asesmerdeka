import type {
  LKPDDokumen,
  LKPDPresetType,
  ModulAjarDokumen,
  ModulAsesmenDetail,
  ModulContohLKPD,
  ModulDiferensiasiOperasional,
  ModulKKTPReferensi,
  SMKSubjectTrack,
} from '../types/perangkatAjar';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { computeDynamicKKTPBands } from './learningMasteryEngine';
import { resolveSubjectFamily, type SubjectFamily } from './lkpdSubjectBlueprints';
import type { ModulAjarModelType } from './modulPedagogicalModels';
import type { JenjangKategoriModul } from './modulTimeBudget';

type DeepMaterials = NonNullable<ModulAjarDokumen['bahanBacaan']>;

function clampExplicitThreshold(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  const rounded = Math.round(val);
  if (rounded < 1 || rounded > 100) return null;
  return rounded;
}

/**
 * Mengambil konfigurasi KKTP secara dinamis hanya bila sekolah / TP menetapkan angka ketuntasan eksplisit.
 * Bila belum diset, mengembalikan skala deskriptif murni tanpa mengasumsikan angka tetap (seperti 71).
 */
export function resolveModulKKTPConfig(
  tp?: Pick<CustomTPItem, 'kktpMinTuntas'> | null,
  profile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null,
  bobotMinTuntas?: number | null
): ModulKKTPReferensi {
  const explicitMin =
    clampExplicitThreshold(tp?.kktpMinTuntas) ??
    clampExplicitThreshold(bobotMinTuntas) ??
    clampExplicitThreshold(profile?.kktpMinTuntas);

  if (explicitMin !== null) {
    const { minTuntas, sangatBaikMin, cukupMin } = computeDynamicKKTPBands(explicitMin);
    return {
      mode: 'dinamis_sekolah',
      minTuntas,
      rentangLabel: {
        baruBerkembang: `Baru Berkembang (0–${Math.max(0, cukupMin - 1)})`,
        layak: `Layak (${cukupMin}–${Math.max(cukupMin, minTuntas - 1)})`,
        cakap: `Cakap (${minTuntas}–${Math.max(minTuntas, sangatBaikMin - 1)})`,
        mahir: `Mahir (${sangatBaikMin}–100)`,
      },
      catatan: `Mengacu pada batas KKTP aktif satuan pendidikan/TP (minimal tuntas kategori Cakap mulai skor ${minTuntas}).`,
    };
  }

  return {
    mode: 'deskriptif_rubrik',
    rentangLabel: {
      baruBerkembang: 'Baru Berkembang',
      layak: 'Layak',
      cakap: 'Cakap',
      mahir: 'Mahir',
    },
    catatan:
      'Menggunakan ketercapaian deskriptif berbasis rubrik kriteria (ambang angka dapat disesuaikan dari pengaturan KKTP Sekolah bila sekolah menetapkan skor minimal).',
  };
}

/**
 * Memilih 2–4 dimensi Profil Lulusan secara selektif dari 8 dimensi
 * berdasarkan rumpun mapel, jalur SMK, dan fokus TP (tanpa memaksa semua 8 dimensi).
 */
export function selectRelevantProfilLulusanDimensions(
  tp: Pick<CustomTPItem, 'materiPokok' | 'tujuanPembelajaran' | 'elemen'>,
  profile: Pick<SchoolProfile, 'mataPelajaranUtama' | 'jenjang'>,
  jenjang: JenjangKategoriModul,
  smkTrack?: SMKSubjectTrack
): string[] {
  const family = resolveSubjectFamily(profile.mataPelajaranUtama || '');
  const mapelLower = (profile.mataPelajaranUtama || '').toLowerCase();
  const tpText = `${tp.materiPokok} ${tp.tujuanPembelajaran} ${tp.elemen}`.toLowerCase();
  const isSD = jenjang === 'SD/MI';
  const isKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  if (family === 'pancasila_agama') {
    const base = [
      'Keimanan dan Ketakwaan terhadap Tuhan YME (menerapkan nilai iman, adab, atau etika moral dalam situasi nyata)',
      'Kewargaan (bersikap adil, menghargai keberagaman, dan bertanggung jawab di lingkungan kelas maupun masyarakat)',
      'Penalaran Kritis (menimbang alasan nilai dan konsekuensi tindakan secara objektif)',
    ];
    if (/(dialog|diskusi|argumentasi|cerita|sampaikan|lisan)/i.test(tpText)) {
      base.push('Komunikasi (menyampaikan pendapat etis secara santun disertai alasan jelas)');
    }
    return base.slice(0, 4);
  }

  if (family === 'seni_pjok') {
    if (/(pjok|jasmani|olahraga|kebugaran|kesehatan|gizi|gerak|senam)/i.test(mapelLower)) {
      return [
        'Kesehatan (menerapkan gerak aman, pemanasan teratur, dan kebiasaan hidup bugar)',
        'Kolaborasi (bekerja sama sportif mengikuti aturan kelompok selama praktik)',
        'Kemandirian (mengatur ritme latihan dan mengevaluasi capaian teknik diri sendiri)',
      ];
    }
    return [
      'Kreativitas (mengolah gagasan karya atau ekspresi estetik yang autentik sesuai ciri topik)',
      'Kemandirian (merampungkan proses eksplorasi teknik hingga penyelesaian karya secara tertib)',
      'Komunikasi (mengapresiasi karya teman dan menjelaskan makna karyanya sendiri secara santun)',
    ];
  }

  if (family === 'matematika') {
    return [
      isSD
        ? 'Penalaran Kritis (mengamati pola, memeriksa hitungan dengan benda nyata, dan menjelaskan alasan jawaban)'
        : 'Penalaran Kritis (memodelkan hubungan data secara logis dan memverifikasi kebenaran langkah perhitungan)',
      'Kemandirian (mencoba strategi penyelesaian secara tekun serta mengecek ulang ketelitian langkah)',
      'Komunikasi (menuliskan langkah penyelesaian dan alasan matematis secara runtut agar mudah diikuti)',
    ];
  }

  if (family === 'bahasa') {
    return [
      'Komunikasi (menyusun gagasan lisan maupun tulisan dengan struktur yang jelas, efektif, dan santun)',
      'Penalaran Kritis (memilah fakta, struktur argumen, dan ketepatan isi bacaan berdasarkan bukti teks)',
      'Kreativitas (mengembangkan variasi ungkapan atau karya tulis kontekstual sesuai sasaran pembaca)',
    ];
  }

  if (isKejuruan || family === 'informatika_kejuruan') {
    const kejuruanDims = [
      'Penalaran Kritis (menganalisis alur kerja, kesesuaian parameter, dan mendeteksi penyimpangan langkah)',
      'Kemandirian (mematuhi SOP serta standar Keselamatan Kerja/K3 secara disiplin dalam praktik)',
      'Kolaborasi (berbagi peran kerja terukur saat menyiapkan bahan, menguji hasil, dan menjaga kerapian 5R)',
    ];
    if (/(proyek|desain|karya|prototipe|produk|wirausaha|pkk)/i.test(`${mapelLower} ${tpText}`)) {
      kejuruanDims.push('Kreativitas (merancang perbaikan produk atau solusi kerja yang layak mutu)');
    }
    return kejuruanDims.slice(0, 4);
  }

  if (family === 'sains') {
    const sainsDims = [
      isSD
        ? 'Penalaran Kritis (mengamati ciri nyata pada percobaan sederhana dan membedakan hasil amatan dari tebakan)'
        : 'Penalaran Kritis (menafsirkan data hasil penyelidikan dan menguji klaim berdasarkan bukti empiris)',
      'Kolaborasi (bekerja sama tertib dalam pembagian tugas pengamatan dan pencatatan data)',
      'Kemandirian (teliti mencatat data sesuai fakta serta jujur melaporkan hasil pengamatan)',
    ];
    if (/(kesehatan|gizi|organ|pencernaan|pernapasan|zat aditif|lingkungan|limbah)/i.test(tpText)) {
      sainsDims.push('Kesehatan (menjaga keamanan diri saat praktik dan mengaitkan konsep dengan pola hidup sehat)');
    }
    return sainsDims.slice(0, 4);
  }

  // sosial_sejarah & default
  return [
    'Penalaran Kritis (menelusuri hubungan sebab-akibat peristiwa atau data sosial berdasarkan sumber tepercaya)',
    'Kewargaan (mengaitkan konsep materi dengan tanggung jawab sosial dan kehidupan bermasyarakat)',
    'Komunikasi (menyampaikan argumen berbasis data dengan bahasa runtut dan menghargai perspektif lain)',
  ];
}

/**
 * Memilih preset LKPD Studio yang paling selaras dengan model pedagogik & rumpun mata pelajaran.
 */
export function resolveRecommendedLKPDPresetForModel(
  model: ModulAjarModelType,
  subjectFamily: SubjectFamily
): LKPDPresetType {
  if (model === 'pjbl') {
    return 'proyek';
  }
  if (
    (model === 'inquiry' || model === 'discovery') &&
    (subjectFamily === 'sains' || subjectFamily === 'informatika_kejuruan' || subjectFamily === 'seni_pjok')
  ) {
    return 'eksperimen';
  }
  return 'kasus';
}

/**
 * Mengonversi LKPDDokumen penuh (hasil buildSmartLKPD atau draf tersimpan LKPD Studio)
 * menjadi ringkasan contoh LKPD terintegrasi 8 komponen pada Modul Ajar (tanpa menggandakan generator).
 */
export function buildModulLKPDSummaryFromDoc(
  lkpdDoc: LKPDDokumen,
  sumber: ModulContohLKPD['sumberLKPD'] = 'modul_terintegrasi'
): ModulContohLKPD {
  const bahanSet: string[] = [];
  if (lkpdDoc.eksperimenData?.alatDanBahan?.length) {
    bahanSet.push(...lkpdDoc.eksperimenData.alatDanBahan);
  }
  if (lkpdDoc.stimulusData?.tabelData?.kolom?.length) {
    bahanSet.push(`Tabel data stimulus (${lkpdDoc.stimulusData.tabelData.kolom.join(', ')})`);
  }
  if (lkpdDoc.stimulusData?.poinKunci?.length) {
    bahanSet.push(...lkpdDoc.stimulusData.poinKunci.slice(0, 3));
  }
  if (bahanSet.length === 0) {
    bahanSet.push(
      `Teks/data stimulus: "${lkpdDoc.stimulusKasus?.judul || lkpdDoc.materiPokok}"`,
      'Alat tulis dan lembar pencatatan hasil kerja siswa'
    );
  }

  const langkahPengerjaan = (lkpdDoc.langkahAktivitas || []).map((l, idx) =>
    l.judulLangkah ? `${l.langkahKe || idx + 1}. ${l.judulLangkah}: ${l.instruksi}` : `${l.langkahKe || idx + 1}. ${l.instruksi}`
  );
  if (lkpdDoc.pemeriksaanHasil?.length) {
    langkahPengerjaan.push(`Pemeriksaan hasil: ${lkpdDoc.pemeriksaanHasil[0]}`);
  }

  const pertanyaanAtauRuangKerja = (lkpdDoc.pertanyaanAnalisis || []).map(
    (q) => `[${q.tingkatKognitif || 'Inti'}] ${q.pertanyaan}`
  );

  const kriteriaPenilaian =
    lkpdDoc.kriteriaPenilaianSiswa && lkpdDoc.kriteriaPenilaianSiswa.length > 0
      ? lkpdDoc.kriteriaPenilaianSiswa
      : lkpdDoc.panduanGuru?.rubrikPenilaian?.map((r) => `${r.aspek}: ${r.cakap}`) || [
          'Ketepatan penggunaan fakta/data dari stimulus dalam jawaban.',
          'Keruntutan langkah kerja dan kejelasan alasan jawaban.',
        ];

  return {
    presetType: lkpdDoc.presetType || 'kasus',
    judul: lkpdDoc.judul || `LKPD: ${lkpdDoc.materiPokok}`,
    konteksTugas: lkpdDoc.stimulusKasus?.judul
      ? `${lkpdDoc.stimulusKasus.judul} — ${lkpdDoc.stimulusKasus.teks}`
      : lkpdDoc.stimulusKasus?.teks || lkpdDoc.materiPokok,
    tujuanPengerjaan:
      lkpdDoc.targetBelajarSiswa && lkpdDoc.targetBelajarSiswa.length > 0
        ? lkpdDoc.targetBelajarSiswa.join('; ')
        : lkpdDoc.tujuanPembelajaran,
    petunjukSiswa:
      lkpdDoc.petunjukPengerjaan && lkpdDoc.petunjukPengerjaan.length > 0
        ? lkpdDoc.petunjukPengerjaan
        : ['Baca stimulus dengan cermat dan kerjakan langkah secara berurutan.'],
    bahanAtauData: Array.from(new Set(bahanSet)).slice(0, 6),
    langkahPengerjaan,
    pertanyaanAtauRuangKerja,
    hasilYangDiharapkan:
      lkpdDoc.produkHasilBelajar ||
      `Hasil analisis terverifikasi dan kesimpulan tertulis siswa terkait "${lkpdDoc.materiPokok}".`,
    kriteriaPenilaian,
    sumberLKPD: sumber,
  };
}

function getPrereqHint(tp: CustomTPItem): string {
  if (Array.isArray(tp.prasyarat) && tp.prasyarat.length > 0) {
    return tp.prasyarat[0];
  }
  return `konsep dasar pada elemen ${tp.elemen || tp.materiPokok}`;
}

function getEvidenceHint(tp: CustomTPItem): string {
  if (Array.isArray(tp.buktiKetercapaian) && tp.buktiKetercapaian.length > 0) {
    return tp.buktiKetercapaian[0];
  }
  return tp.kompetensiInti || tp.tujuanPembelajaran;
}

/**
 * Menyusun Materi Ajar Konkret (Task A) dengan 7 elemen substantif sesuai jenjang dan rumpun mapel,
 * bebas klausa dunia kerja pada SD serta bebas referensi SIBI fiktif.
 */
export function buildOperationalBahanBacaan(params: {
  tp: CustomTPItem;
  profile: SchoolProfile;
  jenjang: JenjangKategoriModul;
  smkTrack?: SMKSubjectTrack;
  konteks: string;
}): DeepMaterials {
  const { tp, profile, jenjang, smkTrack, konteks } = params;
  const family = resolveSubjectFamily(profile.mataPelajaranUtama || '');
  const mapel = profile.mataPelajaranUtama || 'Mata Pelajaran';
  const materi = tp.materiPokok;
  const subTPs = tp.subTP || [];
  const prasyarat = getPrereqHint(tp);
  const bukti = getEvidenceHint(tp);
  const isSD = jenjang === 'SD/MI';
  const isSMP = jenjang === 'SMP/MTs';
  const isSMA = jenjang === 'SMA/MA';
  const isSMKKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  const depthPhrase = isSD
    ? 'disajikan dengan bahasa sederhana, benda atau kejadian yang mudah dilihat siswa di rumah maupun ruang kelas, dan langkah konkret bertahap'
    : isSMP
    ? 'menghubungkan pemahaman konsep inti dengan representasi tabel/model sederhana serta analisis sebab-akibat pada kehidupan sehari-hari'
    : isSMKKejuruan
    ? 'menekankan keterkaitan konsep dengan prosedur teknis standar (SOP), ketepatan alat ukur/bahan, kontrol mutu hasil, dan kepatuhan keselamatan kerja (K3)'
    : isSMA
    ? 'menuntut penalaran konseptual mendalam, pengujian asumsi atau syarat batas, serta penyusunan argumen berbasis bukti yang dapat dipertanggungjawabkan'
    : 'berorientasi pada penerapan fungsional konsep dalam literasi sosial, komunikasi sehari-hari, dan pengambilan keputusan praktis';

  const arahanExtra = tp.arahanRangkuman?.trim()
    ? ` Fokus ajar dari peta materi: ${tp.arahanRangkuman.trim()}.`
    : '';

  const penjelasanKonsepUtama =
    `Materi "${materi}" pada ${mapel} (elemen ${tp.elemen}) memampukan peserta didik untuk mencapai tujuan pembelajaran ${tp.kode}: ${tp.tujuanPembelajaran}. Pada jenjang ${jenjang}, penjelasan materi ini ${depthPhrase}.${arahanExtra} Pemahaman yang utuh bertumpu pada penguasaan ${prasyarat} lalu berlanjut hingga siswa mampu menunjukkan bukti nyata: ${bukti}.`;

  // Subkonsep dari Sub-TP jika ada, atau diturunkan per struktur ilmu mapel
  const subKonsep: NonNullable<DeepMaterials['subKonsep']> =
    subTPs.length >= 2
      ? subTPs.slice(0, 4).map((s) => ({
          judul: `${s.kode}: ${s.fokusMateri || s.kompetensi}`,
          uraian: `Peserta didik menguasai ${s.kompetensi.toLowerCase()} dengan bukti ketercapaian teramati: ${s.buktiKetercapaian || bukti}.`,
        }))
      : family === 'matematika'
      ? [
          {
            judul: `Identifikasi Unsur, Besaran, dan Model ${materi}`,
            uraian: `Menentukan variabel atau besaran penting dari situasi soal beserta satuannya sebelum memilih aturan/hubungan matematis yang tepat.`,
          },
          {
            judul: `Prosedur Penyelesaian dan Pemeriksaan Kembali`,
            uraian: `Menjalankan langkah perhitungan secara terurut, menafsirkan arti angka hasil akhir dalam konteks, dan memverifikasi hasil terhadap syarat awal.`,
          },
        ]
      : family === 'bahasa'
      ? [
          {
            judul: `Struktur Teks dan Ciri Kebahasaan ${materi}`,
            uraian: `Mengenali fungsi bagian-bagian teks serta pilihan kata/kalimat khas yang membentuk kejelasan makna dan tujuan komunikatif.`,
          },
          {
            judul: `Evaluasi Ketepatan Isi dan Penyusunan Ulang`,
            uraian: `Membedakan informasi faktual dan pendapat dalam teks sumber lalu menyunting atau menyusun tanggapan yang runtut dan santun.`,
          },
        ]
      : family === 'sains'
      ? [
          {
            judul: `Konsep Dasar dan Faktor Pengaruh pada ${materi}`,
            uraian: `Menjelaskan bagaimana komponen atau variabel dalam fenomena "${materi}" saling berinteraksi dan mengubah hasil pengamatan.`,
          },
          {
            judul: `Pengumpulan Data Pengamatan dan Interpretasi Bukti`,
            uraian: `Mencatat hasil pengamatan nyata dengan jujur, membaca kecenderungan data, dan merumuskan penjelasan ilmiah yang didukung bukti.`,
          },
        ]
      : isSMKKejuruan
      ? [
          {
            judul: `Prinsip Kerja, Spesifikasi Alat, dan K3 pada ${materi}`,
            uraian: `Mengidentifikasi fungsi komponen/alat yang digunakan, memahami batas toleransi ukuran atau mutu, serta menerapkan prosedur keselamatan kerja (K3).`,
          },
          {
            judul: `Urutan Pelaksanaan SOP dan Verifikasi Hasil Kerja`,
            uraian: `Menjalankan tahapan pengerjaan secara runtut sesuai job sheet, memeriksa penyimpangan sejak dini, dan memastikan kualitas luaran memenuhi standar.`,
          },
        ]
      : [
          {
            judul: `Unsur Pokok dan Prinsip Kerja ${materi}`,
            uraian: `Memahami konsep inti serta prasyarat "${prasyarat}" agar siswa tidak sekadar menghafal definisi tanpa makna.`,
          },
          {
            judul: `Penerapan Kontekstual pada "${konteks}"`,
            uraian: `Menerapkan prinsip "${materi}" untuk menelaah kejadian nyata dan menghasilkan bukti belajar: ${bukti}.`,
          },
        ];

  // Istilah penting (domain-grounded)
  const istilahPenting: NonNullable<DeepMaterials['istilahPenting']> = [
    {
      istilah: materi,
      pengertian: isSD
        ? `Pokok pelajaran yang dipelajari siswa hari ini agar mampu ${tp.tujuanPembelajaran.toLowerCase()}.`
        : `Konsep inti pada elemen ${tp.elemen} yang menjadi dasar pencapaian kompetensi ${tp.kode}: ${tp.tujuanPembelajaran}.`,
    },
    ...(subTPs[0]
      ? [
          {
            istilah: subTPs[0].fokusMateri || subTPs[0].kode,
            pengertian: subTPs[0].kompetensi,
          },
        ]
      : [
          {
            istilah: family === 'matematika' ? 'Pemodelan Masalah' : family === 'bahasa' ? 'Bukti Tekstual' : family === 'sains' ? 'Variabel Pengamatan' : isSMKKejuruan ? 'Prosedur K3 & SOP' : 'Indikator Kontekstual',
            pengertian:
              family === 'matematika'
                ? 'Langkah menerjemahkan cerita atau keadaan nyata ke dalam bentuk simbol, bilangan, tabel, atau hubungan matematis yang jelas.'
                : family === 'bahasa'
                ? 'Kutipan kata, kalimat, atau bagian bacaan asli yang digunakan untuk membuktikan alasan analisis atau simpulan teks.'
                : family === 'sains'
                ? 'Besaran atau kondisi yang diamati, diubah secara terarah, atau dijaga tetap selama penyelidikan berlangsung.'
                : isSMKKejuruan
                ? 'Aturan urutan kerja dan perlindungan keselamatan diri serta peralatan agar praktik berlangsung aman dan memenuhi standar mutu.'
                : `Ciri nyata pada kasus "${konteks}" yang diamati siswa untuk membuktikan pemahaman materi.`,
          },
        ]),
    {
      istilah: isSD ? 'Bukti Hasil Belajar' : isSMKKejuruan ? 'Kriteria Kelayakan Hasil Kerja' : 'Verifikasi Bukti',
      pengertian: `Pengecekan kecocokan jawaban atau karya siswa terhadap bukti capaian (${bukti}).`,
    },
  ];

  // Contoh konkret sesuai jenjang & mapel
  const contohKonkret: string[] = isSD
    ? [
        `Contoh di lingkungan sekolah/rumah: mengamati langsung situasi nyata yang berkaitan dengan "${materi}" (misalnya menggunakan alat ukur sederhana, kartu bergambar, atau contoh kegiatan harian di kelas).`,
        `Contoh pembanding tepat vs keliru: membandingkan dua contoh konkret agar siswa melihat ciri pembeda utama pada "${materi}" sebelum mencoba sendiri.`,
      ]
    : isSMKKejuruan
    ? [
        `Skenario praktik kejuruan: menyiapkan lembar kerja (job sheet), memeriksa kelayakan alat dan perlengkapan K3, lalu menjalankan tahapan teknis "${materi}" hingga uji mutu hasil.`,
        `Kasus pemeriksaan mutu pada "${konteks}": menelusuri satu contoh penyimpangan proses untuk menentukan langkah koreksi yang aman dan efisien.`,
      ]
    : isSMA
    ? [
        `Studi kasus analitis pada "${konteks}": menguji klaim atau data nyata terkait "${materi}", mengidentifikasi asumsi yang dipakai, serta mengevaluasi kesahihan kesimpulannya.`,
        `Perbandingan dua skenario alternatif untuk menguji dampak perubahan kondisi/syarat terhadap hasil penerapan "${materi}".`,
      ]
    : [
        `Kasus keseharian "${konteks}": mengidentifikasi data penting dan menuliskan pola hubungan yang muncul pada "${materi}".`,
        `Latihan terbimbing dua kondisi (kondisi normal dan kondisi berubah) untuk melatih ketelitian penerapan "${materi}".`,
      ];

  // Contoh penyelesaian atau demonstrasi langkah demi langkah sesuai rumpun mapel
  const contohPenyelesaian: NonNullable<DeepMaterials['contohPenyelesaian']> =
    family === 'matematika'
      ? {
          judulContoh: `Demonstrasi Langkah Penyelesaian Kontekstual "${materi}"`,
          konteks: `Kasus acuan pada "${konteks}" untuk mendemonstrasikan alur berpikir sistematis.`,
          langkahPenyelesaian: [
            `Langkah 1 (Identifikasi): Catat semua informasi, angka beserta satuannya, dan hal yang ditanyakan dari situasi "${materi}".`,
            `Langkah 2 (Pemodelan): Susun hubungan matematis atau strategi hitung sesuai sifat konsep "${materi}" tanpa terburu-buru menebak angka akhir.`,
            `Langkah 3 (Eksekusi & Cek Balik): Hitung secara berurutan, lalu substitusikan atau uji kembali hasil tersebut ke syarat awal untuk memastikan masuk akal.`,
          ],
          kesimpulanHasil: `Jawaban akhir diterima apabila tepat secara perhitungan, satuannya lengkap, dan menjawab pertanyaan awal pada "${konteks}".`,
        }
      : family === 'bahasa'
      ? {
          judulContoh: `Demonstrasi Telaah dan Penyusunan Teks "${materi}"`,
          konteks: `Menggunakan satu kutipan teks nyata yang relevan dengan "${konteks}".`,
          langkahPenyelesaian: [
            `Langkah 1 (Membaca Teliti): Tandai informasi pokok, tujuan penulis, dan bagian struktur teks pada kutipan sumber.`,
            `Langkah 2 (Analisis Ciri Bahasa): Temukan bukti kalimat/diksi yang menunjukkan kaidah "${materi}" secara langsung dari kutipan.`,
            `Langkah 3 (Penyusunan/Penyuntingan): Rangkai gagasan dengan kalimat efektif, ejaan baku, dan sertakan rujukan bukti teksnya.`,
          ],
          kesimpulanHasil: `Tanggapan atau teks yang baik harus didukung kutipan langsung dari sumber serta selaras dengan struktur "${materi}".`,
        }
      : family === 'sains'
      ? {
          judulContoh: `Demonstrasi Pengamatan & Penjelasan Ilmiah "${materi}"`,
          konteks: `Mengamati gejala/data nyata terkait "${konteks}".`,
          langkahPenyelesaian: [
            `Langkah 1 (Amati & Catat Fakta): Tuliskan kondisi awal dan perubahan yang teramati lengkap dengan besaran/ukurannya.`,
            `Langkah 2 (Kelompokkan Pola): Bandingkan hasil antar-perlakuan atau antar-kondisi untuk melihat faktor yang memengaruhi perubahan.`,
            `Langkah 3 (Rumuskan Simpulan Ilmiah): Kaitkan pola bukti pengamatan dengan prinsip "${materi}" secara logis.`,
          ],
          kesimpulanHasil: `Kesimpulan ilmiah sah bila seluruh klaim merujuk pada data pengamatan yang tercatat, bukan sekadar dugaan awal.`,
        }
      : isSMKKejuruan
      ? {
          judulContoh: `Demonstrasi Prosedur Kerja (SOP) & K3 pada "${materi}"`,
          konteks: `Simulasi praktik kejuruan untuk "${konteks}".`,
          langkahPenyelesaian: [
            `Langkah 1 (Persiapan & K3): Periksa kelengkapan alat, kondisi area kerja aman, serta pemakaian perlengkapan K3 sebelum praktik dimulai.`,
            `Langkah 2 (Pelaksanaan Prosedural): Jalankan urutan kerja inti "${materi}" langkah demi langkah sambil memantau parameter kesesuaian.`,
            `Langkah 3 (Uji Kualitas & 5R): Lakukan pengecekan hasil terhadap kriteria toleransi mutu lalu rapikan kembali alat/area praktik (5R).`,
          ],
          kesimpulanHasil: `Pekerjaan dinyatakan memenuhi kriteria apabila hasil sesuai spesifikasi teknis dan seluruh tahap mematuhi prosedur K3.`,
        }
      : {
          judulContoh: `Demonstrasi Langkah Analisis Kasus "${materi}"`,
          konteks: `Menerapkan konsep "${materi}" pada kasus nyata "${konteks}".`,
          langkahPenyelesaian: [
            `Langkah 1 (Kenali Fakta Kunci): Pilah mana fakta utama dan konteks persoalan yang ingin diselesaikan.`,
            `Langkah 2 (Hubungkan ke Prinsip Materi): Terapkan konsep "${materi}" untuk menjelaskan sebab-akibat atau kriteria penilaian kasus.`,
            `Langkah 3 (Simpulkan & Tindak Lanjut): Tetapkan keputusan/solusi yang paling beralasan dan periksa kesesuaiannya dengan ${tp.kode}.`,
          ],
          kesimpulanHasil: `Keputusan dianggap tepat apabila beralasan logis, sesuai kaidah materi, dan menjawab bukti ketercapaian.`,
        };

  const hubunganDenganTP = `Seluruh uraian dan contoh di atas dirancang langsung untuk menghantarkan peserta didik mencapai TP ${tp.kode} ("${tp.tujuanPembelajaran}"), dimulai dari aktivasi prasyarat (${prasyarat}) hingga pembuktian kompetensi akhir (${bukti}).`;

  const potensiMiskonsepsi: NonNullable<DeepMaterials['potensiMiskonsepsi']> = [
    {
      miskonsepsi:
        family === 'matematika'
          ? `Siswa sering langsung mengoperasikan angka yang terlihat pada soal "${materi}" tanpa mengecek apa yang dimisalkan atau arti satuannya.`
          : family === 'sains'
          ? `Siswa kerap menganggap pengamatan sementara atau opini pribadi sudah cukup sebagai bukti ilmiah dalam topik "${materi}".`
          : family === 'bahasa'
          ? `Siswa sering menyimpulkan isi atau struktur teks "${materi}" hanya dari judul tanpa menandai kalimat bukti pada bacaan.`
          : isSMKKejuruan
          ? `Siswa cenderung terburu-buru ke langkah akhir praktik "${materi}" dengan melewatkan pengecekan alat awal dan syarat K3.`
          : `Siswa kerap menghafal definisi "${materi}" secara verbal tanpa mampu menunjuk alasan penerapannya pada contoh kasus berbeda.`,
      caraMeluruskan: isSD
        ? `Tunjukkan dua contoh nyata (satu tepat dan satu keliru) menggunakan benda/gambar peraga, lalu ajak siswa menunjuk bagian mana yang menyebabkan perbedaan hasil.`
        : isSMKKejuruan
        ? `Hentikan sejenak saat titik periksa awal, minta siswa memverifikasi ulang daftar ceklis alat & K3 bersama pasangan sebelum melanjutkan tahap berikutnya.`
        : `Berikan contoh sanggahan (counterexample) terarah dan minta siswa menguji ulang jawaban mereka terhadap fakta/syarat pada konteks awal sebelum kesimpulan ditetapkan kelas.`,
    },
    {
      miskonsepsi: `Tertukarnya konsep "${materi}" dengan materi prasyarat "${prasyarat}" saat menghadapi variasi konteks baru.`,
      caraMeluruskan: `Gunakan tabel perbandingan ciri (apa yang sama vs apa yang berbeda antara "${prasyarat}" dan "${materi}") pada papan konsep sebelum latihan mandiri.`,
    },
  ];

  const konsepKunci = [
    `Konsep inti: ${materi} (${tp.elemen})`,
    ...subKonsep.slice(0, 2).map((sk) => sk.judul),
    `Target pembuktian: ${bukti}`,
  ];

  const referensiCatatan =
    'Materi ini disusun dari struktur CP/TP dan kaidah ilmu mata pelajaran. Guru disarankan memadukan dengan buku teks resmi yang digunakan satuan pendidikan (lengkapi edisi & bab aktual sebelum dibagikan ke siswa).';

  return {
    ringkasanInti: penjelasanKonsepUtama,
    konsepKunci,
    referensiCatatan,
    penjelasanKonsepUtama,
    subKonsep,
    istilahPenting,
    contohKonkret,
    contohPenyelesaian,
    hubunganDenganTP,
    potensiMiskonsepsi,
  };
}

/**
 * Menyusun instrumen asesmen operasional lengkap (Diagnostik, Formatif, Asesmen Akhir + Kunci/Pedoman)
 * sesuai karakteristik mapel, jenjang, dan KKTP dinamis sekolah.
 */
export function buildOperationalAsesmenDetail(params: {
  tp: CustomTPItem;
  profile: SchoolProfile;
  jenjang: JenjangKategoriModul;
  smkTrack?: SMKSubjectTrack;
  konteks: string;
}): ModulAsesmenDetail {
  const { tp, profile, jenjang, smkTrack, konteks } = params;
  const family = resolveSubjectFamily(profile.mataPelajaranUtama || '');
  const mapel = profile.mataPelajaranUtama || 'Mata Pelajaran';
  const materi = tp.materiPokok;
  const prasyarat = getPrereqHint(tp);
  const bukti = getEvidenceHint(tp);
  const kktpReferensi = resolveModulKKTPConfig(tp, profile);
  const isSD = jenjang === 'SD/MI';
  const isKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  const diagnostik = {
    tujuanPemeriksaanPrasyarat: `Memetakan kesiapan awal siswa terhadap prasyarat (${prasyarat}) dan mendeteksi miskonsepsi awal terkait "${materi}" sebelum kegiatan inti dimulai.`,
    pertanyaanAtauTugasAwal: [
      isSD
        ? `Tanya jawab bergambar/benda nyata (2 butir lisan): Tunjukkan 2 contoh sederhana terkait "${prasyarat}" lalu minta siswa memilih mana yang sesuai dan menyebutkan alasannya dengan satu kalimat.`
        : `Cek prasyarat singkat (2 soal pemantik tertulis/lisan): Jelaskan dengan bahasamu sendiri makna "${prasyarat}" dan berikan 1 contohnya yang pernah kamu temui sebelum mempelajari "${materi}".`,
      isKejuruan
        ? `Cek kesiapan alat & aturan K3 awal: Siswa memeriksa 3 kelengkapan dasar area praktik dan menyebutkan potensi bahaya utama yang harus dicegah pada "${materi}".`
        : `Pemetaan kesiapan awal: Siswa menuliskan 1 hal yang sudah diketahui dan 1 pertanyaan yang paling ingin diketahui tentang "${materi}".`,
    ],
    indikatorInterpretasi:
      'Siap (Kesiapan Mahir/Berkembang): menjawab 2 butir prasyarat tepat dengan alasan logis -> langsung masuk kegiatan inti reguler/pengayaan. Perlu Penguatan (Kesiapan Dasar): keliru pada konsep prasyarat -> guru memberi scaffolding 5 menit menggunakan contoh terbimbing sebelum kelompok bekerja.',
  };

  const formatif = {
    instruksiAktivitas: isKejuruan
      ? `Observasi langsung sepanjang praktik "${materi}" menggunakan lembar ceklis SOP, ketepatan langkah teknis, serta kepatuhan K3 dan kerapian area kerja (5R).`
      : family === 'matematika'
      ? `Observasi proses pemodelan dan pemeriksaan balik saat kelompok mengerjakan soal/kasus "${materi}" pada LKPD.`
      : family === 'sains'
      ? `Pengecekan langsung catatan data pengamatan, objektivitas tabel hasil, dan kesesuaian argumen ilmiah siswa pada LKPD.`
      : family === 'bahasa'
      ? `Penelaahan draf identifikasi unsur teks serta keefektifan kalimat saat siswa menyusun/menyunting teks "${materi}".`
      : family === 'seni_pjok'
      ? `Pengamatan langsung unjuk proses/teknik selama latihan "${materi}" beserta ketertiban keselamatan ruang atau gerak.`
      : `Observasi keaktifan penalaran, ketepatan data/alasan pada LKPD, dan keberanian mengklarifikasi argumen selama kegiatan inti.`,
    pertanyaanAtauTugas: [
      `Cek tengah proses (check-point): Minta tiap kelompok/pasangan menunjukkan bukti kerja sementara (${bukti}) dan menjelaskan alasan pilihan langkah mereka.`,
      `Exit ticket akhir pertemuan: Tuliskan 1 prinsip penting dari "${materi}" dan 1 contoh nyata penerapannya di "${konteks}".`,
    ],
    buktiYangDiamati: [
      `Kelengkapan catatan proses kerja di LKPD sesuai sintaks model belajar.`,
      `Ketepatan alasan lisan maupun tulisan siswa dalam mengaitkan hasil kerja dengan konsep "${materi}"${isKejuruan ? ' dan aturan K3' : ''}.`,
    ],
    umpanBalikGuru:
      'Berikan umpan balik spesifik langsung di tempat kerja siswa (tunjukkan bagian langkah mana yang sudah tepat, beri pertanyaan pancingan untuk bagian yang masih keliru tanpa langsung mendikte jawaban akhir).',
  };

  const bentukUtama = isKejuruan
    ? 'Unjuk Kerja Praktik (SOP & K3) dan Analisis Kasus Troubleshooting'
    : family === 'matematika'
    ? 'Pemecahan Masalah Matematis dan Verifikasi Proses Perhitungan'
    : family === 'bahasa'
    ? 'Membaca Kritis / Analisis Teks dan Produksi Karya Tulis/Lisan'
    : family === 'sains'
    ? 'Interpretasi Data Pengamatan/Eksperimen dan Penjelasan Ilmiah Tertulis'
    : family === 'seni_pjok'
    ? 'Penilaian Unjuk Karya / Praktik Gerak dan Apresiasi Kriteria'
    : `Asesmen Sumatif TP ${tp.kode} (${isSD ? 'Uji Pemahaman Bergambar & Isian Kontekstual' : 'Uji Aplikasi Konsep & Analisis Kontekstual'})`;

  const sub0 = tp.subTP?.[0]?.kompetensi || `menjelaskan konsep inti ${materi}`;
  const sub1 = tp.subTP?.[1]?.kompetensi || `menerapkan ${materi} dalam situasi nyata`;

  const butirTugas: ModulAsesmenDetail['akhir']['butirTugas'] =
    family === 'matematika'
      ? [
          {
            nomor: 1,
            bentuk: 'Identifikasi & Pemodelan Konsep',
            pertanyaanAtauTugas: `Dari sebuah kasus nyata "${konteks}" terkait "${materi}", tentukan besaran/variabel yang diketahui beserta satuannya dan susun model/aturan penyelesaiannya untuk menunjukkan kemampuan: ${sub0}.`,
            kunciAtauContohRespons: `Skor penuh bila siswa menuliskan definisi besaran/variabel disertai satuan tepat dan merumuskan hubungan matematis yang benar sesuai syarat kasus.`,
          },
          {
            nomor: 2,
            bentuk: 'Pemecahan Masalah & Proses Perhitungan',
            pertanyaanAtauTugas: `Selesaikan langkah perhitungan untuk masalah kontekstual "${materi}" di atas secara bertahap dan tunjukkan cara memeriksa kembali kebenaran hasilmu (${sub1}).`,
            kunciAtauContohRespons: `Contoh respons sah memuat urutan langkah hitung konsisten tanpa lompatan logika, hasil akhir benar bersatuan, serta uji substitusi/pemeriksaan balik yang cocok dengan syarat awal.`,
          },
          {
            nomor: 3,
            bentuk: 'Penalaran Perubahan Kondisi / Error Analysis',
            pertanyaanAtauTugas: `Disajikan sebuah contoh penyelesaian siswa lain yang memiliki kekeliruan langkah pada "${materi}". Temukan letak kesalahannya dan tuliskan perbaikan lengkapnya.`,
            kunciAtauContohRespons: `Siswa menunjuk tepat langkah mana yang keliru secara konsep, menjelaskan mengapa cara tersebut salah, dan menyajikan perbaikan yang terverifikasi.`,
          },
        ]
      : family === 'bahasa'
      ? [
          {
            nomor: 1,
            bentuk: 'Analisis Unsur & Struktur Teks',
            pertanyaanAtauTugas: `Bacalah teks utuh tentang "${konteks}", lalu identifikasi ciri struktur/kaidah "${materi}" beserta kutipan kalimat buktinya (${sub0}).`,
            kunciAtauContohRespons: `Respons tepat mencantumkan minimal 2 bagian struktur beserta kutipan kalimat langsung dari teks sebagai bukti sah.`,
          },
          {
            nomor: 2,
            bentuk: 'Evaluasi Ketepatan Bahasa & Makna',
            pertanyaanAtauTugas: `Temukan 2 ketidaktepatan penggunaan bahasa atau penalaran pada draf teks pembanding tentang "${materi}" lalu tuliskan perbaikannya agar efektif.`,
            kunciAtauContohRespons: `Perbaikan menghilangkan kesalahan ejaan/struktur kalimat serta mempertahankan kejelasan makna dan kesantunan konteks pembaca.`,
          },
          {
            nomor: 3,
            bentuk: 'Produksi / Adaptasi Teks Autentik',
            pertanyaanAtauTugas: `Susunlah paragraf atau teks singkat baru bertema "${konteks}" yang menerapkan kaidah "${materi}" (${sub1}).`,
            kunciAtauContohRespons: `Karya memenuhi struktur lengkap materi, menggunakan diksi sesuai situasi, dan gagasan pokoknya mudah dipahami pembaca.`,
          },
        ]
      : family === 'sains'
      ? [
          {
            nomor: 1,
            bentuk: 'Identifikasi Konsep & Variabel',
            pertanyaanAtauTugas: `Berdasarkan fenomena "${konteks}", jelaskan prinsip kerja "${materi}" serta identifikasi komponen/variabel yang diamati (${sub0}).`,
            kunciAtauContohRespons: `Menjelaskan keterkaitan konsep inti dengan fenomena serta menyebut minimal 2 komponen/variabel pengamatan secara tepat.`,
          },
          {
            nomor: 2,
            bentuk: 'Interpretasi Data Tabel Pengamatan',
            pertanyaanAtauTugas: `Perhatikan data hasil percobaan/pengamatan "${materi}". Pola perubahan apa yang tampak dari data tersebut, dan bukti apa yang mendukung simpulanmu? (${sub1})`,
            kunciAtauContohRespons: `Simpulan langsung mengacu pada angka/ciri nyata di data tabel serta menjelaskan hubungan sebab-akibat secara ilmiah.`,
          },
          {
            nomor: 3,
            bentuk: 'Prediksi & Aplikasi Bukti',
            pertanyaanAtauTugas: `Jika satu faktor dalam kasus "${konteks}" diubah, prediksikan perubahan yang terjadi berdasarkan prinsip "${materi}" dan jelaskan alasannya.`,
            kunciAtauContohRespons: `Prediksi konsisten dengan konsep ilmiah serta dilengkapi penjelasan mekanisme yang logis sesuai tingkat kelas ${jenjang}.`,
          },
        ]
      : isKejuruan
      ? [
          {
            nomor: 1,
            bentuk: 'Kesiapan SOP & K3 Praktik',
            pertanyaanAtauTugas: `Susun urutan persiapan alat, bahan, dan daftar cek keselamatan kerja (K3) sebelum melaksanakan praktik "${materi}" pada ${mapel}.`,
            kunciAtauContohRespons: `Daftar mencakup alat spesifik sesuai fungsi, pemeriksaan kelayakan awal, serta minimal 2 langkah pencegahan risiko K3 yang sesuai prosedur.`,
          },
          {
            nomor: 2,
            bentuk: 'Unjuk Kerja / Demonstrasi Terukur',
            pertanyaanAtauTugas: `Laksanakan prosedur praktik "${materi}" sesuai job sheet dalam kondisi area kerja aman dan ukur hasilnya terhadap kriteria toleransi mutu (${sub1}).`,
            kunciAtauContohRespons: `Proses kerja berjalan runtut sesuai urutan SOP, produk/hasil memenuhi spesifikasi ukur, dan area kerja kembali bersih sesuai standar 5R.`,
          },
          {
            nomor: 3,
            bentuk: 'Analisis Troubleshooting / Ketidaksesuaian',
            pertanyaanAtauTugas: `Diberikan studi kasus hasil praktik yang gagal memenuhi mutu pada "${konteks}". Tentukan kemungkinan penyebab pada alur kerja dan langkah koreksi yang aman.`,
            kunciAtauContohRespons: `Menghubungkan cacat/penyimpangan hasil dengan tahap SOP tertentu serta mengusulkan tindakan perbaikan yang realistis.`,
          },
        ]
      : [
          {
            nomor: 1,
            bentuk: 'Pemahaman Konsep Inti',
            pertanyaanAtauTugas: `Jelaskan dengan bahasamu sendiri konsep utama "${materi}" disertai satu contoh nyata di ${isSD ? 'rumah atau sekolah' : 'lingkungan sekitar'} (${sub0}).`,
            kunciAtauContohRespons: `Menjelaskan inti konsep tanpa menyalin definisi kaku dan memberi contoh nyata yang cocok dengan prinsip materi.`,
          },
          {
            nomor: 2,
            bentuk: 'Penerapan pada Situasi Nyata',
            pertanyaanAtauTugas: `Analisislah situasi "${konteks}" lalu tentukan langkah penyelesaian atau sikap yang paling tepat berdasarkan konsep "${materi}" (${sub1}).`,
            kunciAtauContohRespons: `Keputusan/langkah didukung alasan logis serta memenuhi bukti ketercapaian TP (${bukti}).`,
          },
          {
            nomor: 3,
            bentuk: 'Evaluasi & Pengambilan Keputusan',
            pertanyaanAtauTugas: `Jika terdapat perbedaan kondisi pada kasus di atas, bagaimana strategi penerapan "${materi}" perlu disesuaikan agar tujuannya tetap tercapai?`,
            kunciAtauContohRespons: `Mampu mengaitkan perubahan syarat kasus dengan penyesuaian tindakan secara tepat.`,
          },
        ];

  const pedomanPenilaian =
    kktpReferensi.mode === 'dinamis_sekolah'
      ? `Nilai ketercapaian tiap butir menggunakan rubrik analitik 4 tingkat (${kktpReferensi.rentangLabel?.baruBerkembang}, ${kktpReferensi.rentangLabel?.layak}, ${kktpReferensi.rentangLabel?.cakap}, ${kktpReferensi.rentangLabel?.mahir}). Peserta didik dinyatakan tuntas mencapai TP ${tp.kode} apabila minimal mencapai level Cakap (skor >= ${kktpReferensi.minTuntas}).`
      : `Nilai ketercapaian tiap butir menggunakan rubrik 4 tingkat (Baru Berkembang, Layak, Cakap, Mahir) dengan fokus pada ketepatan konsep, kelengkapan bukti, dan keruntutan prosedur sesuai TP ${tp.kode} (penyesuaian skor angka mengikuti ketentuan KKTP sekolah).`;

  return {
    diagnostik,
    formatif,
    akhir: {
      bentukUtama,
      butirTugas,
      pedomanPenilaian,
      kktpReferensi,
    },
  };
}

export function summarizeAsesmenDetailToLegacy(detail: ModulAsesmenDetail): {
  diagnostik: string;
  formatif: string;
  sumatif: string;
} {
  return {
    diagnostik: `${detail.diagnostik.tujuanPemeriksaanPrasyarat} Tugas awal: ${detail.diagnostik.pertanyaanAtauTugasAwal[0] || ''} Indikator: ${detail.diagnostik.indikatorInterpretasi}`,
    formatif: `${detail.formatif.instruksiAktivitas} Bukti diamati: ${detail.formatif.buktiYangDiamati.join('; ')}. Umpan balik: ${detail.formatif.umpanBalikGuru}`,
    sumatif: `${detail.akhir.bentukUtama} (${detail.akhir.butirTugas.length} butir tugas & kunci/contoh respons). ${detail.akhir.pedomanPenilaian}`,
  };
}

/**
 * Menyusun Diferensiasi Operasional (Task D) dengan minimal 3 jalur kesiapan nyata
 * yang memiliki scaffolding, aktivitas konkret, media, dan bukti berbeda namun tetap menuju TP yang sama.
 */
export function buildOperationalDiferensiasi(params: {
  tp: CustomTPItem;
  profile: SchoolProfile;
  jenjang: JenjangKategoriModul;
  smkTrack?: SMKSubjectTrack;
  konteks: string;
}): ModulDiferensiasiOperasional {
  const { tp, profile, jenjang, smkTrack, konteks } = params;
  const materi = tp.materiPokok;
  const prasyarat = getPrereqHint(tp);
  const bukti = getEvidenceHint(tp);
  const isSD = jenjang === 'SD/MI';
  const isKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  return {
    prinsipKesetaraanTP: `Ketiga jalur kesiapan tetap mengejar TP ${tp.kode} yang sama ("${tp.tujuanPembelajaran}"), dengan variasi pada kadar bantuan (scaffolding), kesederhanaan contoh awal, serta kedalaman tantangan aplikasi.`,
    kesiapanDasar: {
      targetKesiapan: 'Peserta didik yang masih memerlukan penguatan prasyarat atau kesulitan menghubungkan langkah awal.',
      dukunganScaffolding: `Guru memberi jembatan singkat prasyarat (${prasyarat}), menyediakan 1 contoh langkah yang sudah terisi sebagian sebagai pemandu, dan melakukan cek langkah ke-1 lebih awal sebelum siswa melanjutkan.`,
      aktivitasKonkret: [
        isSD
          ? `Memasangkan contoh gambar/benda nyata "${materi}" dengan langkah bantuan berurutan (1 langkah per kotak kerja) bersama teman sebangku.`
          : isKejuruan
          ? `Melakukan simulasi langkah dasar "${materi}" menggunakan kartu urutan SOP bergambar + ceklis K3 bersama pendampingan langsung guru pada tahap persiapan.`
          : `Mengerjakan bagian identifikasi data & konsep inti "${materi}" pada contoh kasus berangka/teks sederhana memakai kerangka isian terbimbing.`,
        `Menjelaskan ulang hasil langkah pertama secara lisan ke guru/pasangan sebelum lanjut menyelesaikan target dasar ${tp.kode}.`,
      ],
      mediaPendukung: isSD
        ? `Kartu contoh bergambar "${materi}", benda konkret di kelas, dan lembar isian langkah berpenuntun.`
        : `Kartu rangkuman prasyarat "${prasyarat}", contoh kerja terurai (worked example), dan templat tabel isian terbimbing.`,
      buktiBelajarJalur: `Siswa mampu menyelesaikan bagian inti kasus dasar "${materi}" secara runtut tanpa melompati tahap dengan bantuan contoh terpandu.`,
    },
    kesiapanBerkembang: {
      targetKesiapan: 'Peserta didik yang sudah menguasai prasyarat dasar dan siap menjalankan target reguler TP.',
      dukunganScaffolding: `Dukungan normal berupa instruksi LKPD standar, pengecekan tengah proses pada check-point diskusi kelompok, dan dorongan verifikasi ulang jawaban.`,
      aktivitasKonkret: [
        `Menyelesaikan rangkaian tugas reguler tentang "${materi}" pada konteks "${konteks}" secara utuh dari identifikasi data/konsep hingga penarikan kesimpulan.`,
        `Membandingkan alur penyelesaian kelompoknya dengan kelompok lain lalu memeriksa kesesuaian bukti ketercapaian: ${bukti}.`,
      ],
      mediaPendukung: `LKPD reguler ${profile.mataPelajaranUtama}, bahan bacaan inti modul, dan rubrik cek kriteria keberhasilan.`,
      buktiBelajarJalur: `Jawaban lengkap seluruh tahap pada LKPD reguler beserta alasan tertulis yang memenuhi indikator TP ${tp.kode}.`,
    },
    kesiapanMahir: {
      targetKesiapan: 'Peserta didik yang cepat memahami konsep inti reguler dan membutuhkan tantangan transfer ke situasi baru atau analisis kritis.',
      dukunganScaffolding: `Minimal scaffolding: siswa diberi skenario terbuka atau klaim pembanding untuk diuji secara mandiri maupun memimpin verifikasi ide kelompok.`,
      aktivitasKonkret: [
        isSD
          ? `Menyusun 1 soal/cerita tantangan baru tentang "${materi}" untuk dipecahkan oleh pasangan lain sekaligus memeriksa kebenaran jawabannya.`
          : isKejuruan
          ? `Menganalisis kasus troubleshooting atau merancang perbaikan efisiensi/mutu pada prosedur "${materi}" dengan tetap memenuhi standar K3 penuh.`
          : `Mengevaluasi satu argumen/solusi yang tampak meyakinkan tetapi memuat kesalahan konsep tersembunyi pada "${materi}", lalu mengonstruksi alternatif penerapan pada situasi baru "${konteks}".`,
        `Membandingkan minimal dua strategi penyelesaian berbeda dan membuktikan mana yang paling efektif untuk kondisi batas baru.`,
      ],
      mediaPendukung: `Kartu tantangan perluasan kasus "${konteks}", sumber pembanding tambahan, dan daftar pertanyaan cek kritis.`,
      buktiBelajarJalur: `Hasil analisis kekeliruan/situasi baru disertai pembuktian argumen mendalam atau rancangan produk variasi lanjutan yang akurat.`,
    },
  };
}
