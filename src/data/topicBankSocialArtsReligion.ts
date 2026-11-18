import {
  makeTopicEntry,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type SpiralTopicRelation,
  type TopicJenjangCategory,
  type TopicSourceKind,
  type TopicSourceVerificationStatus,
} from './kurikulumTopicBankTypes';

function s(
  topicId: string,
  mataPelajaran: string,
  jenjang: TopicJenjangCategory,
  faseCode: ExactFaseCode,
  elemen: string,
  topik: string,
  tujuanPembelajaran: string,
  arahanRangkuman: string,
  kompetensiInti: string,
  prasyarat: string[],
  buktiKetercapaian: string[],
  suggestedSemester: '1 (Ganjil)' | '2 (Genap)',
  progressionStage: CurriculumTopicEntry['progressionStage'],
  opts?: {
    prasyaratTopicIds?: string[];
    relatedTopicIds?: string[];
    spiralRelation?: SpiralTopicRelation;
    suggestedGrade?: string;
    sumberDokumen?: string;
    tahunVersi?: string;
    urlReferensi?: string;
    nomorHalamanAtauBagian?: string;
    statusVerifikasiSumber?: TopicSourceVerificationStatus;
    jenisKonten?: TopicSourceKind;
  }
): CurriculumTopicEntry {
  return makeTopicEntry({
    topicId,
    mataPelajaran,
    jenjang,
    faseCode,
    elemen,
    topik,
    tujuanPembelajaran,
    arahanRangkuman,
    kompetensiInti,
    prasyarat,
    buktiKetercapaian,
    suggestedSemester,
    progressionStage,
    prasyaratTopicIds: opts?.prasyaratTopicIds,
    relatedTopicIds: opts?.relatedTopicIds,
    spiralRelation: opts?.spiralRelation,
    suggestedGrade: opts?.suggestedGrade,
    estimasiMenitSesi: 80,
    sumberDokumen:
      opts?.sumberDokumen ||
      'Kurasi Pedagogis AsesMerdeka — Merujuk SK Kepala BSKAP No. 046/H/KR/2025 & Panduan Mapel Kemendikdasmen',
    tahunVersi: opts?.tahunVersi || '2025',
    urlReferensi: opts?.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/panduan-mapel',
    nomorHalamanAtauBagian: opts?.nomorHalamanAtauBagian,
    statusVerifikasiSumber: opts?.statusVerifikasiSumber || 'kurasi_internal',
    jenisKonten: opts?.jenisKonten || 'kurasi_sistem',
  });
}

const SENI_MUSIK_GUIDE_DOC =
  'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)';
const SENI_MUSIK_GUIDE_URL =
  'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf';

const BKPDM_020_DOC =
  'Kurasi AsesMerdeka merujuk pembaruan CP Keputusan Kepala BKPDM No. 020 Tahun 2026 (Agama & Budi Pekerti)';
const BKPDM_020_URL =
  'https://www.kemendikdasmen.go.id/siaran-pers/15636-capaian-pembelajaran-baru-telah-terbit-yang-berubah-hanya-mata-pelajaran-agama-dan-budi-pekerti';

const KMA_MADRASAH_DOC =
  'Kurasi Rumpun Madrasah AsesMerdeka — Merujuk Regulasi CP Kemenag (KMA; verifikasi naskah lokal disarankan)';

export const SOCIAL_ARTS_RELIGION_TOPICS: CurriculumTopicEntry[] = [
  // =====================================================================
  // 5. IPS (SMP Fase D) & SEJARAH, EKONOMI, GEOGRAFI, SOSIOLOGI (SMA/SMK Fase E vs F)
  // =====================================================================
  s(
    'ips-fd-s1-keruangan-konektivitas', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Pemahaman Konsep & Keruangan',
    'Konektivitas Antarruang, Letak Geografis Indonesia, dan Keragaman Aktivitas Ekonomi Masyarakat',
    'Peserta didik dapat menganalisis keterkaitan kondisi geografis suatu wilayah dengan komoditas unggulan, kebutuhan perdagangan antarwilayah, serta adaptasi masyarakat lokal.',
    'Jelaskan faktor perbedaan kondisi alam pantai–dataran rendah–pegunungan, cara membaca komponen peta, dan interaksi antarwilayah.',
    'Menghubungkan potensi sumber daya keruangan dengan alur interaksi ekonomi antarwilayah.',
    ['Peta dasar & kenampakan alam SD'],
    ['Menjelaskan sebab-akibat pertukaran komoditas antardaerah berdasarkan kondisi geografis'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7' }
  ),
  s(
    'ips-fd-s1-sosialisasi-lembaga', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Sosiologi & Antropologi',
    'Proses Sosialisasi, Norma Sosial, dan Peran Lembaga Sosial (Keluarga, Pendidikan, Ekonomi, Hukum)',
    'Peserta didik dapat membedakan fungsi manifes dan laten lembaga sosial dalam menjaga keteraturan masyarakat majemuk serta mengidentifikasi agen sosialisasi.',
    'Berikan contoh peran keluarga, sekolah, dan lembaga hukum dalam mencegah konflik dan perilaku menyimpang remaja.',
    'Menganalisis peran lembaga sosial dalam membentuk perilaku dan keteraturan hidup bermasyarakat.',
    ['Norma dan aturan dasar masyarakat SD'],
    ['Mencocokkan masalah sosial remaja dengan peran lembaga penangan yang tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  s(
    'ips-fd-s1-pasar-harga-uang', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Ekonomi Dasar',
    'Kelangkaan Sumber Daya, Permintaan–Penawaran, Terbentuknya Harga Pasar, dan Literasi Keuangan',
    'Peserta didik dapat menganalisis bagaimana perubahan permintaan atau penawaran memengaruhi harga pasar dan merencanakan anggaran pribadi berbasis kebutuhan prioritas.',
    'Sketsa kurva naik-turun harga saat panen raya vs gagal panen serta peran uang dan perbankan/tabungan pelajar.',
    'Menghubungkan mekanisme pasar permintaan–penawaran dengan keputusan konsumsi rumah tangga.',
    ['Kebutuhan vs keinginan SD'],
    ['Memprediksi arah pergeseran harga saat pasokan turun/naik dan menyusun anggaran seimbang'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'ips-fd-s1-sejarah-nusantara-awal', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Sejarah Indonesia Awal',
    'Interaksi Masyarakat Nusantara Masa Hindu–Buddha, Islam, hingga Masuknya Bangsa Asing',
    'Peserta didik dapat melacak jalur perdagangan maritim Nusantara yang memicu akulturasi budaya Hindu–Buddha dan Islam serta menganalisis faktor kedatangan kolonialisme.',
    'Gunakan peta jalur rempah Malaka–Nusantara untuk menunjukkan interaksi budaya damai melalui perdagangan dan kesenian.',
    'Menelaah proses akulturasi budaya dan dampak geopolitik perdagangan rempah Nusantara.',
    ['Kronologi awal wilayah Nusantara SD'],
    ['Mengidentifikasi bukti akulturasi budaya beserta faktor pendorong kolonialisme Barat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  s(
    'ips-fd-s2-kolonialisme-kemerdekaan', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Sejarah Kebangsaan',
    'Dampak Tanam Paksa/Politik Etis, Pergerakan Nasional, hingga Mempertahankan Kemerdekaan RI',
    'Peserta didik dapat membandingkan strategi perlawanan bersenjata lokal dengan perjuangan diplomasi dan organisasi modern sejak 1908 hingga 1949.',
    'Hubungkan lahirnya golongan terpelajar akibat Politik Etis dengan Sumpah Pemuda dan perundingan Linggarjati–KMB.',
    'Menganalisis pergeseran strategi perjuangan dari kedaerahan ke persatuan nasional dan diplomasi.',
    ['Sejarah perdagangan rempah Sem 1'],
    ['Membandingkan ciri perlawanan sebelum dan sesudah 1908 secara runtut'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ips-fd-s1-sejarah-nusantara-awal'], relatedTopicIds: ['ips-fd-s1-sejarah-nusantara-awal'], suggestedGrade: '8' }
  ),
  s(
    'ips-fd-s2-mobilitas-pluralitas', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Dinamika Sosial',
    'Mobilitas Sosial, Pluralitas Budaya, dan Resolusi Konflik untuk Integrasi Nasional',
    'Peserta didik dapat mengidentifikasi saluran mobilitas sosial vertikal/horizontal serta merumuskan strategi penyelesaian konflik secara mediasi dan akomodasi dalam masyarakat multikultural.',
    'Analisis kasus nyata mobilitas sosial melalui pendidikan/prestasi serta perbedaan asimilasi vs akulturasi dalam integrasi sosial.',
    'Merancang strategi menjaga harmoni sosial di tengah keragaman suku, budaya, dan ekonomi.',
    ['Lembaga sosial Sem 1'],
    ['Membedakan saluran mobilitas dan memilih bentuk resolusi konflik konstruktif pada kasus masyarakat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ips-fd-s1-sosialisasi-lembaga'], relatedTopicIds: ['ips-fd-s1-sosialisasi-lembaga'], suggestedGrade: '8' }
  ),
  s(
    'ips-fd-s2-perdagangan-ekonomi-kreatif', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Ekonomi Terapan',
    'Perdagangan Antarpulau/Internasional, Ekonomi Kreatif Lokal, dan Perubahan Sosial Era Digital',
    'Peserta didik dapat menganalisis faktor pendorong ekspor-impor antardaerah serta mengevaluasi peluang dan risiko ekonomi kreatif digital bagi pelaku usaha lokal.',
    'Gunakan contoh produk kriya/kuliner lokal yang dipasarkan antarpulau memakai lokapasar digital sambil mewaspadai ketimpangan akses internet.',
    'Menghubungkan keunggulan komparatif daerah dengan inovasi ekonomi kreatif di era global.',
    ['Pasar & harga Sem 1'],
    ['Analisis keunggulan komparatif produk lokal dan usulan inovasi kemasan/pemasaran digital'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ips-fd-s1-pasar-harga-uang', 'ips-fd-s1-keruangan-konektivitas'], relatedTopicIds: ['ips-fd-s1-pasar-harga-uang'], suggestedGrade: '9' }
  ),
  s(
    'ips-fd-s2-asean-sdgs-proyek', 'IPS (Ilmu Pengetahuan Sosial)', 'SMP/MTs', 'Fase D', 'Integrasi Keterampilan Proses IPS',
    'Kerja Sama Indonesia di ASEAN–Global serta Inkuiri Sosial Masalah Pembangunan Berkelanjutan',
    'Peserta didik dapat mengevaluasi peran kerja sama Indonesia di kawasan ASEAN/global serta melakukan proyek penyelidikan sosial sederhana terhadap isu lingkungan atau literasi ekonomi sekolah.',
    'Pandu langkah metode inkuiri sosial: observasi masalah lokal, wawancara mini 5 responden, tabulasi temuan, dan rekomendasi berbasis bukti.',
    'Mengintegrasikan perspektif keruangan, sejarah, ekonomi, dan sosiologi dalam penelitian sosial singkat.',
    ['Keruangan, ekonomi, dan dinamika sosial'],
    ['Laporan inkuiri mini menyajikan data wawancara/observasi nyata dan usulan solusi terukur'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '9' }
  ),

  // Ekonomi SMA (Fase E vs Fase F)
  s(
    'eko-fe-s1-keseimbangan-pasar-elastisitas', 'Ekonomi', 'SMA/MA', 'Fase E', 'Permintaan, Penawaran & Pasar',
    'Hukum Permintaan–Penawaran, Harga Keseimbangan Matematis (Qd = Qs), dan Elastisitas Harga',
    'Peserta didik dapat menghitung harga dan kuantitas keseimbangan pasar termasuk dampak pajak/subsidi serta menafsirkan koefisien elastisitas barang pokok vs barang mewah.',
    'Bedakan pergerakan sepanjang kurva akibat harga dengan pergeseran kurva akibat pendapatan/selera/teknologi.',
    'Menganalisis mekanisme penentuan harga pasar secara kuantitatif dan grafis.',
    ['Persamaan linear SMP'],
    ['Solusi titik (P*, Q*) sebelum dan sesudah pajak/subsidi dihitung akurat'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['eko-fe-s1-kelangkaan-pilihan'], relatedTopicIds: ['eko-fe-s1-kelangkaan-pilihan'], suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s1-kelangkaan-pilihan', 'Ekonomi', 'SMA/MA', 'Fase E', 'Konsep Dasar Ekonomi',
    'Kelangkaan Sumber Daya, Skala Prioritas, Biaya Peluang (Opportunity Cost), dan Prinsip Ekonomi',
    'Peserta didik dapat menghitung biaya peluang dari pengorbanan alternatif terbaik saat mengambil keputusan ekonomi pribadi maupun usaha.',
    'Bedakan biaya eksplisit pengeluaran uang dengan opportunity cost berupa manfaat alternatif terbaik yang ditinggalkan.',
    'Mengambil keputusan alokasi sumber daya terbatas secara rasional dan terukur.',
    ['Kebutuhan dasar SMP'],
    ['Perhitungan biaya peluang tepat pada skenario memilih kuliah vs bekerja atau penggunaan modal'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s1-sistem-pelaku-ekonomi', 'Ekonomi', 'SMA/MA', 'Fase E', 'Ekonomi Mikro Awal',
    'Peran Pelaku Ekonomi (Circular Flow 2–4 Sektor) dan Perbandingan Sistem Ekonomi Dunia',
    'Peserta didik dapat melacak arus barang, jasa, faktor produksi, dan uang antara RTK, RTP, Pemerintah, dan Luar Negeri serta membandingkan sistem ekonomi pasar, komando, dan Pancasila.',
    'Gambarkan alur balas jasa upah/sewa/bunga/laba di pasar faktor produksi vs belanja barang di pasar output.',
    'Memahami keterkaitan antarpelaku ekonomi makro-mikro dan posisi sistem ekonomi Indonesia.',
    ['Pelaku ekonomi SMP'],
    ['Diagram circular flow membedakan arus uang vs arus faktor produksi secara tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s1-pasar-struktur-ojk', 'Ekonomi', 'SMA/MA', 'Fase E', 'Pasar & Lembaga Keuangan',
    'Struktur Pasar (Persaingan Sempurna, Monopoli, Oligopoli) serta Peran Bank Sentral, Bank, dan OJK',
    'Peserta didik dapat membandingkan daya tawar produsen–konsumen di berbagai struktur pasar serta menilai keamanan produk keuangan digital yang diawasi OJK/BI.',
    'Latih analisis kasus pinjaman online ilegal vs lembaga keuangan berizin serta ciri hambatan masuk pasar monopoli/oligopoli.',
    'Mengevaluasi struktur persaingan pasar dan literasi pengelolaan risiko produk jasa keuangan.',
    ['Harga keseimbangan pasar'],
    ['Identifikasi ciri struktur pasar tepat; kriteria legalitas layanan keuangan OJK diterapkan'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s2-uang-pembayaran-digital', 'Ekonomi', 'SMA/MA', 'Fase E', 'Uang & Sistem Pembayaran',
    'Fungsi Uang, Sistem Pembayaran Tunai vs QRIS/Nontunai, dan Tugas Bank Indonesia',
    'Peserta didik dapat menganalisis evolusi alat pembayaran tunai dan elektronik serta menjelaskan peran Bank Indonesia menjaga kelancaran sistem pembayaran dan nilai rupiah.',
    'Bandingkan risiko keamanan transaksi digital (phishing, biaya transaksi) dan syarat uang sah (portability, durability, divisibility).',
    'Menggunakan instrumen pembayaran modern secara cermat sambil memahami otoritas moneter.',
    ['Lembaga keuangan & OJK Sem 1'],
    ['Perbandingan instrumen pembayaran disertai analisis kepraktisan dan mitigasi risiko penipuan'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['eko-fe-s1-pasar-struktur-ojk'], relatedTopicIds: ['eko-fe-s1-pasar-struktur-ojk'], suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s2-koperasi-badan-usaha', 'Ekonomi', 'SMA/MA', 'Fase E', 'Badan Usaha & Manajemen Awal',
    'Perbandingan BUMN, BUMS, Koperasi (Perhitungan SHU), dan Fungsi Manajemen (POAC)',
    'Peserta didik dapat membedakan asas tujuan laba BUMS vs layanan publik BUMN vs kekeluargaan Koperasi serta menghitung pembagian Sisa Hasil Usaha (SHU) anggota.',
    'Latih perhitungan porsi jasa modal simpanan + jasa usaha anggota dalam SHU serta fungsi manajemen Planning–Organizing–Actuating–Controlling.',
    'Mengevaluasi tata kelola badan usaha di Indonesia dan merencanakan manajemen usaha kecil.',
    ['Pelaku ekonomi Sem 1'],
    ['Perhitungan SHU berdasarkan simpanan dan transaksi anggota tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s2-literasi-keuangan-investasi', 'Ekonomi', 'SMA/MA', 'Fase E', 'Literasi Keuangan Pribadi',
    'Perencanaan Anggaran Pribadi, Tabungan, Proteksi Asuransi, dan Analisis Risiko Investasi Awal',
    'Peserta didik dapat menyusun rencana alokasi pemasukan realistis, dana darurat, serta membandingkan profil imbal hasil–risiko deposito, reksa dana, saham, dan emas.',
    'Tekankan prinsip "high return high risk" dan deteksi ciri penipuan investasi bodong (janji imbal hasil tetap tak masuk akal, tanpa izin OJK).',
    'Mengambil keputusan perencanaan keuangan pribadi secara bijak dan waspada risiko.',
    ['Biaya peluang & lembaga jasa keuangan OJK'],
    ['Rencana keuangan memisahkan pos wajib–darurat–investasi serta menolak skema ilegal berdasar indikator'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['eko-fe-s1-kelangkaan-pilihan', 'eko-fe-s1-pasar-struktur-ojk'], relatedTopicIds: ['eko-fe-s1-kelangkaan-pilihan'], suggestedGrade: '10' }
  ),
  s(
    'eko-fe-s2-proyek-simulasi-usaha', 'Ekonomi', 'SMA/MA', 'Fase E', 'Proyek Keterampilan Ekonomi',
    'Rancangan Mini Model Usaha Pelajar: Analisis Pasar, Harga Keseimbangan, dan Manajemen Kas',
    'Peserta didik dapat merancang proposal usaha mikro sederhana menggunakan prinsip biaya peluang, penetapan harga berdasarkan survei permintaan, dan pembagian peran tim POAC.',
    'Hubungkan konsep harga keseimbangan pasar Sem 1 ke uji kesediaan membayar calon pembeli nyata di kelas.',
    'Mengintegrasikan teori ekonomi mikro dan manajemen badan usaha ke proyek terukur.',
    ['Harga keseimbangan, SHU, & perencanaan keuangan'],
    ['Proposal menyajikan survei permintaan mini, penetapan harga rasional, dan alur kas proyek'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['eko-fe-s1-keseimbangan-pasar-elastisitas'], relatedTopicIds: ['eko-fe-s1-keseimbangan-pasar-elastisitas'], suggestedGrade: '10' }
  ),
  // Ekonomi Fase F
  s(
    'eko-ff-s1-pendapatan-nasional-pertumbuhan', 'Ekonomi', 'SMA/MA', 'Fase F', 'Ekonomi Makro',
    'Perhitungan Pendapatan Nasional (PDB/GNP, Tiga Pendekatan), Pendapatan Per Kapita, dan Indeks Gini',
    'Peserta didik dapat menghitung PDB dengan pendekatan produksi, pendapatan, dan pengeluaran serta menilai kualitas pemerataan pembangunan melalui Kurva Lorenz & Koefisien Gini.',
    'Tekankan perbedaan pertumbuhan ekonomi kuantitatif (% kenaikan PDB riil) vs pembangunan ekonomi kualitatif (IPM, ketimpangan Gini, kualitas hidup).',
    'Mengukur kinerja ekonomi makro dan menilai ketimpangan distribusi pendapatan nasional.',
    ['Circular flow 4 sektor Fase E'],
    ['Tiga metode PDB menghasilkan konsistensi kategori komponen; indeks Gini diinterpretasikan tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'eko-ff-s1-ketenagakerjaan-inflasi', 'Ekonomi', 'SMA/MA', 'Fase F', 'Ekonomi Makro',
    'Dinamika Ketenagakerjaan (Pengangguran Struktural/Friksional) dan Perhitungan Indeks Harga & Inflasi',
    'Peserta didik dapat membedakan jenis pengangguran beserta solusinya, menghitung Indeks Harga Konsumen (IHK) serta laju inflasi, dan menilai dampaknya pada daya beli buruh/penabung.',
    'Bandingkan demand-pull inflation vs cost-push inflation serta dampak inflasi terhadap debitur vs kreditur.',
    'Menganalisis masalah utama ekonomi makro (pengangguran dan inflasi) berdasarkan data indeks.',
    ['Pendapatan nasional'],
    ['Perhitungan IHK dan laju inflasi tepat disertai identifikasi pihak yang diuntungkan/dirugikan inflasi'],
    '1 (Ganjil)', 'integrasi', { prasyaratTopicIds: ['eko-ff-s1-pendapatan-nasional-pertumbuhan'], relatedTopicIds: ['eko-ff-s1-pendapatan-nasional-pertumbuhan'], suggestedGrade: '11' }
  ),
  s(
    'eko-ff-s1-kebijakan-moneter-fiskal', 'Ekonomi', 'SMA/MA', 'Fase F', 'Kebijakan Makroekonomi',
    'Kebijakan Moneter (BI Rate, GWM, Pasar Terbuka) & Kebijakan Fiskal (APBN, Pajak Progresif)',
    'Peserta didik dapat merancang bauran kebijakan moneter ekspansif/kontraktif oleh BI dan kebijakan fiskal APBN oleh pemerintah untuk meredam resesi atau inflasi tinggi.',
    'Gunakan simulasi tabel: saat inflasi tinggi → kebijakan uang ketat (naikkan suku bunga/jual SBN + pangkas belanja tak prioritas/naikkan pajak).',
    'Mengevaluasi instrumen kebijakan moneter vs fiskal dalam menstabilkan siklus ekonomi nasional.',
    ['Inflasi & fungsi Bank Indonesia'],
    ['Pemilihan instrumen kontraktif vs ekspansif sesuai kondisi resesi atau inflasi tinggi tepat'],
    '1 (Ganjil)', 'pendalaman', { prasyaratTopicIds: ['eko-ff-s1-ketenagakerjaan-inflasi'], relatedTopicIds: ['eko-ff-s1-ketenagakerjaan-inflasi'], suggestedGrade: '11' }
  ),
  s(
    'eko-ff-s1-perdagangan-kurs-neraca', 'Ekonomi', 'SMA/MA', 'Fase F', 'Ekonomi Internasional',
    'Teori Keunggulan Komparatif, Kebijakan Tarif/Kuota, Kurs Valuta Asing, dan Neraca Pembayaran',
    'Peserta didik dapat menentukan negara yang memiliki keunggulan komparatif berdasar biaya peluang, mengonversi kurs beli–jual valuta asing, serta menelaah defisit/surplus neraca berjalan.',
    'Pastikan siswa selalu memakai sudut pandang bank/money changer saat menentukan kapan memakai kurs jual vs kurs beli.',
    'Menganalisis dampak perdagangan bebas, proteksionisme, dan fluktuasi nilai tukar terhadap pelaku ekspor–impor.',
    ['Biaya peluang & pelaku ekonomi luar negeri'],
    ['Konversi kurs jual/beli tepat dan keuntungan spesialisasi keunggulan komparatif terhitung benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '12' }
  ),
  s(
    'eko-ff-s2-persamaan-dasar-jurnal-jasa', 'Ekonomi', 'SMA/MA', 'Fase F', 'Akuntansi Perusahaan Jasa',
    'Konsep Dasar Akuntansi, Persamaan Akuntansi (A = L + E), Analisis Bukti Transaksi & Jurnal Umum',
    'Peserta didik dapat menganalisis transaksi kas/kredit menggunakan persamaan dasar akuntansi dan aturan saldo normal debit–kredit ke dalam Jurnal Umum perusahaan jasa.',
    'Kuasai mekanisme debit–kredit 5 kelompok akun (Harta, Utang, Modal, Pendapatan, Beban) sebelum memposting ke Buku Besar.',
    'Mencatat transaksi keuangan bisnis jasa secara sistematis sesuai siklus awal akuntansi.',
    ['Literasi keuangan dasar'],
    ['Keseimbangan Aset = Liabilitas + Ekuitas terjaga setiap transaksi dan penempatan debit/kredit tepat'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '12' }
  ),
  s(
    'eko-ff-s2-penyesuaian-laporan-jasa', 'Ekonomi', 'SMA/MA', 'Fase F', 'Akuntansi Perusahaan Jasa',
    'Buku Besar, Neraca Saldo, Jurnal Penyesuaian (AJP), Kertas Kerja, dan Laporan Keuangan Jasa',
    'Peserta didik dapat menyusun Ayat Jurnal Penyesuaian (beban dibayar di muka, penyusutan, perlengkapan terpakai) hingga menyusun Laporan Laba Rugi, Perubahan Modal, dan Neraca.',
    'Tekankan perbedaan pengakuan akrual antara nilai awal dibayar vs sisa akhir perlengkapan yang terpakai pada akhir periode.',
    'Menyusun laporan keuangan perusahaan jasa lengkap dan mengevaluasi kesehatan profitabilitasnya.',
    ['Jurnal umum perusahaan jasa'],
    ['Angka penyesuaian tepat mengurangi saldo neraca dan Laporan Laba Rugi–Neraca tersusun seimbang'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['eko-ff-s2-persamaan-dasar-jurnal-jasa'], relatedTopicIds: ['eko-ff-s2-persamaan-dasar-jurnal-jasa'], suggestedGrade: '12' }
  ),
  s(
    'eko-ff-s2-akuntansi-perusahaan-dagang', 'Ekonomi', 'SMA/MA', 'Fase F', 'Akuntansi Perusahaan Dagang',
    'Jurnal Khusus Perusahaan Dagang (Pembelian, Penjualan, Penerimaan/Pengeluaran Kas) & HPP',
    'Peserta didik dapat membedakan syarat pembayaran (2/10, n/30) dan FOB Shipping/Destination, mencatat transaksi ke Jurnal Khusus, serta menghitung Harga Pokok Penjualan (HPP).',
    'Rumus HPP = Persediaan Awal + Pembelian Bersih − Persediaan Akhir lengkap dengan beban angkut dan retur/potongan.',
    'Mengelola pencatatan transaksi berulang perusahaan dagang beserta penghitungan HPP dan laba kotor.',
    ['Siklus akuntansi perusahaan jasa'],
    ['Klasifikasi ke 4 jurnal khusus tepat dan perhitungan HPP beserta laba bersih akurat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['eko-ff-s2-penyesuaian-laporan-jasa'], relatedTopicIds: ['eko-ff-s2-penyesuaian-laporan-jasa'], suggestedGrade: '12' }
  ),
  s(
    'eko-ff-s2-sintesis-evaluasi-kinerja-makro-bisnis', 'Ekonomi', 'SMA/MA', 'Fase F', 'Integrasi Makro & Akuntansi',
    'Analisis Dampak Kondisi Makro (Inflasi/Suku Bunga/Kurs) pada Laporan Keuangan dan Keputusan Bisnis',
    'Peserta didik dapat mengevaluasi bagaimana kenaikan suku bunga, inflasi bahan, atau pelemahan rupiah memengaruhi HPP, beban bunga, dan strategi penetapan harga dalam laporan keuangan.',
    'Gabungkan pemahaman kebijakan moneter/kurs Semester 1 dengan pembacaan laporan Laba Rugi–Neraca Semester 2.',
    'Mengintegrasikan indikator ekonomi makro dalam menafsirkan risiko profitabilitas laporan akuntansi.',
    ['Kebijakan moneter/kurs & laporan keuangan'],
    ['Analisis kasus mengaitkan perubahan kurs/suku bunga terhadap marjin laba bersih perusahaan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['eko-ff-s1-kebijakan-moneter-fiskal', 'eko-ff-s2-akuntansi-perusahaan-dagang'], relatedTopicIds: ['eko-ff-s1-kebijakan-moneter-fiskal'], suggestedGrade: '12' }
  ),

  // Geografi SMA (Fase E vs Fase F)
  s(
    'geo-fe-s1-konsep-pendekatan-peta', 'Geografi', 'SMA/MA', 'Fase E', 'Pengetahuan Dasar Geografi & Geospasial',
    '10 Konsep Esensial Geografi, 3 Pendekatan (Keruangan, Ekologi, Kompleks Wilayah), dan Pemetaan Dasar',
    'Peserta didik dapat mengidentifikasi pendekatan geografi tepat dalam studi banjir/permukiman serta membaca unsur peta termasuk proyeksi dan perhitungan skala.',
    'Bedakan pendekatan keruangan (distribusi ruang), ekologi (interaksi manusia–lingkungan), dan kompleks wilayah (kombinasi antarwilayah).',
    'Menggunakan sudut pandang geospasial dan konsep dasar geografi dalam mengkaji masalah lingkungan.',
    ['Konektivitas ruang & peta dasar SMP'],
    ['Pemilihan 3 pendekatan pada 3 fenomena geografis tepat dan perhitungan jarak/skala peta akurat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s1-pj-sig-dasar', 'Geografi', 'SMA/MA', 'Fase E', 'Teknologi Geospasial Dasar',
    'Penginderaan Jauh (Interpretasi Citra), Prinsip Sistem Informasi Geografis (SIG), dan Survei Wilayah',
    'Peserta didik dapat menerapkan unsur interpretasi citra (rona, tekstur, pola, asosiasi) untuk mengenali tutupan lahan serta menyusun overlay peta tematik sederhana.',
    'Tunjukkan beda data spasial vektor (titik, garis, poligon) vs raster pada tumpang susun (overlay) penentuan zona rawan banjir.',
    'Mengolah informasi citra penginderaan jauh dan lapisan SIG dasar untuk analisis wilayah.',
    ['Pemetaan dasar Sem 1'],
    ['Unsur interpretasi citra mengidentifikasi objek dengan tepat; logika overlay lapisan SIG runtut'],
    '1 (Ganjil)', 'pengembangan', { prasyaratTopicIds: ['geo-fe-s1-konsep-pendekatan-peta'], relatedTopicIds: ['geo-fe-s1-konsep-pendekatan-peta'], suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s1-litosfer-pedosfer', 'Geografi', 'SMA/MA', 'Fase E', 'Dinamika Litosfer',
    'Tektonisme, Vulkanisme, Seisme, Pelapukan Batuan, dan Konservasi Tanah (Litosfer–Pedosfer)',
    'Peserta didik dapat menganalisis proses endogen–eksogen pembentuk relief Indonesia, risiko gempa/erupsi, serta metode konservasi tanah mekanik dan vegetatif pada lahan miring.',
    'Kaitkan zona subduksi lempeng Indonesia dengan kesuburan tanah vulkanik sekaligus kewaspadaan bahaya sesar aktif.',
    'Menganalisis keterkaitan proses geologi pembentuk muka bumi dengan mitigasi risiko serta pemanfaatan tanah.',
    ['Lapisan bumi SMP'],
    ['Identifikasi jenis patahan/lipatan dan pemilihan teknik konservasi terasering/reboisasi tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s1-penelitian-geografi-awal', 'Geografi', 'SMA/MA', 'Fase E', 'Keterampilan Inkuiri Geografi',
    'Merancang Langkah Penelitian Geografi Sosial–Lingkungan Berbasis Observasi Wilayah Lokal',
    'Peserta didik dapat merumuskan pertanyaan 5W+1H geografis, menentukan data primer observasi/peta, dan mempresentasikan laporan singkat fenomena lingkungan sekitar sekolah.',
    'Tekankan keterikatan data dengan lokasi (peta lokasi kajian) sehingga penelitian benar-benar berciri spasial geografis.',
    'Menerapkan metode ilmiah berperspektif spasial untuk menyelidiki isu lingkungan setempat.',
    ['Pendekatan geografi & SIG dasar'],
    ['Rancangan penelitian menyertakan lokasi terpetakan, metode observasi, dan teknik analisis ruang'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s2-atmosfer-iklim-el-nino', 'Geografi', 'SMA/MA', 'Fase E', 'Dinamika Atmosfer',
    'Lapisan Atmosfer, Unsur Cuaca–Iklim, Klasifikasi Iklim, dan Dampak El Niño–La Niña di Indonesia',
    'Peserta didik dapat membaca data curah hujan/suhu untuk mengklasifikasikan tipe iklim wilayah serta mengevaluasi pengaruh El Niño terhadap musim kemarau/kebakaran lahan.',
    'Bedakan unsur cuaca (angin muson, tekanan udara, kelembaban) dan jenis hujan orografis–konvektif–frontal.',
    'Menganalisis dinamika atmosfer terhadap pola tanam pertanian dan kesiapsiagaan iklim ekstrem.',
    ['Pendekatan ekologi & unsur peta'],
    ['Pembacaan data curah hujan tepat; perbedaan dampak El Niño vs La Niña di Indonesia dijelaskan benar'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s2-hidrosfer-das-laut', 'Geografi', 'SMA/MA', 'Fase E', 'Dinamika Hidrosfer',
    'Siklus Hidrologi, Karakteristik Daerah Aliran Sungai (DAS), Air Tanah, dan Morfologi Pesisir–Laut',
    'Peserta didik dapat menganalisis fungsi daerah hulu–hilir DAS dalam mengendalikan limpasan banjir serta mengidentifikasi zona batimetri dan arus laut Indonesia.',
    'Kaitkan konversi hutan di daerah hulu dengan penurunan infiltrasi air tanah dan meningkatnya debit puncak di daerah hilir.',
    'Mengevaluasi tata kelola daerah aliran sungai dan potensi kelautan Indonesia secara berkelanjutan.',
    ['Konservasi tanah litosfer Sem 1'],
    ['Analisis hulu–tengah–hilir DAS mengaitkan tata guna lahan dengan risiko banjir'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['geo-fe-s1-litosfer-pedosfer'], relatedTopicIds: ['geo-fe-s1-litosfer-pedosfer'], suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s2-jagat-raya-rotasi-kehidupan', 'Geografi', 'SMA/MA', 'Fase E', 'Bumi sebagai Ruang Kehidupan',
    'Dinamika Planet Bumi dalam Tata Surya dan Faktor Geografis Penentu Kelayakan Hunian Manusia',
    'Peserta didik dapat menjelaskan bagaimana kecondongan sumbu rotasi Bumi, atmosfer pelindung, dan keberadaan air mendukung variasi musim serta zona huni global.',
    'Fokus pada dampaknya bagi zona lintang iklim bumi dan pembagian waktu WIB/WITA/WIT di Indonesia.',
    'Menghubungkan posisi astronomis bumi dengan distribusi iklim dan zona waktu wilayah Indonesia.',
    ['Rotasi & revolusi SD/SMP dan atmosfer'],
    ['Konversi zona waktu lintang bujur tepat dan pengaruh kemiringan sumbu bumi terhadap musim jelas'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '10' }
  ),
  s(
    'geo-fe-s2-proyek-peta-hidrometeorologi', 'Geografi', 'SMA/MA', 'Fase E', 'Integrasi Geospasial',
    'Proyek Pemetaan Partisipatif Sederhana Area Rawan Banjir/Longsor Lingkungan Sekitar Sekolah',
    'Peserta didik dapat menggabungkan data kemiringan lereng/litosfer, curah hujan/atmosfer, dan kondisi sungai/drainase menjadi sketsa peta kerawanan lokal beserta saran mitigasi.',
    'Pandu menggabungkan tiga lapisan geosfer (litosfer, atmosfer, hidrosfer) dalam satu peta sketsa analitis berbasis prinsip SIG.',
    'Mengintegrasikan seluruh kajian geosfer Fase E ke pemetaan risiko lokal berbasis data observasi.',
    ['SIG overlay, litosfer, atmosfer & hidrosfer'],
    ['Peta tematik gabungan memiliki legenda jelas dan alasan tingkat kerawanan logis'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['geo-fe-s1-pj-sig-dasar', 'geo-fe-s2-atmosfer-iklim-el-nino', 'geo-fe-s2-hidrosfer-das-laut'], relatedTopicIds: ['geo-fe-s1-pj-sig-dasar'], suggestedGrade: '10' }
  ),
  // Geografi Fase F
  s(
    'geo-ff-s1-posisi-strategis-flora-fauna', 'Geografi', 'SMA/MA', 'Fase F', 'Geografi Indonesia & Biosfer',
    'Posisi Strategis Indonesia sebagai Poros Maritim dan Sebaran Bioma–Flora Fauna (Garis Wallace–Weber)',
    'Peserta didik dapat menganalisis keunggulan jalur ALKI terhadap perdagangan maritim global serta faktor iklim, edafik, fisiografis yang memengaruhi zona Asiatis, Peralihan, dan Australis.',
    'Bandingkan keunikan endemik Wallacea dengan bioma dunia (hutan hujan tropis, sabana, stepa, tundra) berdasar curah hujan dan lintang.',
    'Mengevaluasi potensi geopolitik maritim Indonesia dan strategi konservasi keanekaragaman hayati wilayah.',
    ['Letak geografis & SIG dasar Fase E'],
    ['Pemisahan zona Wallace–Weber beserta contoh fauna endemik dan potensi jalur ALKI tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'geo-ff-s1-pengelolaan-sda-ketahanan', 'Geografi', 'SMA/MA', 'Fase F', 'Sumber Daya & Pembangunan',
    'Pengelolaan Sumber Daya Alam Berkelanjutan, Ketahanan Pangan–Energi, dan Analisis AMDAL',
    'Peserta didik dapat mengevaluasi persebaran komoditas pangan/tambang/energi baru Indonesia serta menelaah instrumen AMDAL agar pemanfaatan SDA tetap ramah lingkungan.',
    'Kontraskan prinsip ekoefisiensi dan pertambangan berkelanjutan terhadap konflik tata ruang atau alih fungsi lahan pertanian produktif.',
    'Merumuskan strategi pengelolaan SDA yang menyeimbangkan kebutuhan ekonomi, energi, dan kelestarian lingkungan.',
    ['Litosfer, hidrosfer, dan bioma'],
    ['Identifikasi sebaran SDA strategis & evaluasi dampak AMDAL terhadap risiko kerusakan ekosistem tepat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  s(
    'geo-ff-s1-dinamika-kependudukan-sdm', 'Geografi', 'SMA/MA', 'Fase F', 'Antroposfer',
    'Dinamika Penduduk (Piramida Penduduk, Bonus Demografi, Migrasi) dan Kualitas SDM Indonesia',
    'Peserta didik dapat menafsirkan tiga bentuk piramida penduduk (ekspansif, stasioner, konstruktif), menghitung sex ratio/dependency ratio, dan menganalisis syarat keberhasilan Bonus Demografi.',
    'Tekankan bahwa Bonus Demografi hanya menjadi berkah ekonomi jika diiringi peningkatan pendidikan, kesehatan, dan ketersediaan lapangan kerja.',
    'Menganalisis proyeksi kependudukan untuk perencanaan kebijakan pendidikan dan ketenagakerjaan daerah.',
    ['Data statistik kependudukan SMP'],
    ['Perhitungan rasio ketergantungan tepat dan interpretasi piramida penduduk sesuai data'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'geo-ff-s1-mitigasi-bencana-lingkungan', 'Geografi', 'SMA/MA', 'Fase F', 'Kebencanaan & Lingkungan',
    'Siklus Penanggulangan Bencana (Pra-Bencana, Tanggap Darurat, Pasca-Bencana) Berbasis Kearifan Lokal',
    'Peserta didik dapat menyusun rencana mitigasi struktural vs nonstruktural pada wilayah rawan gempa, tsunami, atau longsor serta mengevaluasi peran kearifan lokal.',
    'Bandingkan sistem peringatan dini modern dengan kearifan lokal seperti Smong (Simeulue) dalam menurunkan kerentanan korban.',
    'Merancang strategi pengurangan risiko bencana terpadu sesuai karakteristik bahaya wilayah.',
    ['Tektonik/litosfer & hidrometeorologi Fase E'],
    ['Peta rencana mitigasi membedakan tindakan pra-bencana vs darurat vs rehabilitasi secara jelas'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  s(
    'geo-ff-s2-tata-ruang-kota-desa', 'Geografi', 'SMA/MA', 'Fase F', 'Pengembangan Wilayah',
    'Pola Keruangan Desa–Kota, Teori Konsentris–Sektoral, dan Perencanaan Tata Ruang Wilayah (RTRW)',
    'Peserta didik dapat menganalisis pola pemukiman desa serta zona struktur kota (CBD, transisi, permukiman, sub-urban) beserta permasalahan alih fungsi ruang dan urbanisasi.',
    'Gunakan model Teori Titik Henti dan Graf/Konektivitas untuk menghitung lokasi ideal fasilitas umum antara dua kota.',
    'Menganalisis interaksi wilayah desa–kota dan tata guna lahan berkelanjutan sesuai RTRW.',
    ['Konsep dasar geografi & SIG Fase E'],
    ['Perhitungan Teori Titik Henti akurat dan identifikasi zona kota serta konflik alih fungsi lahan tepat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  s(
    'geo-ff-s2-sig-lanjutan-pemanfaatan', 'Geografi', 'SMA/MA', 'Fase F', 'Teknologi Geospasial Lanjutan',
    'Aplikasi Penginderaan Jauh & SIG Lanjutan dalam Tata Guna Lahan, Jaringan Transportasi, dan Mitigasi',
    'Peserta didik dapat menyusun skema alur scoring/pembobotan SIG untuk menentukan kesesuaian lahan (mis. lokasi TPA, sekolah, atau zona aman permukiman).',
    'Latih menyusun matriks bobot parameter (jarak dari jalan, kemiringan, jarak dari sungai, tata guna lahan saat ini) dalam analisis kesesuaian ruang.',
    'Menerapkan analisis spasial SIG berparameter ganda guna mendukung keputusan penataan wilayah.',
    ['Penginderaan jauh & overlay SIG Fase E'],
    ['Matriks scoring parameter spasial logis tidak melanggar zona lindung/sempadan sungai'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['geo-ff-s2-tata-ruang-kota-desa'], relatedTopicIds: ['geo-ff-s2-tata-ruang-kota-desa'], suggestedGrade: '12' }
  ),
  s(
    'geo-ff-s2-negara-maju-berkembang', 'Geografi', 'SMA/MA', 'Fase F', 'Geografi Regional & Global',
    'Karakteristik Pembangunan Negara Maju vs Berkembang dan Kerja Sama Ekonomi Regional di Era Global',
    'Peserta didik dapat membandingkan indikator IPM, struktur ekonomi, angka melek huruf, dan infrastruktur inovasi antara negara maju dan berkembang tanpa menyederhanakan determinisme alam.',
    'Soroti strategi hilirisasi industri, penguatan SDM, dan posisi kerja sama bilateral/multilateral Indonesia di kawasan Indo-Pasifik.',
    'Mengevaluasi posisi Indonesia dalam kerja sama global dan faktor keberhasilan transformasi pembangunan.',
    ['Dinamika SDM & ketahanan pangan'],
    ['Perbandingan indikator multi-dimensi (ekonomi, pendidikan, kesehatan) akurat dan tidak stereotip'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  s(
    'geo-ff-s2-proyek-rencana-wilayah-tangguh', 'Geografi', 'SMA/MA', 'Fase F', 'Integrasi Geografi Wilayah',
    'Proyek Perencanaan Wilayah Tangguh Bencana & Berkelanjutan Berbasis Analisis Data SIG–RTRW',
    'Peserta didik dapat mengintegrasikan profil kependudukan, daya dukung SDA, zonasi kerawanan bencana, dan peta tata ruang menjadi rekomendasi pengembangan kabupaten/kota studi kasus.',
    'Padukan temuan demografi, ketahanan pangan-air, dan zonasi bahaya menjadi usulan revisi zona pemanfaatan ruang yang realistis.',
    'Menghasilkan kajian perencanaan kewilayahan menyeluruh berbasis bukti spasial dan demografis.',
    ['Dinamika penduduk, mitigasi bencana, & SIG lanjutan'],
    ['Kajian wilayah mencakup data demografis, zonasi bahaya, dan peta rekomendasi tata ruang seimbang'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['geo-ff-s1-mitigasi-bencana-lingkungan', 'geo-ff-s2-sig-lanjutan-pemanfaatan'], relatedTopicIds: ['geo-ff-s2-sig-lanjutan-pemanfaatan'], suggestedGrade: '12' }
  ),

  // Sosiologi SMA (Fase E vs Fase F)
  s(
    'sos-fe-s1-ilmu-sosiologi', 'Sosiologi', 'SMA/MA', 'Fase E', 'Fondasi Sosiologi',
    'Kelahiran Sosiologi, Objek Kajian Gejala Sosial, serta Perspektif Tokoh Klasik',
    'Peserta didik dapat menjelaskan ciri sosiologi sebagai ilmu empiris, teoretis, kumulatif, dan non-etis serta membedakan fungsi sosiologi dalam mengkaji realitas sosial.',
    'Tekankan makna "non-etis" (menjelaskan sebab-akibat fakta sosial secara objektif sebelum memberi penghakiman moral).',
    'Memandang gejala sosial masyarakat dengan kacamata ilmiah objektif dan multiperspektif.',
    ['Lembaga dan norma sosial SMP'],
    ['Ciri empiris/non-etis sosiologi dibedakan tepat dari opini moral populer'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s1-interaksi-tindakan-sosial', 'Sosiologi', 'SMA/MA', 'Fase E', 'Individu & Masyarakat',
    'Tindakan Sosial (Max Weber), Syarat Interaksi Sosial, serta Pola Asosiatif & Disosiatif',
    'Peserta didik dapat mengelompokkan motif tindakan sosial (rasional instrumental, nilai, afektif, tradisional) serta membedakan bentuk kerja sama, akomodasi, persaingan, dan pertentangan.',
    'Analisis interaksi tatap muka maupun interaksi media sosial kontemporer melalui syarat kontak dan komunikasi bermakna.',
    'Mengklasifikasikan motif di balik tindakan individu dan dinamika interaksi kelompok.',
    ['Sosialisasi SMP'],
    ['Identifikasi 4 tipe tindakan sosial Weber dan bentuk asosiatif/disosiatif pada contoh nyata tepat'],
    '1 (Ganjil)', 'pengembangan', { prasyaratTopicIds: ['sos-fe-s1-ilmu-sosiologi'], relatedTopicIds: ['sos-fe-s1-ilmu-sosiologi'], suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s1-nilai-norma-lembaga', 'Sosiologi', 'SMA/MA', 'Fase E', 'Keteraturan Sosial',
    'Pembentukan Kepribadian, Agen Sosialisasi, Nilai–Norma, dan Fungsi Lembaga Sosial',
    'Peserta didik dapat menganalisis peran keluarga, teman sebaya, sekolah, dan media massa dalam membentuk identitas remaja serta dampak penyimpangan sosial dan pengendaliannya.',
    'Bedakan pelanggaran folkways (kebiasaan), mores (tata kelakuan), vs laws (hukum formal) dan mekanisme pengendalian sosial preventif–represif.',
    'Menelaah bagaimana keteraturan sosial terbentuk dan bagaimana norma ditegakkan secara adil.',
    ['Interaksi sosial Sem 1'],
    ['Hierarki daya ikat norma dan jenis pengendalian sosial dianalisis pada kasus kehidupan pelajar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s1-identitas-heterogenitas', 'Sosiologi', 'SMA/MA', 'Fase E', 'Identitas & Gejala Sosial',
    'Ragam Gejala Sosial (Kemiskinan Remaja, Budaya Populer Digital) dan Pengelolaan Keragaman Identitas',
    'Peserta didik dapat membedakan faktor pembentuk gejala sosial di tingkat mikro–makro serta mengkritisi stereotip sosial di ruang fisik maupun daring.',
    'Latih analisis empatik mengapa fenomena gaya hidup konsumtif atau FOMO remaja dipengaruhi struktur kelompok rujukan.',
    'Mengidentifikasi pola pembentukan identitas sosial sekaligus bahaya prasangka/stereotip.',
    ['Interaksi sosial & agen media'],
    ['Analisis kasus gejala sosial digital menelusuri akar struktur kelompok, bukan sekadar menyalahkan individu'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s2-permasalahan-sosial-kriteria', 'Sosiologi', 'SMA/MA', 'Fase E', 'Masalah Sosial',
    'Membedakan Masalah Pribadi vs Masalah Sosial Publik dan Dampak Ketimpangan Digital/Ekonomi',
    'Peserta didik dapat menggunakan kriteria masalah sosial (sumber sosial, tingkat keresahan publik, celah antara nilai ideal dan kenyataan) untuk menganalisis fenomena perundungan atau pengangguran muda.',
    'Perkenalkan konsep C. Wright Mills tentang "imajinasi sosiologis" (menghubungkan persoalan pribadi dengan pola struktur masyarakat).',
    'Menganalisis masalah sosial secara struktural, tidak berhenti pada faktor individu semata.',
    ['Norma, penyimpangan & gejala sosial Sem 1'],
    ['Analisis kasus memakai imajinasi sosiologis untuk memisahkan akar struktural vs tindakan pribadi'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['sos-fe-s1-identitas-heterogenitas'], relatedTopicIds: ['sos-fe-s1-identitas-heterogenitas'], suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s2-desain-penelitian-sosial', 'Sosiologi', 'SMA/MA', 'Fase E', 'Metodologi Sosiologi',
    'Merancang Penelitian Sosial Sederhana: Rumusan Masalah, Metode Kualitatif vs Kuantitatif, & Etika',
    'Peserta didik dapat memilih pendekatan survei kuantitatif atau wawancara kualitatif sesuai jenis pertanyaan penelitian serta memahami etika menjaga kerahasiaan responden.',
    'Bandingkan keunggulan kuesioner terstruktur (memetakan tren angka) vs wawancara mendalam (memahami makna pengalaman informan).',
    'Menyusun instrumen pengumpulan data sosial yang valid dan beretika penelitian.',
    ['Ciri empiris sosiologi Sem 1'],
    ['Instrumen wawancara/kuesioner bebas pertanyaan menggiring (leading) dan menyertakan persetujuan informan'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['sos-fe-s1-ilmu-sosiologi'], relatedTopicIds: ['sos-fe-s1-ilmu-sosiologi'], suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s2-eksekusi-observasi-lapangan', 'Sosiologi', 'SMA/MA', 'Fase E', 'Penelitian Lapangan',
    'Pengolahan Data Lapangan, Triangulasi Temuan Sederhana, dan Penyajian Laporan Riset Sosial',
    'Peserta didik dapat mengumpulkan data mini di lingkungan sekolah, memverifikasi konsistensi temuan melalui triangulasi sumber, dan mempresentasikan laporan riset.',
    'Latih menabulasikan hasil angket/coding tema wawancara tanpa memanipulasi hasil yang tidak sesuai dugaan awal.',
    'Melaksanakan pengumpulan dan interpretasi data empiris gejala sosial sekolah secara jujur.',
    ['Desain penelitian sosial'],
    ['Laporan penelitian memuat data mentah terolah, keterbatasan sampel, dan simpulan sesuai temuan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['sos-fe-s2-desain-penelitian-sosial'], relatedTopicIds: ['sos-fe-s2-desain-penelitian-sosial'], suggestedGrade: '10' }
  ),
  s(
    'sos-fe-s2-aksi-kebhinekaan-sekolah', 'Sosiologi', 'SMA/MA', 'Fase E', 'Aksi Integrasi Sosial',
    'Kampanye Inklusi Sosial dan Pencegahan Perundungan Berbasis Temuan Riset Sekolah',
    'Peserta didik dapat menerjemahkan rekomendasi hasil penelitian sosial menjadi rencana program/kampanye sekolah yang membangun empati dan keterlibatan antarkelompok.',
    'Hubungkan hasil identifikasi pola perundungan atau eksklusivitas kelompok dengan desain kegiatan kolaborasi lintas ekstrakurikuler.',
    'Menerapkan temuan sosiologis untuk mendorong keteraturan sosial yang inklusif di satuan pendidikan.',
    ['Masalah sosial & laporan penelitian'],
    ['Rancangan aksi merujuk bukti temuan riset siswa dan melibatkan partisipasi kelompok beragam'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['sos-fe-s2-eksekusi-observasi-lapangan'], relatedTopicIds: ['sos-fe-s2-eksekusi-observasi-lapangan'], suggestedGrade: '10' }
  ),
  // Sosiologi Fase F
  s(
    'sos-ff-s1-kelompok-sosial-eksklusi', 'Sosiologi', 'SMA/MA', 'Fase F', 'Kelompok & Struktur Sosial',
    'Pembentukan Kelompok Sosial, Dinamika In-Group vs Out-Group, Partikularisme, dan Eksklusi Sosial',
    'Peserta didik dapat menganalisis perbedaan paguyuban–patembayan, kelompok primer–sekunder, serta bagaimana fanatisme kelompok (in-group bias) memicu eksklusi sosial.',
    'Kaitkan dengan ruang gema (echo chamber) komunitas daring dan cara mencegah polarisasi antar kelompok pelajar/warga.',
    'Menganalisis dinamika relasi kelompok sosial beserta potensi partikularisme dan eksklusivitasnya.',
    ['Interaksi sosial & identitas Fase E'],
    ['Analisis kasus membedakan gejala partikularisme kelompok dari solidaritas inklusif'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11' }
  ),
  s(
    'sos-ff-s1-diferensiasi-ketimpangan', 'Sosiologi', 'SMA/MA', 'Fase F', 'Struktur & Keadilan Sosial',
    'Diferensiasi Horizontal, Stratifikasi Vertikal, Kemiskinan Struktural, dan Ketimpangan Sosial',
    'Peserta didik dapat membedakan diferensiasi budaya yang setara vs stratifikasi akses sumber daya serta menganalisis faktor struktural di balik ketimpangan sosial.',
    'Bandingkan ketimpangan pendidikan, infrastruktur wilayah, dan modal sosial dalam sistem stratifikasi terbuka vs tertutup.',
    'Mengevaluasi akar ketimpangan akses kesejahteraan dan peluang mobilitas di masyarakat.',
    ['Masalah sosial & mobilitas'],
    ['Membedakan contoh diferensiasi setara vs stratifikasi hierarkis dengan analisis dampak akses yang tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'sos-ff-s1-konflik-kekerasan-mediasi', 'Sosiologi', 'SMA/MA', 'Fase F', 'Konflik & Resolusi',
    'Anatomi Konflik Sosial, Kekerasan Struktural/Kultural, dan Manajemen Resolusi (Mediasi–Arbitrase)',
    'Peserta didik dapat memetakan aktor, kepentingan, dan tahap eskalasi konflik sosial serta merancang model penyelesaian konflik damai menggunakan pemetaan konflik.',
    'Bedakan mediasi (pihak ketiga netral memfasilitasi), arbitrase (keputusan mengikat), rekonsiliasi, dan negosiasi kolaboratif.',
    'Menganalisis akar konflik multipihak dan merekomendasikan jalur resolusi berkeadilan.',
    ['Kelompok sosial & eksklusi'],
    ['Peta konflik memuat pihak terlibat, kebutuhan dasar yang bertabrakan, dan skema mediasi logis'],
    '1 (Ganjil)', 'integrasi', { prasyaratTopicIds: ['sos-ff-s1-kelompok-sosial-eksklusi'], relatedTopicIds: ['sos-ff-s1-kelompok-sosial-eksklusi'], suggestedGrade: '11' }
  ),
  s(
    'sos-ff-s1-integrasi-harmoni-multikultural', 'Sosiologi', 'SMA/MA', 'Fase F', 'Masyarakat Multikultural',
    'Masyarakat Multikultural, Kohesi Sosial, dan Penguatan Harmoni Antarkelompok di Ruang Publik',
    'Peserta didik dapat menganalisis prasyarat terwujudnya integrasi normatif dan fungsional dalam masyarakat majemuk serta merancang dialog lintas budaya yang konstruktif.',
    'Soroti perbedaan keseragaman paksa vs kesatuan dalam keragaman (Bhinneka Tunggal Ika) dan prinsip kesetaraan hak warga.',
    'Merumuskan pendekatan harmoni sosial yang menghormati identitas beragam sekaligus menjaga kohesi nasional.',
    ['Diferensiasi & resolusi konflik'],
    ['Rancangan penguatan harmoni menargetkan penyebab segregasi dan mengedepankan partisipasi setara'],
    '1 (Ganjil)', 'pendalaman', { prasyaratTopicIds: ['sos-ff-s1-konflik-kekerasan-mediasi'], relatedTopicIds: ['sos-ff-s1-konflik-kekerasan-mediasi'], suggestedGrade: '11' }
  ),
  s(
    'sos-ff-s2-perubahan-sosial-teori', 'Sosiologi', 'SMA/MA', 'Fase F', 'Perubahan Sosial',
    'Bentuk & Teori Perubahan Sosial (Evolusi, Siklus, Konflik) serta Cultural Lag Era Teknologi',
    'Peserta didik dapat menganalisis pendorong internal–eksternal perubahan sosial dan mendiagnosis fenomena cultural lag (ketertinggalan regulasi/etika dibanding kecepatan teknologi).',
    'Beri contoh cultural lag dan cultural shock di era otomasi kerja/AI serta mekanisme adaptasi sosial yang sehat.',
    'Menelaah pola, arah, dan ketimpangan ritme perubahan antar unsur budaya dan teknologi.',
    ['Struktur sosial & penelitian sosial'],
    ['Identifikasi faktor internal/eksternal dan contoh cultural lag dijelaskan dengan bukti empiris'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  s(
    'sos-ff-s2-globalisasi-pro-lokal', 'Sosiologi', 'SMA/MA', 'Fase F', 'Globalisasi & Masyarakat Digital',
    'Dampak Globalisasi pada Budaya Lokal, Konsumerisme Digital, dan Pemberdayaan Kearifan Lokal',
    'Peserta didik dapat mengevaluasi paradoks globalisasi (homogenisasi gaya hidup vs kebangkitan glokalisasi budaya daerah) serta merumuskan sikap kritis terhadap arus global.',
    'Bandingkan fenomena McDonaldisasi budaya dengan kisah sukses produk/tradisi lokal Indonesia berjejaring di pasar global.',
    'Mengambil posisi kritis sekaligus kreatif menghadapi dampak budaya, ekonomi, dan politik globalisasi.',
    ['Perubahan sosial & heterogenitas'],
    ['Analisis dampak positif–negatif globalisasi menyertakan contoh strategi glokalisasi konkret'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['sos-ff-s2-perubahan-sosial-teori'], relatedTopicIds: ['sos-ff-s2-perubahan-sosial-teori'], suggestedGrade: '12' }
  ),
  s(
    'sos-ff-s2-pemberdayaan-komunitas', 'Sosiologi', 'SMA/MA', 'Fase F', 'Pemberdayaan Masyarakat',
    'Prinsip Pemberdayaan Komunitas Berbasis Aset Lokal dan Partisipasi Warga Berkelanjutan',
    'Peserta didik dapat membedakan bantuan sosial karitatif jangka pendek dengan pemberdayaan komunitas (capacity building) berbasis kearifan lokal dan kemandirian warga.',
    'Tahapan persiapan, pengkajian partisipatif (PRA), perencanaan program bersama warga, implementasi, dan evaluasi kemandirian.',
    'Merancang program pemberdayaan masyarakat yang menempatkan komunitas sebagai subjek utama.',
    ['Ketimpangan sosial & globalisasi'],
    ['Rancangan program pemberdayaan memetakan aset lokal dan indikator keberhasilan kemandirian warga'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['sos-ff-s1-diferensiasi-ketimpangan'], relatedTopicIds: ['sos-ff-s1-diferensiasi-ketimpangan'], suggestedGrade: '12' }
  ),
  s(
    'sos-ff-s2-evaluasi-program-pemberdayaan', 'Sosiologi', 'SMA/MA', 'Fase F', 'Evaluasi Sosial Terapan',
    'Metode Evaluasi Dampak Program Pemberdayaan Komunitas dan Riset Aksi Sosial Akhir',
    'Peserta didik dapat menyusun kriteria evaluasi keberhasilan (relevansi, efektivitas, partisipasi, keberlanjutan) terhadap studi kasus program komunitas/CSR/desa binaan.',
    'Latih mengevaluasi mengapa program serupa berhasil di satu desa namun gagal di desa lain karena faktor partisipasi dan konteks budaya lokal.',
    'Mengintegrasikan metodologi riset sosial dan teori pemberdayaan dalam evaluasi program nyata.',
    ['Pemberdayaan komunitas & metode riset sosial'],
    ['Matriks evaluasi program mencakup indikator input–proses–output–keberlanjutan berdasarkan bukti lapangan'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['sos-ff-s2-pemberdayaan-komunitas'], relatedTopicIds: ['sos-ff-s2-pemberdayaan-komunitas'], suggestedGrade: '12' }
  ),

  // Sejarah (SMA/MA Fase E & Fase F; SMK Fase E & Fase F)
  s(
    'sej-fe-s1-konsep-berpikir-sejarah', 'Sejarah', 'SMA/MA', 'Fase E', 'Keterampilan Konsep Sejarah',
    'Konsep Diakronik, Sinkronik, Kausalitas, Keberlanjutan, dan Kritik Sumber (Heuristik–Historiografi)',
    'Peserta didik dapat membedakan sumber sejarah primer vs sekunder, menguji kredibilitas sumber (kritik ekstern–intern), serta menerapkan cara berpikir diakronik vs sinkronik.',
    'Contoh perbedaan narasi kronologis memanjang waktu (diakronik) dengan analisis mendalam satu kurun waktu tertentu (sinkronik).',
    'Menganalisis validitas kesaksian sejarah dan menyusun rekonstruksi kronologis berbasis sumber.',
    ['Kronologi sejarah dasar SMP'],
    ['Pemisahan sumber primer vs sekunder tepat; ciri diakronik vs sinkronik diterapkan benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s1-asal-usul-prasejarah', 'Sejarah', 'SMA/MA', 'Fase E', 'Peradaban Awal Nusantara',
    'Asal-Usul Nenek Moyang Nusantara, Budaya Praaksara (Paleolitikum–Logam), dan Kearifan Awal',
    'Peserta didik dapat melacak bukti migrasi awal Nusantara (Out of Africa/Taiwan–Melanesoid–Austronesia) serta jejak teknologi batu dan perunggu yang masih berlanjut pada tradisi Nusantara.',
    'Hubungkan peralatan bercocok tanam, gerabah, nekara perunggu, dan megalitikum dengan pola hidup menetap masyarakat awal.',
    'Menghubungkan bukti arkeologis praaksara dengan nilai gotong royong dan adaptasi maritim awal.',
    ['Keterampilan sumber sejarah'],
    ['Bukti zaman batu–logam dicocokkan tepat dengan corak hidup nomaden vs sedenter'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s1-hindu-buddha-nusantara', 'Sejarah', 'SMA/MA', 'Fase E', 'Kerajaan Maritim & Agraris',
    'Jalur Maritim Nusantara, Teori Masuknya Hindu–Buddha, serta Warisan Sriwijaya hingga Majapahit',
    'Peserta didik dapat mengevaluasi teori masuknya kebudayaan India (khususnya peran aktif masyarakat Nusantara/Arus Balik) dan membandingkan corak maritim Sriwijaya vs agraris-maritim Majapahit.',
    'Analisis prasasti Kedukan Bukit, candi, serta sinkretisme budaya lokal Nusantara dengan budaya India.',
    'Menganalisis peran aktif bangsa Indonesia dalam menyerap dan memperkaya budaya dunia lewat jalur maritim.',
    ['Peradaban awal & jalur rempah SMP'],
    ['Argumen kelemahan/kekuatan teori masuknya Hindu–Buddha didukung bukti prasasti/perdagangan'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s1-islamisasi-akulturasi', 'Sejarah', 'SMA/MA', 'Fase E', 'Kesultanan Islam Nusantara',
    'Jaringan Perdagangan Islamisasi Nusantara, Kesultanan Demak–Aceh–Gowa Tallo–Ternate, dan Akulturasi',
    'Peserta didik dapat menganalisis peran jalur perdagangan, perkawinan, tasawuf, dan seni budaya damai (wayang, menara masjid, aksara Pegon) dalam penyebaran Islam Nusantara.',
    'Soroti jaringan pelabuhan niaga pesisir dan persatuan budaya lokal–Islam sebelum monopoli VOC.',
    'Menelaah proses islamisasi damai yang memperkokoh jejaring niaga dan toleransi budaya Nusantara.',
    ['Kerajaan maritim Hindu–Buddha'],
    ['Identifikasi saluran islamisasi damai disertai bukti peninggalan akulturasi fisik/naskah'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['sej-fe-s1-hindu-buddha-nusantara'], relatedTopicIds: ['sej-fe-s1-hindu-buddha-nusantara'], suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s2-kolonialisme-perlawanan-daerah', 'Sejarah', 'SMA/MA', 'Fase E', 'Era Kolonialisme',
    'Monopoli Rempah VOC, Sistem Tanam Paksa–Ekonomi Liberal, dan Perlawanan Kedaerahan (1600–1900)',
    'Peserta didik dapat mengevaluasi dampak sosial-ekonomi eksploitasi kolonial terhadap petani/bangsawan Nusantara serta menganalisis sebab keberhasilan maupun kegagalan perang daerah.',
    'Bandingkan perlawanan Sultan Agung, Sultan Hasanuddin, Pattimura, Imam Bonjol, hingga Perang Diponegoro dan Aceh.',
    'Menganalisis mekanisme penaklukan politik devide et impera serta keberanian perlawanan daerah.',
    ['Kesultanan niaga Sem 1'],
    ['Kaitan monopoli ekonomi kolonial dengan kesengsaraan rakyat serta evaluasi faktor kekalahan perang daerah jelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['sej-fe-s1-islamisasi-akulturasi'], relatedTopicIds: ['sej-fe-s1-islamisasi-akulturasi'], suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s2-pergerakan-nasional', 'Sejarah', 'SMA/MA', 'Fase E', 'Kebangkitan Nasional',
    'Politik Etis, Lahirnya Organisasi Modern, Sumpah Pemuda 1928, dan Pendudukan Jepang',
    'Peserta didik dapat melacak kesadaran kolektif lintas etnis–agama menuju Sumpah Pemuda 1928 serta menilai sisi mobilisasi dan penderitaan rakyat pada masa pendudukan Jepang.',
    'Contrast organisasi kooperatif vs non-kooperatif serta kontribusi pers nasional dan kongres perempuan/pemuda.',
    'Memahami transformasi perjuangan bangsa menjadi gerakan politik modern bervisi Indonesia merdeka.',
    ['Dampak kolonialisme & Politik Etis Sem 2'],
    ['Garis waktu organisasi pergerakan dan makna integratif Sumpah Pemuda 1928 diuraikan akurat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['sej-fe-s2-kolonialisme-perlawanan-daerah'], relatedTopicIds: ['sej-fe-s2-kolonialisme-perlawanan-daerah'], suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s2-proklamasi-revolusi', 'Sejarah', 'SMA/MA', 'Fase E', 'Proklamasi & Revolusi Fisik',
    'Peristiwa Rengasdengklok, Proklamasi 17 Agustus 1945, dan Sinergi Perjuangan Fisik–Diplomasi (1945–1949)',
    'Peserta didik dapat mengevaluasi peran golongan muda–tua menuju Proklamasi serta membuktikan bagaimana pertempuran heroik rakyat dan perjanjian diplomasi saling melengkapi.',
    'Hubungkan Pertempuran Surabaya/Ambarawa/Bandung dengan tekanan opini dunia pada Linggarjati, Renville, Roem-Royen, dan KMB.',
    'Menganalisis kelahiran negara kesatuan Indonesia dan strategi mempertahankan kedaulatan.',
    ['Pergerakan nasional & Jepang'],
    ['Keterkaitan perjuangan bersenjata dengan pengakuan internasional pasca-KMB dijelaskan utuh'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['sej-fe-s2-pergerakan-nasional'], relatedTopicIds: ['sej-fe-s2-pergerakan-nasional'], suggestedGrade: '10' }
  ),
  s(
    'sej-fe-s2-penelitian-sejarah-lokal', 'Sejarah', 'SMA/MA', 'Fase E', 'Historiografi Lokal',
    'Proyek Penulisan Sejarah Lokal / Sejarah Lisan Keluarga atau Lingkungan Sekitar Sekolah',
    'Peserta didik dapat menerapkan 4 tahap metode sejarah (heuristik, kritik sumber, interpretasi, historiografi) untuk menyusun kisah sejarah bangunan bersejarah atau tokoh setempat.',
    'Dorong wawancara saksi sejarah/arsip foto keluarga atau situs cagar budaya kota agar siswa mengalami kerja sejarawan.',
    'Mengintegrasikan keterampilan kritik sumber sejarah pada penulisan kisah sejarah lokal autentik.',
    ['Konsep & metode sejarah Sem 1'],
    ['Tulisan sejarah lokal mencantumkan sumber primer/wawancara beserta catatan hasil verifikasi fakta'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['sej-fe-s1-konsep-berpikir-sejarah'], relatedTopicIds: ['sej-fe-s1-konsep-berpikir-sejarah'], suggestedGrade: '10' }
  ),
  // Sejarah Fase F
  s(
    'sej-ff-s1-demokrasi-liberal-terpimpin', 'Sejarah', 'SMA/MA', 'Fase F', 'Dinamika Republik (1950–1965)',
    'Kritik Arsip Sumber Primer–Sekunder Proklamasi 1945 hingga Demokrasi Liberal–Terpimpin (1950–1965)',
    'Peserta didik dapat mengevaluasi sumber primer dan sumber sekunder sejarah kemerdekaan serta menganalisis dinamika kabinet parlementer, Pemilu 1955, KAA, hingga Demokrasi Terpimpin.',
    'Evaluasi arsip sezaman proklamasi/konstitusi dibanding memoar sekunder, sekaligus pencapaian diplomasi KAA/Deklarasi Djuanda 1957 dan tantangan kabinet.',
    'Menelaah keabsahan arsip primer–sekunder sejarah modern Indonesia dan konsolidasi republik awal.',
    ['Proklamasi & revolusi 1945–1949 Fase E'],
    ['Pemisahan arsip sumber primer vs sekunder tepat serta perbandingan parlementer vs terpimpin berimbang'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'sej-ff-s1-pergolakan-integrasi-1948-1965', 'Sejarah', 'SMA/MA', 'Fase F', 'Ketahanan Nasional & Integrasi',
    'Pergolakan Ideologi & Kedaerahan (1948–1965) serta Pembelajaran Pentingnya Persatuan NKRI',
    'Peserta didik dapat membedakan latar belakang konflik kepentingan/ideologi (PKI Madiun, DI/TII, APRA, RMS, PRRI/Permesta, G30S) tanpa menyederhanakan konteks sejarahnya.',
    'Fokus pada pelajaran kenegaraan mengenai komunikasi pusat–daerah, supremasi konstitusi, dan pencegahan kekerasan politik.',
    'Menganalisis faktor pemicu ancaman disintegrasi bangsa dan peran tokoh penjaga integrasi.',
    ['Demokrasi awal RI'],
    ['Pemetaan akar pemicu tiap pergolakan (ideologi, ketidakpuasan otonomi, vested interest) tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  s(
    'sej-ff-s1-orde-baru-ekonomi-politik', 'Sejarah', 'SMA/MA', 'Fase F', 'Orde Baru (1966–1998)',
    'Kebijakan Pembangunan Ekonomi (Pelita–Swasembada Beras) vs Keterbatasan Kebebasan Politik Orde Baru',
    'Peserta didik dapat mengevaluasi secara multiperspektif keberhasilan pembangunan infrastruktur, kesehatan, dan pangan di satu sisi serta sentralisasi politik dan krisis moneter 1997/1998 di sisi lain.',
    'Dorong pembacaan sumber berimbang yang membedakan pencapaian pertumbuhan GDP/keluarga berencana dari krisis KKN dan utang.',
    'Menilai periode Orde Baru secara kritis berdasar bukti data ekonomi dan dinamika hak sipil.',
    ['Dinamika 1950–1965'],
    ['Evaluasi dua sisi Orde Baru menyertakan bukti data ekonomi serta faktor pemicu krisis 1997–1998'],
    '1 (Ganjil)', 'pendalaman', { prasyaratTopicIds: ['sej-ff-s1-demokrasi-liberal-terpimpin'], relatedTopicIds: ['sej-ff-s1-demokrasi-liberal-terpimpin'], suggestedGrade: '11' }
  ),
  s(
    'sej-ff-s1-reformasi-1998-demokrasi', 'Sejarah', 'SMA/MA', 'Fase F', 'Era Reformasi (1998–Kini)',
    'Gerakan Reformasi 1998, Amendemen UUD NRI 1945, Otonomi Daerah, dan Tantangan Demokrasi Modern',
    'Peserta didik dapat menganalisis enam agenda Reformasi 1998, perubahan ketatanegaraan pasca-amendemen (pemilihan langsung, kebebasan pers, MK, KPK), dan tantangan demokrasi digital.',
    'Hubungkan tuntutan reformasi 1998 dengan tanggung jawab generasi muda menjaga partisipasi pemilu bersih dan literasi anti-hoaks.',
    'Menganalisis transformasi institusional Reformasi 1998 dan agenda perbaikan tata kelola yang masih berjalan.',
    ['Orde Baru & krisis 1998'],
    ['Keterkaitan agenda Reformasi dengan amendemen konstitusi dan lembaga baru negara dijelaskan tepat'],
    '1 (Ganjil)', 'integrasi', { prasyaratTopicIds: ['sej-ff-s1-orde-baru-ekonomi-politik'], relatedTopicIds: ['sej-ff-s1-orde-baru-ekonomi-politik'], suggestedGrade: '12' }
  ),
  s(
    'sej-ff-s2-revolusi-dunia-nasionalisme-asia', 'Sejarah', 'SMA/MA', 'Fase F', 'Sejarah Global & Interkoneksi',
    'Revolusi Besar Dunia, Perang Dunia I–II, dan Inspirasi Kebangkitan Nasionalisme Asia–Afrika',
    'Peserta didik dapat menganalisis bagaimana gagasan kebebasan dari Revolusi Prancis–Amerika serta dinamika Perang Dunia memicu kebangkitan nasionalisme di Asia–Afrika.',
    'Tunjukkan benang merah antara pergerakan kemerdekaan Indonesia dengan gelombang dekolonisasi pasca-Perang Dunia II.',
    'Menghubungkan peristiwa sejarah global dengan perkembangan pemikiran kemerdekaan bangsa-bangsa Asia–Afrika.',
    ['Pergerakan nasional Fase E'],
    ['Hubungan kausal perang global dengan melemahnya cengkeraman kolonial di Asia–Afrika jelas'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  s(
    'sej-ff-s2-perang-dingin-nonblok', 'Sejarah', 'SMA/MA', 'Fase F', 'Geopolitik Abad ke-20',
    'Perang Dingin Blok Barat–Timur, Lahirnya Gerakan Non-Blok (GNB), dan Politik Luar Negeri Bebas Aktif',
    'Peserta didik dapat menjelaskan ketegangan ideologis Perang Dingin (NATO vs Pakta Warsawa, Krisis Kuba/Vietnam) serta peran sentral Indonesia memprakarsai KAA 1955 dan GNB.',
    'Evaluasi prinsip Politik Luar Negeri Bebas Aktif sebagai sikap berdaulat di tengah rivalitas kekuatan besar global hingga kini.',
    'Menganalisis posisi strategis diplomasi Indonesia dari era Perang Dingin ke multipolaritas global.',
    ['Demokrasi awal & revolusi dunia'],
    ['Peran Dasa Sila Bandung/GNB terhadap kemerdekaan negara terjajah dianalisis berbasis fakta'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12' }
  ),
  s(
    'sej-ff-s2-peran-indonesia-dunia', 'Sejarah', 'SMA/MA', 'Fase F', 'Diplomasi & Kontribusi Global',
    'Kontribusi Indonesia dalam ASEAN, Misi Perdamaian PBB (Garuda), dan Sejarah Perkembangan IPTEK Global',
    'Peserta didik dapat mengevaluasi kiprah nyata Kontingen Garuda PBB, pendirian ASEAN, serta dampak revolusi informasi/bioteknologi abad 20–21 terhadap masyarakat Indonesia.',
    'Gabungkan kontribusi diplomasi perdamaian dunia dengan kesadaran kesiapan SDM menghadapi revolusi industri digital.',
    'Mengapresiasi rekam jejak perdamaian Indonesia serta merefleksikan transformasi teknologi informasi modern.',
    ['Perang Dingin & Reformasi'],
    ['Rekam jejak misi Garuda/ASEAN dan analisis dampak sosial-etis perkembangan IPTEK akurat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  s(
    'sej-ff-s2-historiografi-isu-kontemporer', 'Sejarah', 'SMA/MA', 'Fase F', 'Keterampilan Historiografi Kritis',
    'Kritik Sumber Sejarah Lintas Perspektif & Evaluasi Narasi Sejarah Kontemporer di Era Digital',
    'Peserta didik dapat membandingkan dua sumber/penafsiran sejarah berbeda atas peristiwa kontemporer guna mendeteksi bias narasi dan menyusun esai historiografis berimbang.',
    'Praktikkan uji silang arsip berita sezaman dengan buku memoar atau kesaksian lisan untuk menulis narasi sejarah yang bertanggung jawab.',
    'Mengintegrasikan kemampuan berpikir sejarah kritis untuk menghadapi disinformasi sejarah di media sosial.',
    ['Konsep berpikir sejarah & seluruh materi Fase F'],
    ['Esai pembanding sumber mengidentifikasi perbedaan sudut pandang beserta verifikasi bukti arsipnya'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),

  // =====================================================================
  // 6. PENDIDIKAN PANCASILA (Fase A, B, C, D, E, F)
  // =====================================================================
  s(
    'ppkn-fa-s1-simbol-keluarga', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'Pancasila',
    'Mengenal Lima Simbol Pancasila dalam Lambang Garuda Pancasila dan Sikap Rukun di Rumah',
    'Peserta didik dapat menyebutkan simbol kelima sila Pancasila serta menceritakan contoh perilaku rukun, berbagi, dan menghormati anggota keluarga.',
    'Hubungkan bintang, rantai, pohon beringin, kepala banteng, dan padi-kapas dengan tindakan baik nyata di kelas dan rumah.',
    'Mengenali lambang negara dan mempraktikkan sikap kasih sayang serta tertib di lingkungan keluarga.',
    ['Mengenal anggota keluarga dan lingkungan rumah'],
    ['Mencocokkan 5 simbol dan bunyi sila secara tepat disertai contoh sikap sehari-hari'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  s(
    'ppkn-fa-s1-aturan-rumah-sekolah', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'UUD NRI Tahun 1945',
    'Mengenal Aturan Sederhana di Rumah dan Sekolah serta Tanggung Jawab Mematuhinya',
    'Peserta didik dapat menyebutkan contoh aturan harian (antre, merapikan mainan, tepat waktu) serta akibat positif jika aturan ditaati bersama.',
    'Gunakan gambar situasi antre vs berebut untuk membandingkan manfaat menaati aturan bersama.',
    'Menunjukkan perilaku patuh terhadap tata tertib sederhana sebagai bentuk tanggung jawab.',
    ['Interaksi bermain dengan teman'],
    ['Membedakan perilaku mematuhi aturan vs melanggar aturan lengkap dengan alasannya'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  s(
    'ppkn-fa-s2-identitas-bhinneka-kelas', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'Bhinneka Tunggal Ika',
    'Mengenal Keragaman Nama, Ciri Fisik, Kegemaran, dan Kebiasaan Baik Teman Sekelas',
    'Peserta didik dapat menceritakan perbedaan kegemaran/budaya sederhana di antara teman sekelas dan menunjukkan sikap tidak mengejek perbedaan.',
    'Latih wawancara kecil tentang makanan atau permainan kesukaan teman dan pentingnya menghargai perbedaan.',
    'Menghargai keunikan identitas diri dan teman dalam pergaulan sehari-hari tanpa membeda-bedakan.',
    ['Sikap rukun Sem 1'],
    ['Menjelaskan minimal 2 contoh sikap menghormati perbedaan kesukaan teman di kelas'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['ppkn-fa-s1-simbol-keluarga'], relatedTopicIds: ['ppkn-fa-s1-simbol-keluarga'], suggestedGrade: '2' }
  ),
  s(
    'ppkn-fa-s2-gotongroyong-nkri', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'Negara Kesatuan Republik Indonesia',
    'Bekerja Sama dan Gotong Royong Membersihkan Lingkungan Rumah dan Ruang Kelas (NKRI)',
    'Peserta didik dapat mengenali lingkungan rumah/sekolah sebagai bagian ruang hidup bersama serta mempraktikkan pembagian tugas gotong royong piket kelas.',
    'Gunakan simulasi piket kelas bersama agar siswa mengalami manfaat kerja sama dibanding bekerja sendiri.',
    'Mempraktikkan kebiasaan tolong-menolong menjaga kebersihan dan ketertiban lingkungan bersama.',
    ['Aturan sekolah Sem 1'],
    ['Melaksanakan bagian tugas kelompok piket sampai selesai dan menghargai kerja teman'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ppkn-fa-s1-aturan-rumah-sekolah'], relatedTopicIds: ['ppkn-fa-s1-aturan-rumah-sekolah'], suggestedGrade: '2' }
  ),
  // Fase B (Kelas 3-4)
  s(
    'ppkn-fb-s1-makna-sila-musyawarah', 'Pendidikan Pancasila', 'SD/MI', 'Fase B', 'Pancasila',
    'Makna Setiap Sila Pancasila dan Praktik Musyawarah Mencapai Mufakat di Kelas',
    'Peserta didik dapat menjelaskan makna nilai gotong royong, kemanusiaan, dan musyawarah mufakat dalam pemilihan ketua kelas atau jadwal kegiatan bersama.',
    'Latih simulasi musyawarah kelas untuk memilih permainan atau program kebersihan hingga menyepakati keputusan bersama.',
    'Menerapkan nilai-nilai sila Pancasila dan sikap menerima hasil musyawarah secara lapang dada.',
    ['Simbol Pancasila Fase A'],
    ['Menunjukkan sikap mendengarkan pendapat mayoritas/minoritas dalam simulasi musyawarah kelas'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4' }
  ),
  s(
    'ppkn-fb-s1-hak-kewajiban-anak', 'Pendidikan Pancasila', 'SD/MI', 'Fase B', 'UUD NRI Tahun 1945',
    'Keseimbangan Hak dan Kewajiban Peserta Didik di Rumah, Sekolah, dan Lingkungan Sekitar',
    'Peserta didik dapat membedakan antara hak dan kewajiban anak (belajar, lingkungan bersih, kasih sayang vs kewajiban belajar, menjaga fasilitas) dan mengapa kewajiban dijalankan seimbang.',
    'Gunakan studi kasus fasilitas toilet/taman kelas bersih hanya terwujud bila siswa menjalankan kewajiban menjaga kebersihan terlebih dahulu.',
    'Menjalankan kewajiban secara seimbang sebelum menuntut pemenuhan hak pribadi.',
    ['Aturan rumah dan sekolah Fase A'],
    ['Mampu memasangkan 4 hak murid dengan kewajiban penyeimbangnya secara logis'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '4' }
  ),
  s(
    'ppkn-fb-s2-identitas-budaya-provinsi', 'Pendidikan Pancasila', 'SD/MI', 'Fase B', 'Bhinneka Tunggal Ika',
    'Mengidentifikasi Keragaman Suku, Bahasa Daerah, Makanan & Rumah Adat Indonesia sebagai Kekayaan',
    'Peserta didik dapat mengenal identitas budaya lokal daerahnya dan daerah lain di Indonesia serta mempraktikkan rasa bangga dan saling menghormati antarbudaya.',
    'Pameran mini budaya Nusantara atau kartu pengenal pakaian/lagu daerah guna menumbuhkan rasa ingin tahu positif.',
    'Mengidentifikasi kekayaan budaya Nusantara dan menolak sikap merendahkan budaya lain.',
    ['Keragaman teman sekelas Fase A'],
    ['Menyebutkan identitas budaya daerah asal dengan bangga sekaligus contoh budaya provinsi lain'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4' }
  ),
  s(
    'ppkn-fb-s2-wilayah-nkri-gotongroyong', 'Pendidikan Pancasila', 'SD/MI', 'Fase B', 'Negara Kesatuan Republik Indonesia',
    'Struktur Pemerintahan Desa/Kelurahan/Kecamatan dan Praktik Kerja Bakti Menjaga Persatuan NKRI',
    'Peserta didik dapat mengenali lingkungan tempat tinggalnya dalam struktur administratif desa/kelurahan–kecamatan serta merancang kegiatan gotong royong sederhana di lingkungan sekolah.',
    'Kaitkan peran ketua RT/RW hingga lurah/kepala desa dengan pelayanan masyarakat dan kerukunan antarwarga.',
    'Memahami tata kelola wilayah terdekat NKRI dan berkontribusi dalam kebersamaan warga sekolah.',
    ['Gotong royong kelas Fase A'],
    ['Bagan lingkungan desa/kelurahan teridentifikasi tepat; rencana kerja bakti kelompok berjalan lancar'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-fb-s1-hak-kewajiban-anak'], relatedTopicIds: ['ppkn-fb-s1-hak-kewajiban-anak'], suggestedGrade: '4' }
  ),
  // Fase C (Kelas 5-6)
  s(
    'ppkn-fc-s1-sejarah-perumusan-pancasila', 'Pendidikan Pancasila', 'SD/MI', 'Fase C', 'Pancasila',
    'Kronologi Perumusan Pancasila (BPUPKI–PPKI) dan Keteladanan Sikap Kompromi Pendiri Bangsa',
    'Peserta didik dapat menelusuri usulan dasar negara oleh tokoh bangsa hingga pengesahan 18 Agustus 1945 serta meneladani semangat persatuan dan kesediaan bermusyawarah para pendiri bangsa.',
    'Soroti pengorbanan kepentingan golongan demi keutuhan seluruh wilayah Indonesia pada perumusan sila pertama.',
    'Menghayati nilai persatuan dan musyawarah dari proses sejarah lahirnya Pancasila.',
    ['Makna sila Pancasila Fase B'],
    ['Urutan peristiwa sidang BPUPKI–PPKI tepat dan keteladanan sikap tokoh dirumuskan jelas'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5' }
  ),
  s(
    'ppkn-fc-s1-norma-hukum-konstitusi', 'Pendidikan Pancasila', 'SD/MI', 'Fase C', 'UUD NRI Tahun 1945',
    'Mengidentifikasi Norma Agama, Kesusilaan, Kesopanan, dan Hukum dalam Kehidupan Berbangsa',
    'Peserta didik dapat membedakan sanksi serta fungsi empat jenis norma masyarakat dan menyusun kesepakatan tata tertib kelas secara demokratis.',
    'Bandingkan pelanggaran sopan santun dengan pelanggaran lalu lintas berhukum negara menggunakan kasus anak sehari-hari.',
    'Menaati ragam norma dan memahami pentingnya kesepakatan tertulis yang disusun bersama.',
    ['Hak & kewajiban Fase B'],
    ['Studi kasus pelanggaran norma terklasifikasi akurat antara sanksi moral vs sanksi hukum'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6' }
  ),
  s(
    'ppkn-fc-s2-provinsi-pelestarian-budaya', 'Pendidikan Pancasila', 'SD/MI', 'Fase C', 'Bhinneka Tunggal Ika',
    'Keragaman Budaya Nasional Indonesia dan Strategi Melestarikan Tradisi Lokal di Kalangan Pelajar',
    'Peserta didik dapat menganalisis ancaman pudarnya bahasa/kesenian daerah dan merancang cara kreatif melestarikannya (mis. melalui karya poster atau pentas mini kelas).',
    'Bedakan sikap toleran aktif menghormati budaya lain dari sikap eksklusif daerah berlebihan.',
    'Mengembangkan aksi nyata pelestarian budaya Nusantara tanpa menutup diri dari keberagaman.',
    ['Identitas budaya daerah Fase B'],
    ['Rancangan aksi pelestarian tradisi daerah realistis dan menghormati budaya saudara sebangsa'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '6' }
  ),
  s(
    'ppkn-fc-s2-otonomi-provinsi-bela-negara', 'Pendidikan Pancasila', 'SD/MI', 'Fase C', 'Negara Kesatuan Republik Indonesia',
    'Mengenal Karakteristik Provinsi di Indonesia dan Wujud Sikap Bela Negara dalam Keseharian Pelajar',
    'Peserta didik dapat mengidentifikasi keunikan geografis–kultural berbagai provinsi dalam bingkai NKRI serta mempraktikkan wujud bela negara tingkat pelajar (disiplin belajar, anti-bullying, hemat sumber daya).',
    'Tekankan bahwa menjaga keutuhan NKRI dimulai dari rasa saling peduli antarprovinsi saat bencana dan menjaga iklim kelas bebas perundungan.',
    'Menghubungkan keragaman wilayah provinsi dengan persaudaraan kebangsaan NKRI.',
    ['Struktur pemerintahan desa/kecamatan Fase B'],
    ['Memetakan keunikan provinsi pilihan dan memberikan 3 aksi nyata persatuan/bela negara siswa'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-fc-s1-sejarah-perumusan-pancasila'], relatedTopicIds: ['ppkn-fc-s1-sejarah-perumusan-pancasila'], suggestedGrade: '6' }
  ),
  // Fase D (SMP)
  s(
    'ppkn-fd-s1-pancasila-pandangan-hidup', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'Pancasila',
    'Kedudukan Pancasila sebagai Dasar Negara & Pandangan Hidup Bangsa serta Pengamalannya di Masyarakat',
    'Peserta didik dapat membedakan fungsi Pancasila sebagai dasar negara (sumber hukum tertinggi) dan pandangan hidup (pedoman etika keseharian) serta menerapkannya pada penyelesaian kasus sekolah.',
    'Gunakan studi kasus etika bermedia sosial, gotong royong, dan keputusan adil pengurus OSIS berbasis kelima sila.',
    'Mengaitkan kedudukan filosofis Pancasila dengan praktik bernegara dan etika harian pelajar.',
    ['Sejarah perumusan Pancasila SD'],
    ['Perbedaan dasar negara vs pandangan hidup tepat dan analisis kasus penerapan 5 sila konsisten'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  s(
    'ppkn-fd-s1-uud1945-lembaga-hukum', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'UUD NRI Tahun 1945',
    'Kedudukan UUD NRI Tahun 1945, Tata Urutan Peraturan Perundang-undangan, dan Taat Hukum',
    'Peserta didik dapat menganalisis hierarki peraturan perundang-undangan (UU No. 12/2011) dan menjelaskan mekanisme perlindungan hak warga serta pentingnya budaya taat hukum sejak dini.',
    'Perkenalkan prinsip lex superior derogat legi inferiori (aturan daerah tidak boleh bertentangan dengan UUD 1945/UU di atasnya).',
    'Memahami supremasi konstitusi dan menaati hukum berbasis kesadaran hak serta kewajiban warga.',
    ['Empat jenis norma SD'],
    ['Urutan hierarki UUD 1945 hingga Perda disusun tepat beserta contoh pelanggaran hukum dan solusinya'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'ppkn-fd-s2-kebhinekaan-anti-intoleransi', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'Bhinneka Tunggal Ika',
    'Menjaga Kebhinekaan Suku, Agama, Ras, Antargolongan (SARA) dan Pencegahan Ujaran Kebencian',
    'Peserta didik dapat menganalisis penyebab prasangka antarkelompok dan merancang respons bijak guna mencegah ujaran kebencian serta stereotip di lingkungan remaja.',
    'Simulasikan verifikasi pesan berantai provokatif di media sosial dan pentingnya dialog empati lintas komunitas.',
    'Menangkal intoleransi serta merawat solidaritas kebangsaan dalam masyarakat majemuk.',
    ['Pelestarian budaya SD'],
    ['Strategi penanganan kasus intoleransi remaja berlandaskan penghormatan martabat manusia dan hukum'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-fd-s1-pancasila-pandangan-hidup'], relatedTopicIds: ['ppkn-fd-s1-pancasila-pandangan-hidup'], suggestedGrade: '8' }
  ),
  s(
    'ppkn-fd-s2-nkri-wawasan-nusantara', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'Negara Kesatuan Republik Indonesia',
    'Kedaulatan Wilayah NKRI, Wawasan Nusantara, Sumpah Pemuda, dan Partisipasi Warga Negara',
    'Peserta didik dapat menjelaskan makna Wawasan Nusantara sebagai satu kesatuan politik, ekonomi, sosial-budaya, dan pertahanan serta merencanakan aksi bakti masyarakat sekolah.',
    'Kaitkan Deklarasi Djuanda 1957 (negara kepulauan yang lautnya menyatukan pulau) dengan semangat bela negara non-militer.',
    'Menginternalisasi kesadaran geopolitik keutuhan wilayah Indonesia dan tanggung jawab warga negara aktif.',
    ['Karakteristik provinsi & UUD 1945'],
    ['Penjelasan makna satu kesatuan Wawasan Nusantara jelas beserta proyek partisipasi pelajar nyata'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['ppkn-fd-s1-uud1945-lembaga-hukum'], relatedTopicIds: ['ppkn-fd-s1-uud1945-lembaga-hukum'], suggestedGrade: '9' }
  ),
  // Fase E (Kelas 10 SMA/SMK)
  s(
    'ppkn-fe-s1-pancasila-ideologi-terbuka', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'Pancasila',
    'Pancasila sebagai Ideologi Terbuka, Dimensi Idealis–Normatif–Realistis, dan Tantangan Era Global',
    'Peserta didik dapat membedakan ideologi terbuka vs ideologi tertutup dan menguji bagaimana nilai Pancasila menjawab tantangan perkembangan teknologi AI dan krisis lingkungan tanpa kehilangan jati diri.',
    'Fokus pada ciri nilai dasar tetap, nilai instrumental luwes mengikuti hukum zaman, dan nilai praksis nyata.',
    'Menganalisis daya tahan ideologi Pancasila menghadapi tantangan kontemporer tanpa bersikap dogmatis sempit.',
    ['Pancasila dasar & pandangan hidup SMP'],
    ['Analisis membedakan nilai dasar/instrumental/praksis pada kasus kebijakan kontemporer secara tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'ppkn-fe-s1-konstitusi-hak-warga', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'UUD NRI Tahun 1945',
    'Hak & Kewajiban Konstitusional Warga Negara dalam UUD 1945 serta Mekanisme Uji Materi MK',
    'Peserta didik dapat mengidentifikasi jaminan hak asasi dan kewajiban warga pada Pasal 27–34 UUD NRI 1945 serta mengevaluasi studi kasus keseimbangan kebebasan berpendapat dengan hak orang lain.',
    'Diskusikan mekanisme pengajuan judicial review ke Mahkamah Konstitusi apabila suatu UU dianggap bertentangan dengan UUD.',
    'Menganalisis perlindungan hak konstitusional sekaligus batasan tanggung jawab demokratis warga.',
    ['Hierarki perundang-undangan SMP'],
    ['Pemetaan pasal UUD 1945 relevan tepat dan argumen keseimbangan kebebasan–ketertiban logis'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '10' }
  ),
  s(
    'ppkn-fe-s2-harmoni-kolaborasi-budaya', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'Bhinneka Tunggal Ika',
    'Asal-Usul Identitas Sosial, Kolaborasi Budaya Nusantara, dan Pencegahan Diskriminasi Kelompok Rentan',
    'Peserta didik dapat membedakan identitas alami vs identitas bentukan sosial dan merancang model kolaborasi antarkomunitas untuk menciptakan ruang publik inklusif bagi penyandang disabilitas dan minoritas.',
    'Latih analisis empatik penghapusan stigma sosial agar keadilan sosial sila kelima terwujud di ruang sekolah maupun masyarakat.',
    'Mengembangkan kepekaan multikultural berkeadilan dan mencegah eksklusi kelompok rentan.',
    ['Kebhinekaan anti-intoleransi SMP'],
    ['Proyek usulan ruang inklusif mengidentifikasi hambatan diskriminatif dan solusinya secara konkret'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ppkn-fe-s1-pancasila-ideologi-terbuka'], relatedTopicIds: ['ppkn-fe-s1-pancasila-ideologi-terbuka'], suggestedGrade: '10' }
  ),
  s(
    'ppkn-fe-s2-pertahanan-sishankamrata', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'Negara Kesatuan Republik Indonesia',
    'Batas Wilayah NKRI, Ancaman Militer–Nonmiliter (Siber/Hoaks), dan Peran Warga dalam Sishankamrata',
    'Peserta didik dapat menganalisis ancaman nonmiliter abad 21 (disinformasi digital, narkoba, kejahatan siber) serta merumuskan kontribusi pelajar dalam menjaga ketahanan nasional.',
    'Bedakan peran komponen utama (TNI) dalam pertahanan dengan warga sipil dalam ketahanan ideologi, pangan, dan keamanan siber.',
    'Mengidentifikasi tantangan kedaulatan modern (termasuk ruang siber dan maritim) beserta peran sipil pelajar.',
    ['Wawasan Nusantara SMP'],
    ['Klasifikasi ancaman siber/nonmiliter tepat beserta langkah ketahanan literasi pelajar'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['ppkn-fe-s1-konstitusi-hak-warga'], relatedTopicIds: ['ppkn-fe-s1-konstitusi-hak-warga'], suggestedGrade: '10' }
  ),
  // Fase F (Kelas 11-12 SMA/SMK)
  s(
    'ppkn-ff-s1-demokrasi-keadilan-sosial', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'Pancasila & Demokrasi',
    'Penerapan Demokrasi Pancasila, Etika Pemerintahan Bersih, dan Kritik Terhadap Penyalahgunaan Wewenang',
    'Peserta didik dapat mengevaluasi kualitas praktik demokrasi prosedural vs substansial di Indonesia (pemilu jujur-adil, transparansi anggaran publik, pemberantasan korupsi).',
    'Fokus pada peran pengawasan masyarakat sipil, pers merdeka, dan budaya integritas anti-korupsi bagi generasi muda.',
    'Menilai kesenjangan antara idealita Pancasila–UUD dengan praktik tata kelola pemerintahan dan merumuskan solusi partisipatif.',
    ['Ideologi terbuka & UUD 1945 Fase E'],
    ['Analisis studi kasus korupsi/demokrasi memuat mekanisme pencegahan kelembagaan dan integritas individu'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  s(
    'ppkn-ff-s1-kasus-ham-penegakan', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'UUD NRI Tahun 1945 & Hukum',
    'Perlindungan Hak Asasi Manusia (HAM), Independensi Peradilan, dan Penegakan Hukum Berkeadilan',
    'Peserta didik dapat menganalisis upaya pencegahan dan penanganan kasus pelanggaran hak warga melalui sistem peradilan Indonesia serta peran lembaga perlindungan hukum dan Komnas HAM.',
    'Bedakan pelanggaran hak oleh aparatur vs oleh warga dan jalur hukum advokasi damai yang sah secara konstitusi.',
    'Mengevaluasi efektivitas instrumen penegakan HAM dan prinsip persamaan kedudukan di hadapan hukum.',
    ['Hak konstitusional warga Fase E'],
    ['Identifikasi instrumen hukum serta perbedaan kewenangan lembaga peradilan tepat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  s(
    'ppkn-ff-s2-otonomi-daerah-hubungan-pusat', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'Negara Kesatuan Republik Indonesia',
    'Desentralisasi, Kewenangan Otonomi Daerah dalam NKRI, dan Akuntabilitas Pelayanan Publik Lokal',
    'Peserta didik dapat membedakan urusan pemerintah pusat absolut (politik luar negeri, pertahanan, moneter, yustisi, agama) dari urusan otonomi daerah dan mengaudit kualitas layanan publik setempat.',
    'Ajak meninjau layanan publik daerah (pendidikan, kesehatan, perizinan/transportasi) dari perspektif hak pembayar pajak dan pengawasan DPRD/warga.',
    'Memahami tata kelola otonomi daerah yang memperkuat persatuan NKRI dan pelayanan warga.',
    ['Wawasan wilayah NKRI & hukum konstitusi'],
    ['Pemisahan kewenangan pusat vs daerah tepat disertai usulan perbaikan pelayanan publik daerah'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ppkn-ff-s1-demokrasi-keadilan-sosial'], relatedTopicIds: ['ppkn-ff-s1-demokrasi-keadilan-sosial'], suggestedGrade: '12' }
  ),
  s(
    'ppkn-ff-s2-diplomasi-global-iptek', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'NKRI & Masyarakat Global',
    'Pengaruh Kemajuan IPTEK, Diplomasi Perdamaian Indonesia, dan Etika Warga Negara Global Berkarakter Pancasila',
    'Peserta didik dapat merumuskan sikap selektif memanfaatkan kemajuan AI/teknologi lintas negara berdasarkan etika Pancasila sekaligus mengevaluasi peran aktif Indonesia pada tata dunia damai.',
    'Padukan tanggung jawab lokal sebagai warga Indonesia (cinta produk/hukum nasional) dengan kepedulian isu kemanusiaan dan iklim global.',
    'Mengintegrasikan nilai Pancasila dalam kiprah kewargaan digital dan solidaritas antarbangsa.',
    ['Ideologi Pancasila, HAM & Sishankamrata'],
    ['Esai kebijakan/proyek warga menampilkan sikap etis berteknologi dan kepekaan terhadap tantangan global'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['ppkn-ff-s1-kasus-ham-penegakan'], relatedTopicIds: ['ppkn-ff-s1-kasus-ham-penegakan'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // 7. INFORMATIKA (SMP Fase D vs SMA/SMK Fase E vs Fase F) & PKK (SMK Fase F)
  // =====================================================================
  s(
    'inf-fd-s1-dekomposisi-algoritma', 'Informatika', 'SMP/MTs', 'Fase D', 'Berpikir Komputasional (BK)',
    'Dekomposisi, Pengenalan Pola, Abstraksi, dan Algoritma Representasi Data Biner/Himpunan',
    'Peserta didik dapat memecah masalah penjadwalan atau pencarian rute sederhana memakai dekomposisi serta membaca sandi biner/desimal dan operasi himpunan dasar.',
    'Gunakan aktivitas unplugged kartu biner 0/1, tabel penjadwalan optimal, dan pseudocode percabangan sederhana.',
    'Menyelesaikan persoalan logika dan optimasi sehari-hari menggunakan 4 pilar berpikir komputasional.',
    ['Operasi hitung bilangan dasar'],
    ['Masalah besar terpecah menjadi sub-tugas terstruktur dan konversi biner 4–8 bit tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7' }
  ),
  s(
    'inf-fd-s1-tik-file-kolaborasi', 'Informatika', 'SMP/MTs', 'Fase D', 'Teknologi Informasi & Komunikasi (TIK)',
    'Manajemen File–Folder Terstruktur, Aplikasi Pengolah Kata/Angka Dasar, dan Kolaborasi Daring',
    'Peserta didik dapat mengorganisasi hierarki folder proyek, mengolah data kelas memakai rumus dasar (SUM, AVERAGE, grafik) pada lembar kerja, dan menyunting dokumen kolaboratif secara santun.',
    'Bedakan ekstensi file umum (.docx, .xlsx, .pdf, .png), hak akses view/comment/edit, dan fungsi sel absolut/relatif dasar.',
    'Mengelola berkas digital dan dokumen olah angka secara efisien dalam kerja tim.',
    ['Pengoperasian dasar peramban atau pengolah kata'],
    ['Struktur folder rapi, rumus tabel statistik berfungsi benar, dan riwayat kolaborasi tercatat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  s(
    'inf-fd-s1-sistem-komputer-jaringan', 'Informatika', 'SMP/MTs', 'Fase D', 'Sistem Komputer & Jaringan (SK/JKI)',
    'Cara Kerja CPU–Memori–I/O, Sistem Operasi, dan Dasar Koneksi Jaringan Komputer / Internet Aman',
    'Peserta didik dapat menjelaskan siklus input–proses–output perangkat komputer dan mengidentifikasi fungsi router, alamat IP, serta proteksi Wi-Fi publik.',
    'Analogikan CPU sebagai pengolah, RAM sebagai meja kerja sementara, penyimpanan sekunder sebagai lemari arsip, dan enkripsi dasar.',
    'Memahami arsitektur dasar perangkat komputer dan prinsip koneksi jaringan yang aman.',
    ['Mengenal perangkat keras komputer & ponsel'],
    ['Diagram alur I-P-O dan alasan risiko menyambungkan akun sensitif di Wi-Fi terbuka dijelaskan tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'inf-fd-s1-keamanan-data-etika', 'Informatika', 'SMP/MTs', 'Fase D', 'Dampak Sosial Informatika (DSI)',
    'Keamanan Data Pribadi, Deteksi Phishing/Hoaks, Jejak Digital, dan Etika Berjejaring Sosial',
    'Peserta didik dapat menganalisis ciri tautan phishing serta berita palsu dan menerapkan autentikasi kata sandi kuat + 2FA pada akun pribadi.',
    'Latih checklist periksa URL pengirim, kejanggalan permintaan kode OTP, serta konsekuensi jangka panjang jejak digital.',
    'Melindungi identitas digital pribadi dan bersikap etis dalam komunikasi daring.',
    ['Penggunaan layanan internet dasar'],
    ['Identifikasi pesan phishing/penipuan digital tepat dan aturan perlindungan data pribadi diterapkan'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'inf-fd-s2-analisis-data-visualisasi', 'Informatika', 'SMP/MTs', 'Fase D', 'Analisis Data (AD)',
    'Pengolahan Data Tabel Besar: Penyaringan (Filter), Pengurutan (Sort), Formula Logika IF, & Visualisasi',
    'Peserta didik dapat mengimpor atau menyusun kumpulan data survei kelas lalu menggunakan fungsi SUMIF/COUNTIF/IF serta memilih jenis grafik yang paling tepat menggambarkan tren data.',
    'Ajarkan kapan memilih diagram garis (tren waktu), batang (perbandingan kategori), vs lingkaran (proporsi 100%).',
    'Mengekstrak informasi bermakna dari data mentah dan memvisualisasikannya tanpa menyesatkan pembaca.',
    ['Pengolah angka dasar Sem 1'],
    ['Fungsi penyaringan/IF mengolah tabel tanpa error dan jenis grafik cocok dengan sifat data'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['inf-fd-s1-tik-file-kolaborasi'], relatedTopicIds: ['inf-fd-s1-tik-file-kolaborasi'], suggestedGrade: '8' }
  ),
  s(
    'inf-fd-s2-algoritma-pemrograman-blok', 'Informatika', 'SMP/MTs', 'Fase D', 'Algoritma & Pemrograman (AP)',
    'Pemrograman Visual Berbasis Blok (Variabel, Percabangan If–Else, Perulangan Loop, dan Fungsi)',
    'Peserta didik dapat menerjemahkan logika urutan langkah ke dalam blok pemrograman visual (seperti Scratch/Blockly) untuk membuat animasi interaktif atau kalkulator/kuis mini.',
    'Fokus pada pelacakan kesalahan logika (debugging) saat kondisi if-else atau batas perulangan menghasilkan keluaran tak terduga.',
    'Membangun program interaktif memakai variabel, kontrol alur bercabang, dan perulangan.',
    ['Berpikir komputasional Sem 1'],
    ['Program visual berjalan tanpa bug logika saat diuji pada kondisi batas input'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-fd-s1-dekomposisi-algoritma'], relatedTopicIds: ['inf-fd-s1-dekomposisi-algoritma'], suggestedGrade: '8' }
  ),
  s(
    'inf-fd-s2-modul-interaksi-sensor-dasar', 'Informatika', 'SMP/MTs', 'Fase D', 'Algoritma & Rekayasa Komputasi',
    'Pemrograman Teks Awal / Simulasi Mikrokontroler Dasar dengan Logika Event & Kondisi',
    'Peserta didik dapat merancang logika reaksi otomatis (mis. "jika sensor cahaya gelap maka nyalakan LED") secara diagram alir maupun kode sederhana terstruktur.',
    'Transisikan logika blok ke penulisan sintaks terstruktur sederhana dan pengujian berpasangan input → aksi.',
    'Menjembatani pemrograman visual ke logika kendali perangkat sederhana berbasis event.',
    ['Pemrograman blok & sistem komputer I/O'],
    ['Diagram alir dan logika kondisi event–aksi bekerja sesuai seluruh skenario uji'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-fd-s2-algoritma-pemrograman-blok', 'inf-fd-s1-sistem-komputer-jaringan'], relatedTopicIds: ['inf-fd-s2-algoritma-pemrograman-blok'], suggestedGrade: '9' }
  ),
  s(
    'inf-fd-s2-praktik-lintas-bidang-karya', 'Informatika', 'SMP/MTs', 'Fase D', 'Praktik Lintas Bidang (PLB)',
    'Proyek Tim Lintas Bidang: Merancang Solusi Digital Sederhana (Kampanye/Aplikasi Mini Sekolah)',
    'Peserta didik dapat bekerja dalam tim (analis, pembuat kode/konten, penguji) untuk merancang dan mendemonstrasikan artefak komputasi pemecah masalah sekitar sekolah.',
    'Tekankan dokumentasi masalah, rancangan antarmuka sederhana, pembagian peran adil, dan evaluasi umpan balik pengguna.',
    'Mengintegrasikan kemampuan olah data, pemrograman, dan etika digital dalam produk tim.',
    ['Analisis data, pemrograman & keamanan data'],
    ['Artefak proyek diuji coba teman sekelas lengkap dengan catatan perbaikan bug/tampilan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-fd-s2-analisis-data-visualisasi', 'inf-fd-s2-algoritma-pemrograman-blok'], relatedTopicIds: ['inf-fd-s2-algoritma-pemrograman-blok'], suggestedGrade: '9' }
  ),
  // Informatika Fase E (SMA/MA & SMK)
  s(
    'inf-fe-s1-bk-pencarian-pengurutan', 'Informatika', 'SMA/MA', 'Fase E', 'Berpikir Komputasional (BK)',
    'Algoritma Pencarian (Linear–Binary Search), Pengurutan (Sorting), serta Struktur Tumpukan & Antrean',
    'Peserta didik dapat membandingkan efisiensi jumlah langkah pencarian biner vs linear serta memodelkan prinsip LIFO (Stack) dan FIFO (Queue) pada antrean proses komputer.',
    'Gunakan simulasi kartu angka acak untuk memperlihatkan syarat data terurut pada binary search dan perbandingan langkah.',
    'Mengevaluasi pilihan algoritma dasar serta struktur data linear berdasarkan efisiensi langkah.',
    ['Dekomposisi & alur logika SMP'],
    ['Pelacakan iterasi sorting & binary search akurat untuk kumpulan data contoh'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s1-integrasi-aplikasi-perkantoran', 'Informatika', 'SMA/MA', 'Fase E', 'Teknologi Informasi & Komunikasi (TIK)',
    'Integrasi Lintas Aplikasi Konten (Mail Merge, Tautan Data Grafik–Laporan, dan Sitasi Otomatis)',
    'Peserta didik dapat menghubungkan basis data lembar sebar ke dokumen pengolah kata (mail merge & dynamic chart) guna menyusun laporan resmi otomatis bebas salah salin.',
    'Praktikkan pembuatan surat undangan/sertifikat massal dan penautan tabel ringkas ke laporan presentasi.',
    'Mengotomatisasi penyusunan dokumen majemuk dengan menautkan sumber data antaraplikasi.',
    ['Pengolahan kata & angka dasar SMP'],
    ['Mail merge mencetak data penerima berbeda secara otomatis tanpa edit manual satu per satu'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s1-arsitektur-jaringan-enkripsi', 'Informatika', 'SMA/MA', 'Fase E', 'Sistem Komputer & Jaringan (SK/JKI)',
    'Interaksi Hardware–OS–Driver, Model Lapisan Jaringan Dasar, DNS/HTTPS, dan Enkripsi Pengiriman Data',
    'Peserta didik dapat menjelaskan peran sistem operasi menjembatani aplikasi dengan perangkat keras serta membedakan koneksi HTTP vs HTTPS terenkripsi pada lalu lintas internet.',
    'Demonstrasikan sandi substitusi sederhana menuju konsep kunci publik HTTPS untuk melindungi transaksi daring.',
    'Memahami integrasi lapisan sistem komputer dan keamanan dasar komunikasi jaringan internet.',
    ['Konsep dasar I/O & keamanan akun SMP'],
    ['Alur kerja OS–CPU–RAM dan fungsi sertifikat HTTPS serta enkripsi dijelaskan benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s1-dsi-karier-hki-etika', 'Informatika', 'SMA/MA', 'Fase E', 'Dampak Sosial Informatika (DSI)',
    'Hak Kekayaan Intelektual (Lisensi Creative Commons vs Komersial), Jejak AI, dan Etika Profesi TI',
    'Peserta didik dapat memilih jenis lisensi perangkat lunak/konten yang sah saat memakai aset daring serta mengevaluasi risiko bias data dan plagiarisme karya berbasis AI.',
    'Bandingkan hak cipta eksklusif, open-source MIT/GPL, CC-BY-NC, dan kewajiban atribusi sumber.',
    'Mematuhi etika hak cipta digital serta mengevaluasi implikasi sosial-hukum otomasi informasi.',
    ['Etika berjejaring sosial SMP'],
    ['Klasifikasi lisensi aset digital tepat dan penilaian kasus etika penggunaan AI didukung argumen jelas'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s2-analisis-data-publik-scraping', 'Informatika', 'SMA/MA', 'Fase E', 'Analisis Data (AD)',
    'Pembersihan Data (Data Cleaning), Agregasi Multi-Kriteria (Pivot Table), dan Interpretasi Data Publik',
    'Peserta didik dapat mendeteksi duplikasi, nilai hilang, atau inkonsistensi format dalam data tabular terbuka serta meringkas pola memakai pivot table dan visualisasi korelatif.',
    'Tekankan prinsip "garbage in, garbage out": validasi kualitas data wajib mendahului penarikan kesimpulan grafik.',
    'Mengolah kumpulan data mentah berskala menengah menjadi informasi ringkas terpercaya.',
    ['Filter & formula IF SMP'],
    ['Data kotor berhasil dibersihkan terukur dan tabel pivot merangkum dimensi baris-kolom tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['inf-fe-s1-integrasi-aplikasi-perkantoran'], relatedTopicIds: ['inf-fe-s1-integrasi-aplikasi-perkantoran'], suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s2-pemrograman-prosedural-c-py', 'Informatika', 'SMA/MA', 'Fase E', 'Algoritma & Pemrograman (AP)',
    'Pemrograman Teks Prosedural (Tipe Data, Array/List, Percabangan Bersarang, Perulangan & Modular Fungsi)',
    'Peserta didik dapat menulis program teks terstruktur (mis. Python atau C) yang memproses list/array angka memakai fungsi modular dan menangani input tidak valid secara aman.',
    'Latih membaca traceback error, memisahkan logika input–proses–output ke dalam fungsi teruji, dan pengujian unit kasus tepi.',
    'Membangun perangkat lunak prosedural berbasis teks dengan modul fungsi yang dapat diuji.',
    ['Algoritma sorting/searching & blok visual'],
    ['Program mengembalikan keluaran benar pada kasus normal maupun kasus batas array kosong/nilai negatif'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-fe-s1-bk-pencarian-pengurutan'], relatedTopicIds: ['inf-fe-s1-bk-pencarian-pengurutan'], suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s2-simulasi-komputasi-kasus', 'Informatika', 'SMA/MA', 'Fase E', 'Algoritma & Pemodelan',
    'Pemodelan Masalah Dunia Nyata ke Simulasi Program Teks (Kasir, Antrean, atau Pengolah Skor)',
    'Peserta didik dapat merancang representasi data dan aturan bisnis aplikasi konsol mini lalu melakukan pengujian kesesuaian hasil program terhadap perhitungan manual.',
    'Ajarkan penyusunan daftar skenario uji (test cases) sebelum maupun sesudah pengkodean agar logika bisnis konsisten.',
    'Mengonversi kebutuhan masalah nyata menjadi spesifikasi dan implementasi program teks terverifikasi.',
    ['Pemrograman prosedural & Stack/Queue'],
    ['Aplikasi konsol memenuhi seluruh kasus uji skenario transaksi/antrean tanpa crash'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-fe-s2-pemrograman-prosedural-c-py'], relatedTopicIds: ['inf-fe-s2-pemrograman-prosedural-c-py'], suggestedGrade: '10' }
  ),
  s(
    'inf-fe-s2-proyek-plb-lintas-mapel', 'Informatika', 'SMA/MA', 'Fase E', 'Praktik Lintas Bidang (PLB)',
    'Proyek Pengembangan Solusi Komputasional Berbasis Data Nyata dan Dokumentasi Pengujian',
    'Peserta didik dapat berkolaborasi lintas peran merancang aplikasi mini atau dasbor olah data lingkungan sekolah yang dilampiri dokumentasi desain, uji bug, dan refleksi dampak etis.',
    'Gunakan siklus SDLC mini (analisis kebutuhan → desain alur → implementasi → uji pengguna → perbaikan).',
    'Mengintegrasikan berpikir komputasional, analisis data, pemrograman teks, dan HKI dalam karya nyata.',
    ['Data cleaning, pemrograman prosedural, & HKI'],
    ['Proyek dilengkapi dokumen alur data, log pengujian skenario, serta catatan lisensi sumber'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-fe-s2-analisis-data-publik-scraping', 'inf-fe-s2-pemrograman-prosedural-c-py'], relatedTopicIds: ['inf-fe-s2-pemrograman-prosedural-c-py'], suggestedGrade: '10' }
  ),
  // Informatika Fase F (Kelas 11-12)
  s(
    'inf-ff-s1-graf-pohon-strategi-algoritma', 'Informatika', 'SMA/MA', 'Fase F', 'Berpikir Komputasional (BK)',
    'Struktur Data Non-Linear (Graf & Pohon), Strategi Greedy, dan Rekursi Pemecahan Masalah Optimasi',
    'Peserta didik dapat memodelkan jaringan rute/ketergantungan menjadi graf atau pohon, menerapkan algoritma rekursif sederhana, serta membandingkan batas solusi greedy vs pencarian menyeluruh.',
    'Gunakan kasus penentuan jalur terpendek peta sekolah dan pohon keputusan/silsilah untuk melihat keterbatasan pendekatan serakah (greedy).',
    'Memodelkan persoalan ketergantungan jaringan kompleks memakai struktur graf dan rekursi.',
    ['Searching, sorting, & Stack/Queue Fase E'],
    ['Representasi adjacency graf/pohon benar; analisis kasus di mana solusi greedy gagal vs berhasil tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  s(
    'inf-ff-s1-jaringan-routing-keamanan', 'Informatika', 'SMA/MA', 'Fase F', 'Jaringan & Keamanan Siber (JKI)',
    'Pengalamatan IP & Subnetting Dasar, Routing Paket, Firewall, dan Autentikasi Aman Aplikasi Web',
    'Peserta didik dapat menghitung blok host/network subnet dasar serta mendiagnosis celah keamanan web umum seperti weak password, SQL injection konseptual, dan kebocoran token.',
    'Latih membedakan autentikasi vs otorisasi serta mengapa input pengguna wajib divalidasi/disanitasi di server.',
    'Merancang topologi jaringan logis dan menerapkan prinsip dasar pertahanan keamanan siber.',
    ['Lapisan jaringan & HTTPS Fase E'],
    ['Perhitungan jumlah host subnetting dasar tepat; identifikasi celah keamanan dan mitigasinya benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'inf-ff-s1-basis-data-relasional', 'Informatika', 'SMA/MA', 'Fase F', 'Analisis Data & Basis Data',
    'Pemodelan Entity–Relationship Diagram (ERD), Normalisasi Dasar, dan Kueri SQL (SELECT–JOIN)',
    'Peserta didik dapat merancang skema tabel relasional dengan Primary Key dan Foreign Key bebas redundansi berlebihan serta menulis kueri JOIN agregasi untuk menjawab pertanyaan bisnis.',
    'Tunjukkan risiko duplikasi/anomali pembaruan saat seluruh entitas ditumpuk dalam satu lembar sebar datar sebelum dinormalisasi.',
    'Mengelola struktur data relasional terindeks dan mengekstrak informasi lintas tabel secara presisi.',
    ['Pivot table & pembersihan data Fase E'],
    ['ERD memiliki relasi 1:N / M:N tepat dan kueri SQL JOIN–GROUP BY menghasilkan agregasi akurat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  s(
    'inf-ff-s1-pemrograman-oop-modular', 'Informatika', 'SMA/MA', 'Fase F', 'Algoritma & Pemrograman (AP)',
    'Pemrograman Berorientasi Objek (Class, Object, Encapsulation) dan Manajemen Versi Git Dasar',
    'Peserta didik dapat merancang modul class dengan atribut/metode terenkapsulasi untuk proyek berkolaborasi menggunakan cabang commit yang rapi.',
    'Kontraskan fungsi prosedural lepas dengan pengelompokan perilaku–data dalam objek beserta manfaat uji modular.',
    'Menyusun kode terstruktur berorientasi objek yang mudah dirawat dan dikembangkan bersama tim.',
    ['Pemrograman prosedural Fase E'],
    ['Class memisahkan tanggung jawab secara logis dan pesan error input tidak mematahkan objek'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  s(
    'inf-ff-s2-ai-pembelajaran-mesin-etika', 'Informatika', 'SMA/MA', 'Fase F', 'Kecerdasan Artifisial & DSI',
    'Cara Kerja Klasifikasi Pembelajaran Mesin Dasar, Evaluasi Akurasi/Bias Dataset, dan Tata Kelola AI',
    'Peserta didik dapat menjelaskan siklus data latih–data uji pada model klasifikasi sederhana serta mendiagnosis bagaimana dataset tidak seimbang menghasilkan keputusan diskriminatif.',
    'Gunakan contoh ketidakseimbangan kelas pada klasifikasi atau confusion matrix sederhana (True/False Positive) + transparansi model.',
    'Mengevaluasi kinerja dan keadilan sistem berbasis kecerdasan artifisial secara teknis dan etis.',
    ['Analisis data, SQL, & algoritma Fase F'],
    ['Perbedaan data latih vs data uji tepat; risiko overfitting & bias dataset dianalisis dengan contoh konkret'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-ff-s1-basis-data-relasional'], relatedTopicIds: ['inf-ff-s1-basis-data-relasional'], suggestedGrade: '12' }
  ),
  s(
    'inf-ff-s2-iot-perangkat-terbenam', 'Informatika', 'SMA/MA', 'Fase F', 'Sistem Komputer & Rekayasa',
    'Arsitektur Sistem Internet of Things (IoT): Akuisisi Sensor, Protokol Pengiriman, & Otomasi Aktuator',
    'Peserta didik dapat merancang alur komunikasi sistem IoT sederhana (sensor membaca ambang batas → pengiriman data ke logika kendali → aktuasi/notifikasi aman).',
    'Perhatikan konsumsi daya, jeda sampling pembacaan sensor, serta pengamanan komunikasi agar perangkat IoT tidak mudah diambil alih.',
    'Menghubungkan pemrograman perangkat keras-lunak ke pengiriman data pemantauan waktu nyata.',
    ['Arsitektur komputer & jaringan Fase F'],
    ['Skema arsitektur sensor–kontroler–aktuator logis lengkap dengan syarat ambang batas dan pengamanan akses'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-ff-s1-jaringan-routing-keamanan'], relatedTopicIds: ['inf-ff-s1-jaringan-routing-keamanan'], suggestedGrade: '12' }
  ),
  s(
    'inf-ff-s2-rekayasa-perangkat-lunak-uji', 'Informatika', 'SMA/MA', 'Fase F', 'Rekayasa Perangkat Lunak',
    'Pengembangan Aplikasi Web/API Sederhana dengan Validasi Input, State Persisten, dan Automated Testing',
    'Peserta didik dapat mengimplementasikan fitur aplikasi bertumpu pada penyimpanan persisten serta menulis pengujian otomatis dasar (unit/integration test) untuk memverifikasi kasus normal dan gagal.',
    'Latih kebiasaan menulis tes untuk edge case kosong, tipe salah, dan menjaga keterpisahan antarmuka dari logika domain.',
    'Membangun perangkat lunak andal melalui validasi terstruktur dan pengujian otomatis.',
    ['OOP & basis data relasional'],
    ['Fitur utama berjalan konsisten dan skenario uji otomatis memvalidasi keberhasilan maupun penolakan input'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-ff-s1-pemrograman-oop-modular', 'inf-ff-s1-basis-data-relasional'], relatedTopicIds: ['inf-ff-s1-pemrograman-oop-modular'], suggestedGrade: '12' }
  ),
  s(
    'inf-ff-s2-proyek-capstone-informatika', 'Informatika', 'SMA/MA', 'Fase F', 'Praktik Lintas Bidang Lanjutan',
    'Proyek Capstone Informatika: Integrasi Basis Data, Algoritma, Keamanan, dan Evaluasi Dampak Sosial',
    'Peserta didik dapat menuntaskan proyek produk perangkat lunak/komputasi akhir secara tim lengkap dengan presentasi teknis, bukti pengujian, audit keamanan dasar, dan evaluasi manfaat pengguna.',
    'Simulasikan demo produk nyata di hadapan penguji dengan memaparkan arsitektur, keterbatasan sistem saat ini, dan rencana penyempurnaan.',
    'Mengintegrasikan seluruh kompetensi Fase F menjadi solusi komputasional berstandar rekayasa dan beretika.',
    ['Seluruh pilar Informatika Fase F'],
    ['Produk terdokumentasi rapi, lulus uji skenario inti, dan dievaluasi jujur kelebihan–keterbatasannya'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-ff-s2-rekayasa-perangkat-lunak-uji'], relatedTopicIds: ['inf-ff-s2-rekayasa-perangkat-lunak-uji'], suggestedGrade: '12' }
  ),

  // PKK SMK (Fase F — Kelas 11-12 SMK)
  s(
    'pkk-smk-s1-prototipe-biaya-hpp', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'K3LH, Prototipe & Struktur Biaya',
    'Keselamatan Kerja K3LH & 5R Bengkel, Pembuatan Prototipe, dan Perhitungan HPP serta BEP',
    'Peserta didik dapat menerapkan audit K3LH dan penataan 5R di ruang produksi sebelum membuat sampel prototipe serta menghitung Harga Pokok Produksi (HPP) per unit dan titik impas (BEP).',
    'Pastikan komponen biaya overhead, SOP APD bengkel/5R, dan bahan baku terhitung akurat agar produk aman dibuat dan tidak rugi dijual.',
    'Menghubungkan kepatuhan K3LH/5R dan kelayakan teknis prototipe dengan akurasi kalkulasi HPP/BEP.',
    ['Desain produk & matematika BEP'],
    ['Audit 5R/K3LH lengkap dan perhitungan HPP–BEP unit konsisten'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['pkk-smk-s1-peluang-desain-produk'], relatedTopicIds: ['pkk-smk-s1-peluang-desain-produk'], suggestedGrade: '11' }
  ),
  s(
    'pkk-smk-s1-peluang-desain-produk', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Peluang Usaha & Desain',
    'Riset Peluang Pasar Konsumen, Value Proposition, dan Perancangan Desain Kemasan Produk/Jasa',
    'Peserta didik dapat memvalidasi kebutuhan masalah pelanggan potensial melalui wawancara singkat dan merancang desain konsep produk/jasa beserta kemasan fungsionalnya.',
    'Gunakan peta empati pelanggan dan Value Proposition Canvas sebelum berinvestasi membuat desain/kemasan final.',
    'Menyelaraskan inovasi keahlian kejuruan dengan permintaan nyata pasar dan daya tarik kemasan.',
    ['Literasi ekonomi & keahlian dasar kelas 10'],
    ['Konsep produk didukung temuan survei kebutuhan calon pembeli dan sketsa spesifikasi jelas'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '11' }
  ),
  s(
    'pkk-smk-s1-haki-legalitas-sop', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Legalitas Usaha & HAKI',
    'Perlindungan Hak Kekayaan Intelektual (Merek, Hak Cipta, Paten Sederhana) dan Perizinan UMKM (NIB/PIRT)',
    'Peserta didik dapat membedakan objek perlindungan Hak Cipta, Merek Dagang, Desain Industri, dan Paten serta mengidentifikasi persyaratan legal dasar usaha mikro/kecil.',
    'Cek contoh risiko pelanggaran merek atau kemasan produk pangan tanpa izin edar serta langkah pengurusan NIB/OSS secara mandiri.',
    'Melindungi karya orisinal kejuruan dan memastikan kepatuhan regulasi dasar pendirian usaha.',
    ['Desain konsep produk/jasa Sem 1'],
    ['Identifikasi jenis perlindungan HAKI sesuai karakter karya tepat dan daftar syarat legalitas usaha lengkap'],
    '1 (Ganjil)', 'pengembangan', { prasyaratTopicIds: ['pkk-smk-s1-peluang-desain-produk'], relatedTopicIds: ['pkk-smk-s1-peluang-desain-produk'], suggestedGrade: '11' }
  ),
  s(
    'pkk-smk-s1-uji-pasar-prototipe', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Pengujian Produk',
    'Uji Coba Pengguna (Beta/Tasting Test), Analisis Umpan Balik Pelanggan, dan Revisi Prototipe',
    'Peserta didik dapat melaksanakan uji coba produk/layanan kepada responden sasaran memakai lembar penilaian terstruktur lalu merumuskan perbaikan teknis sebelum produksi skala besar.',
    'Latih memisahkan kritik konstruktif terkait fungsi, ketahanan, harga, dan pengalaman pakai dari sekadar komentar sopan.',
    'Mengiterasi mutu prototipe berdasar data uji konsumen sebelum melangkah ke produksi.',
    ['Prototipe & HPP Sem 1'],
    ['Catatan revisi desain didukung data responden uji coba dengan prioritas perbaikan jelas'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['pkk-smk-s1-prototipe-biaya-hpp'], relatedTopicIds: ['pkk-smk-s1-prototipe-biaya-hpp'], suggestedGrade: '11' }
  ),
  s(
    'pkk-smk-s2-produksi-massal-qc', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Manajemen Produksi',
    'Perencanaan Produksi Massal / Layanan Berkala, Lini Kerja Efisien, dan Pengendalian Mutu (QC)',
    'Peserta didik dapat menyusun standar mutu pemeriksaan akhir (SOP Quality Control), pembagian alur kerja stasiun produksi, dan pengendalian pemborosan bahan.',
    'Bandingkan sistem produksi berkelanjutan vs produksi berdasarkan pesanan (job order) dengan titik pemeriksaan cacat bahan/produk.',
    'Menjaga konsistensi mutu dan efisiensi jadwal penyelesaian pesanan skala berulang.',
    ['Uji prototipe Sem 1'],
    ['Checklist QC memiliki kriteria lolos/gagal terukur dan alur stasiun kerja meminimalkan waktu tunggu'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pkk-smk-s1-uji-pasar-prototipe'], relatedTopicIds: ['pkk-smk-s1-uji-pasar-prototipe'], suggestedGrade: '12' }
  ),
  s(
    'pkk-smk-s2-strategi-pemasaran-digital', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Pemasaran & Distribusi',
    'Bauran Pemasaran (4P), Copywriting Produk Etis, dan Optimasi Saluran Pemasaran Digital',
    'Peserta didik dapat menyusun strategi pemasaran omnichannel (offline–lokapasar–media sosial) dengan pesan produk jujur berbasis keunggulan nyata tanpa klaim menyesatkan.',
    'Evaluasi efektivitas biaya promosi per penjualan (ROAS sederhana) dan penanganan pesanan agar tepat waktu.',
    'Mengelola saluran distribusi dan promosi digital secara profesional dan menguntungkan.',
    ['Value proposition & HPP'],
    ['Rencana kampanye pemasaran mengaitkan segmentasi audiens, anggaran promosi, dan kanal distribusi'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  s(
    'pkk-smk-s2-layanan-purnajual-crm', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Layanan Pelanggan',
    'Negosiasi Penjualan, Pengelolaan Pesanan, dan Strategi Layanan Purnajual untuk Retensi Pelanggan',
    'Peserta didik dapat mengelola komunikasi penutupan transaksi, penanganan keluhan retur/garansi secara adil, dan pencatatan basis data pelanggan berulang.',
    'Tunjukkan mengapa mempertahankan pelanggan lama lebih hemat biaya daripada terus mencari pembeli baru dari nol.',
    'Membangun kepercayaan jangka panjang pelanggan melalui standar layanan pascatransaksi yang sigap.',
    ['Pemasaran & etika profesi'],
    ['SOP purnajual mengatur batas garansi/retur jelas dan simulasi layanan komplain berjalan santun'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pkk-smk-s2-strategi-pemasaran-digital'], relatedTopicIds: ['pkk-smk-s2-strategi-pemasaran-digital'], suggestedGrade: '12' }
  ),
  s(
    'pkk-smk-s2-laporan-keuangan-evaluasi-usaha', 'Produk Kreatif dan Kewirausahaan (PKK)', 'SMK', 'Fase F', 'Evaluasi & Pelaporan Usaha',
    'Pembukuan Arus Kas, Laporan Laba/Rugi Proyek Usaha, dan Rencana Pengembangan Berkelanjutan',
    'Peserta didik dapat menyusun laporan arus kas aktual dan laba/rugi dari kegiatan praktik usaha semester lalu serta merumuskan keputusan skala lanjut (scale-up vs pivot) berbasis angka.',
    'Bandingkan proyeksi HPP/BEP awal di Semester 1 dengan pencapaian pendapatan dan biaya aktual di Semester 2.',
    'Mengevaluasi kelayakan bisnis riil berdasarkan pembukuan jujur sebagai bekal wirausaha pasca-SMK.',
    ['HPP/BEP Sem 1 & produksi massal Sem 2'],
    ['Laporan arus kas–laba/rugi seimbang angka transaksinya dan evaluasi menyertakan keputusan berdasar margin'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['pkk-smk-s1-prototipe-biaya-hpp', 'pkk-smk-s2-produksi-massal-qc'], relatedTopicIds: ['pkk-smk-s1-prototipe-biaya-hpp'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // 8. PJOK (SD Fase A/B/C, SMP Fase D, SMA/SMK Fase E/F)
  // =====================================================================
  s(
    'pjok-sd-s1-gerak-dasar-keselamatan', 'PJOK', 'SD/MI', 'Fase B', 'Keterampilan Gerak Dasar',
    'Kombinasi Gerak Lokomotor, Nonlokomotor, Manipulatif, serta Pemanasan–Pendinginan Aman',
    'Peserta didik dapat mempraktikkan variasi lari–lompat–lempar tangkap berpasangan dengan posisi mendarat mengeper aman serta memahami fungsi pemanasan.',
    'Tekankan tekuk lutut saat mendarat, alas aman, serta kebiasaan minum air putih setelah berolahraga.',
    'Menguasai koordinasi gerak dasar dan kesadaran mencegah cedera otot atau sendi.',
    ['Koordinasi jalan, lari, dan lempar dasar'],
    ['Teknik pendaratan lutut mengeper teramati konsisten dan siswa melakukan urutan pemanasan penuh'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  s(
    'pjok-sd-s1-gizi-kebersihan-diri', 'PJOK', 'SD/MI', 'Fase B', 'Kesehatan & Pola Hidup Sehat',
    'Kebersihan Diri, Istirahat Cukup, dan Komposisi Gizi Seimbang (Isi Piringku) untuk Anak',
    'Peserta didik dapat memilih contoh menu harian bergizi seimbang sesuai pedoman Isi Piringku serta mempraktikkan kebiasaan menjaga kebersihan badan dan pakaian olahraga.',
    'Ajak memeriksa proporsi sayur–buah–lauk–pokok dan bahaya jajan tinggi gula–garam berlebih.',
    'Menerapkan pola makan seimbang dan kebersihan tubuh untuk mendukung pertumbuhan dan energi belajar.',
    ['Pengenalan makanan sehat harian'],
    ['Audit piring makan mampu mengidentifikasi komponen zat gizi kurang dan usul perbaikannya'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  s(
    'pjok-sd-s2-permainan-bola-fairplay', 'PJOK', 'SD/MI', 'Fase C', 'Permainan & Sportivitas',
    'Gerak Dasar Permainan Bola Besar/Kecil serta Kerja Sama Tim dan Sikap Fair Play',
    'Peserta didik dapat melakukan teknik passing/menangkap dasar dalam permainan kelompok sambil menunjukkan sikap sportif, menghargai teman pemula, dan menaati wasit.',
    'Latih umpan datar akurat dalam lingkaran kecil serta refleksi kerja sama tim usai permainan.',
    'Menerapkan kontrol gerak manipulatif bersama etika sportivitas antarteman.',
    ['Gerak dasar lokomotor & manipulatif'],
    ['Operan dasar akurat dan sikap menghargai lawan/keputusan wasit terlihat selama permainan'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['pjok-sd-s1-gerak-dasar-keselamatan'], relatedTopicIds: ['pjok-sd-s1-gerak-dasar-keselamatan'], suggestedGrade: '5' }
  ),
  s(
    'pjok-sd-s2-kebugaran-nadi-senam', 'PJOK', 'SD/MI', 'Fase C', 'Kebugaran Jasmani & Senam',
    'Senam Irama Sederhana, Kelenturan Tubuh, dan Mengenal Pengukuran Denyut Nadi Istirahat vs Gerak',
    'Peserta didik dapat merangkai gerak senam berirama sederhana secara serempak serta menghitung denyut nadi pergelangan tangan sebelum dan sesudah aktivitas ringan.',
    'Bimbing cara menghitung nadi 15 detik × 4 dan mengenal manfaat aktivitas fisik teratur bagi kekuatan jantung.',
    'Menghubungkan aktivitas aerobik ringan berirama dengan perubahan respons denyut nadi tubuh.',
    ['Pemanasan & koordinasi gerak'],
    ['Perhitungan denyut nadi × 4 masuk akal dan gerakan berirama mengikuti hitungan ketukan stabil'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '6' }
  ),
  // PJOK SMP Fase D
  s(
    'pjok-fd-s1-kebugaran-zona-nadi', 'PJOK', 'SMP/MTs', 'Fase D', 'Aktivitas Kebugaran & Kesehatan',
    'Pengukuran Kebugaran Jasmani, Zona Denyut Nadi Latihan, dan Program Latihan Kekuatan–Kelenturan Dasar',
    'Peserta didik dapat menghitung zona denyut nadi latihan pribadi (perbandingan nadi istirahat vs pascaaktivitas) serta mempraktikkan urutan pemanasan statis–dinamis yang aman.',
    'Rumus perkiraan Nadi Maksimal (220 − usia), cara meraba nadi 15 detik × 4, hidrasi, serta keselamatan teknik plank/push-up/sit-up.',
    'Memantau intensitas latihan fisik secara aman berbasis pengukuran denyut nadi sendiri.',
    ['Pengukuran denyut nadi dasar SD'],
    ['Perhitungan bpm zona latihan akurat dan prosedur pemanasan–pendinginan ditaati lengkap'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  s(
    'pjok-fd-s1-permainan-strategi-bola', 'PJOK', 'SMP/MTs', 'Fase D', 'Keterampilan Gerak Permainan',
    'Analisis Gerak Spesifik Passing–Dribbling–Shooting serta Prinsip Strategi Menyerang & Bertahan Dasar',
    'Peserta didik dapat mempraktikkan variasi gerak spesifik bola basket/sepak bola/voli/bulu tangkis dan mengidentifikasi ruang kosong dalam kerja sama tim sportif.',
    'Kombinasikan drill teknik tumpuan kaki/perkenaan tangan dengan pengamatan rekan via rubrik observasi objektif.',
    'Menggabungkan penguasaan teknik spesifik permainan dengan kesadaran posisi tim dan fair play.',
    ['Koordinasi manipulatif dasar SD'],
    ['Checklist observasi teknik tumpuan tepat dan koordinasi antarposisi tim berjalan kooperatif'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'pjok-fd-s2-atletik-senam-keselamatan', 'PJOK', 'SMP/MTs', 'Fase D', 'Keterampilan Gerak Dasar / Atletik',
    'Mekanik Lari Jarak Pendek, Lompat Jauh, dan Senam Lantai dengan Prosedur Keselamatan Matras',
    'Peserta didik dapat mengurutkan tahap awalan–tolakan–melayang–mendarat secara ergonomis serta melakukan audit kelayakan keselamatan matras dan lintasan sebelum praktik.',
    'Tekankan posisi leher–bahu aman saat guling depan/belakang, jarak aman antarpeserta, dan fungsi peredam lutut saat mendarat.',
    'Menjalankan keterampilan atletik/senam lantai secara cermat demi meminimalkan risiko cedera.',
    ['Keseimbangan dan kelenturan dasar'],
    ['Daftar periksa keamanan alat/matras lengkap dan mekanik pendaratan mengeper diterapkan konsisten'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'pjok-fd-s2-gizi-remaja-p3k', 'PJOK', 'SMP/MTs', 'Fase D', 'Pola Hidup Sehat & Keselamatan',
    'Kebutuhan Kalori Remaja Aktif, Pencegahan Pergaulan Berisiko (NAPZA/Rokok), dan Prinsip Dasar P3K',
    'Peserta didik dapat mengevaluasi menu harian terhadap kebutuhan energi aktivitas remaja, menganalisis dampak rokok/NAPZA pada sistem pernapasan–prestasi, dan menerapkan langkah awal RICE untuk terkilir.',
    'Ajarkan prosedur RICE (Rest, Ice, Compression, Elevation) untuk penanganan awal keseleo ringan di sekolah sebelum ditangani petugas medis.',
    'Mengelola gaya hidup sehat remaja serta kesiapsiagaan pertolongan pertama cedera olahraga ringan.',
    ['Isi Piringku SD'],
    ['Audit menu mencerminkan kebutuhan kalori aktif dan urutan penanganan RICE cedera ringan tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pjok-fd-s1-kebugaran-zona-nadi'], relatedTopicIds: ['pjok-fd-s1-kebugaran-zona-nadi'], suggestedGrade: '9' }
  ),
  // PJOK SMA/SMK Fase E & F
  s(
    'pjok-fe-s1-program-latihan-fitt', 'PJOK', 'SMA/MA', 'Fase E', 'Kebugaran Jasmani Lanjutan',
    'Merancang Program Latihan Kebugaran Pribadi Prinsip FITT (Frequency, Intensity, Time, Type)',
    'Peserta didik dapat mengukur komponen kebugaran pribadi (VO2max/lari, daya tahan otot, fleksibilitas) lalu menyusun jadwal latihan 4 minggu sesuai prinsip FITT.',
    'Pastikan penyesuaian intensitas bertahap (overload progresif) tanpa membebani sendi berlebihan.',
    'Merencanakan peningkatan kebugaran personal berbasis evaluasi kondisi fisik awal dan prinsip FITT.',
    ['Zona denyut nadi SMP'],
    ['Rencana 4 minggu mencantumkan target nadi zona latihan, jenis gerak, durasi, dan jadwal istirahat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  s(
    'pjok-fe-s2-taktik-permainan-evaluasi', 'PJOK', 'SMA/MA', 'Fase F', 'Analisis Taktik & Kinerja Gerak',
    'Analisis Pola Taktik Penyerangan–Pertahanan Permainan Net/Invasi serta Pencegahan Cedera Repetitif',
    'Peserta didik dapat mengevaluasi efektivitas formasi tim dan pola umpan melalui video/pengamatan langsung pertandingan serta merancang modifikasi aturan permainan untuk inklusi seluruh teman.',
    'Fokus pada peran kepemimpinan tim, pengambilan keputusan cepat dalam tekanan permainan, dan etika fair play tinggi.',
    'Menganalisis strategi permainan kompleks dan mengelola kerja sama tim kompetitif secara inklusif.',
    ['Strategi dasar permainan SMP & prinsip FITT'],
    ['Analisis pola permainan mengidentifikasi celah posisi disertai usulan perbaikan taktis yang jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pjok-fe-s1-program-latihan-fitt'], relatedTopicIds: ['pjok-fe-s1-program-latihan-fitt'], suggestedGrade: '11' }
  ),

  // =====================================================================
  // 9. PAI & BUDI PEKERTI (BKPDM No. 020 Tahun 2026) & MAPEL MADRASAH (KMA)
  // =====================================================================
  s(
    'pai-sd-s1-tartil-asmaul-husna', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Al-Qur’an & Akidah',
    'Membaca Tartil Surah Pendek Pilihan, Mengenal Asmaul Husna, dan Perilaku Amanah–Jujur',
    'Peserta didik dapat melafalkan ayat pendek pilihan dengan makhraj sederhana serta mencontohkan pengamalan sikap jujur dan amanah sebagai cerminan keimanan kepada Asmaul Husna.',
    'Kaitkan makna sifat Allah Al-Malik/Al-Aziz/As-Salam dengan menghargai teman, menjaga ketertiban kelas, dan mengembalikan barang temuan.',
    'Menumbuhkan kecintaan membaca Al-Qur’an dan membiasakan perilaku terpuji dalam hidup anak.',
    ['Mengenal huruf hijaiyah dan doa harian'],
    ['Pelafalan makhraj jelas dan contoh tindakan amanah–santun diceritakan konkret'],
    '1 (Ganjil)', 'pengenalan',
    { suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-sd-s1-thaharah-shalat', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Fikih Ibadah',
    'Ketentuan Bersuci (Wudhu & Tayamum Ringkas), Bacaan dan Gerakan Shalat Tertib Tuma’ninah',
    'Peserta didik dapat mempraktikkan urutan wudhu dan gerakan shalat fardu dengan tuma’ninah serta memahami syarat sah kebersihan badan, pakaian, dan tempat.',
    'Tekankan urutan fardu wudhu, sikap tenang (tuma’ninah) di tiap rukun shalat, serta menjaga kebersihan lingkungan ibadah.',
    'Melaksanakan praktik dasar thaharah dan shalat fardu secara tertib dan sadar makna.',
    ['Pengenalan rukun Islam dasar'],
    ['Urutan rukun wudhu & shalat dilakukan tertib disertai jeda tuma’ninah jelas'],
    '1 (Ganjil)', 'pengembangan',
    { suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-sd-s2-salam-toleransi-keragaman', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Akhlak & Kerukunan',
    'Indahnya Saling Menghormati dalam Keragaman, Zakat/Sedekah Sosial, dan Menjauhi Ghibah',
    'Peserta didik dapat menjelaskan ajaran Islam tentang persaudaraan kemanusiaan dan menghormati pemeluk agama/budaya lain serta manfaat berbagi zakat fitrah/infak bagi kaum dhuafa.',
    'Hubungkan kandungan QS. Al-Hujurat: 13 tentang perkenalan antarbangsa dengan etika berteman tanpa mengejek latar belakang.',
    'Membangun sikap empati sosial, kepedulian terhadap sesama, dan kerukunan di lingkungan majemuk.',
    ['Perilaku jujur & amanah'],
    ['Menunjukkan contoh sikap menghormati teman berbeda suku/agama dan memahami tujuan zakat fitrah'],
    '2 (Genap)', 'penerapan',
    { prasyaratTopicIds: ['pai-sd-s1-tartil-asmaul-husna'], relatedTopicIds: ['pai-sd-s1-tartil-asmaul-husna'], suggestedGrade: '5', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-sd-s2-fathu-makkah-khulafa', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Sejarah Peradaban Islam',
    'Keteladanan Dakwah Damai Fathu Makkah, Haji Wada’, dan Kepemimpinan Khulafaurasyidin',
    'Peserta didik dapat mengambil teladan sikap pemaaf Rasulullah saat Fathu Makkah serta amanah kepemimpinan Abu Bakar, Umar, Utsman, dan Ali dalam melayani rakyat.',
    'Soroti pesan persaudaraan universal Khutbah Wada’ dan keadilan Umar bin Khattab terhadap rakyat kecil.',
    'Meneladani sifat pemaaf, musyawarah, dan tanggung jawab kepemimpinan dalam sejarah Islam.',
    ['Kisah keteladanan nabi dan rasul'],
    ['Mengaitkan sikap pemaaf Fathu Makkah dengan cara menyelesaikan pertengkaran teman secara damai'],
    '2 (Genap)', 'integrasi',
    { prasyaratTopicIds: ['pai-sd-s1-tartil-asmaul-husna'], relatedTopicIds: ['pai-sd-s1-tartil-asmaul-husna'], suggestedGrade: '6', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  // PAI SMP & SMA/SMK (BKPDM 020/2026)
  s(
    'pai-fd-s1-ilmu-tajwid-iman', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Al-Qur’an, Hadis & Akidah',
    'Etika Menuntut Ilmu, Tajwid Alif Lam/Mad, serta Makna Iman Kepada Kitab & Rasul dalam Kehidupan Pelajar',
    'Peserta didik dapat mengidentifikasi hukum bacaan tajwid pada ayat tentang semangat menuntut ilmu serta meneladani sifat siddiq, amanah, tabligh, fathanah dalam kejujuran akademik.',
    'Kaitkan nilai fathanah (cerdas kritis) dengan integritas pelajar menghindari menyontek dan menyebarkan berita tanpa tabayyun.',
    'Mengintegrasikan bacaan Al-Qur’an bertajwid dengan pembiasaan etika pencari ilmu dan tabayyun informasi.',
    ['Tartil & Asmaul Husna SD'],
    ['Identifikasi hukum tajwid ayat tepat dan penerapan sikap tabayyun dalam kasus hoaks remaja jelas'],
    '1 (Ganjil)', 'pengembangan',
    { suggestedGrade: '8', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-fd-s1-ibadah-sujud-puasa', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Fikih Ibadah',
    'Pendalaman Shalat Jamak–Qashar, Sujud Syukur–Tilawah–Sahwi, dan Hikmah Puasa–Zakat',
    'Peserta didik dapat membedakan ketentuan jamak takdim/takhir dan qashar bagi musafir serta menjelaskan sebab dan bacaan sujud sahwi, syukur, dan tilawah secara tepat.',
    'Latih penerapan rukhsah (keringanan ibadah perjalanan) pada studi kasus siswa mengikuti lomba atau perjalanan jauh.',
    'Memahami keluasan kemudahan syariat ibadah dan makna pengendalian diri sosial.',
    ['Ketentuan wudhu & shalat fardu SD'],
    ['Pemilihan syarat jamak/qashar serta kondisi pemicu sujud sahwi vs syukur tepat'],
    '1 (Ganjil)', 'penerapan',
    { suggestedGrade: '8', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-fd-s2-etika-digital-moderasi', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Akhlak Mulia',
    'Akhlak Digital (Menghindari Ghibah/Cyberbullying/Tabayyun) dan Moderasi Beragama dalam Masyarakat Majemuk',
    'Peserta didik dapat mengevaluasi dampak moral dan sosial perilaku merundung atau mengumbar aib di media sosial menurut ajaran Islam serta mempraktikkan moderasi dan toleransi.',
    'Gunakan prinsip tabayyun (verifikasi sebelum menyebarkan) serta menjaga lisan dan jempol pada ruang publik digital.',
    'Mewujudkan etika Islam rahmatan lil ‘alamin dalam pergaulan luring dan daring remaja.',
    ['Kejujuran & toleransi SD'],
    ['Analisis kasus etika media sosial merujuk ajaran tabayyun dan empati lintas perbedaan'],
    '2 (Genap)', 'penerapan',
    { prasyaratTopicIds: ['pai-fd-s1-ilmu-tajwid-iman'], relatedTopicIds: ['pai-fd-s1-ilmu-tajwid-iman'], suggestedGrade: '8', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-fd-s2-peradaban-abbasiyah-nusantara', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Sejarah Peradaban Islam',
    'Kejayaan Ilmu Pengetahuan Masa Abbasiyah hingga Dakwah Kultural Islam di Nusantara',
    'Peserta didik dapat melacak faktor kemajuan sains, kedokteran, dan perpustakaan Bayt al-Hikmah serta membandingkannya dengan pendekatan dakwah damai Wali Songo di Nusantara.',
    'Tekankan keterbukaan ilmuwan Muslim klasik mempelajari warisan keilmuan lintas peradaban dan kebijaksanaan budaya dakwah Nusantara.',
    'Meneladani etos keilmuan terbuka dan pendekatan dakwah damai menghargai kearifan lokal.',
    ['Sejarah dakwah SD'],
    ['Menyebutkan kontribusi tokoh keilmuan klasik dan ciri akulturasi dakwah Nusantara secara akurat'],
    '2 (Genap)', 'pendalaman',
    { suggestedGrade: '9', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  // PAI SMA/SMK Fase E & F
  s(
    'pai-fe-s1-kompetisi-kebaikan-muamalah', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Al-Qur’an, Fikih & Etos Kerja',
    'Kompetisi dalam Kebaikan (Fastabiqul Khairat), Etos Kerja Profesional, dan Prinsip Muamalah Halal',
    'Peserta didik dapat menganalisis ayat tentang berlomba dalam kebaikan serta prinsip kejujuran, transparansi akad, dan larangan riba/penipuan dalam transaksi keuangan maupun kewirausahaan.',
    'Hubungkan semangat etos kerja pelajar dengan prinsip syariah bebas gharar dan transaksi digital masa kini.',
    'Menginternalisasi integritas kerja unggul serta etika muamalah adil bebas eksploitasi.',
    ['Akhlak & kejujuran SMP'],
    ['Identifikasi akad jual beli/kerja sama sah vs praktik menipu/riba pada transaksi daring tepat'],
    '1 (Ganjil)', 'penerapan',
    { suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  s(
    'pai-fe-s2-berpikir-kritis-toleransi-iptek', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Integrasi Nilai & IPTEK',
    'Berpikir Kritis (Ulil Albab) dalam Pengembangan IPTEK, Pelestarian Alam, dan Harmoni Kebangsaan',
    'Peserta didik dapat menelaah tanggung jawab manusia sebagai khalifah pelestari bumi (krisis iklim & limbah) serta peran toleransi moderat dalam menjaga persatuan bangsa majemuk.',
    'Kaitkan QS. Ali Imran: 190–191 tentang penciptaan alam dengan etika lingkungan dan penelitian ilmiah bertanggung jawab.',
    'Mengintegrasikan semangat keilmuan kritis, kepedulian ekologis, dan ukhuwah kebangsaan.',
    ['Sejarah sains Islam & kompetisi kebaikan'],
    ['Esai atau kajian kasus menghubungkan dalil etika lingkungan/iptek dengan solusi nyata pelajar'],
    '2 (Genap)', 'pendalaman',
    { prasyaratTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], relatedTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], suggestedGrade: '11', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),

  // Mapel Madrasah Kemenag (Fikih, Al-Qur'an Hadis, Akidah Akhlak, SKI, Bahasa Arab) — MI (B/C), MTs (D), MA (E/F)
  // FIKIH
  s(
    'fikih-mts-s1-thaharah-shalat-zakat', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Ibadah',
    'Thaharah (Najis–Hadas), Ketentuan Shalat Berjamaah–Jamak–Qashar, dan Hikmah Zakat Fitrah–Mal',
    'Peserta didik dapat membedakan hadas kecil vs besar beserta cara menyucikannya, menentukan syarat shalat safar, serta menghitung nisab/kadar zakat fitrah dan profesi/hasil usaha.',
    'Latih penghitungan 2,5% zakat mal pada harta mencapai nisab dan haul secara akurat.',
    'Mempraktikkan ibadah harian sesuai fiqih rukhsah serta menunaikan kewajiban zakat sosial tepat.',
    ['Wudhu & shalat dasar MI'],
    ['Klasifikasi jenis najis tepat dan hitungan besaran zakat mal/fitrah akurat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'fikih-mts-s2-muamalah-halal-haram', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Muamalah & Konsumsi',
    'Makanan–Minuman Halal Thayyib, Penyembelihan–Kurban, serta Jual Beli Sah, Khiyar, dan Larangan Riba',
    'Peserta didik dapat mengevaluasi keabsahan rukun jual beli modern (termasuk transaksi COD/marketplace), hak khiyar pembatalan adil, serta membedakan akad kerja sama dari riba/gharar.',
    'Gunakan studi kasus jual beli tidak transparan atau denda bunga keterlambatan untuk mengidentifikasi unsur gharar dan riba.',
    'Menerapkan prinsip kehalalan konsumsi dan keadilan akad dalam transaksi ekonomi kontemporer.',
    ['Zakat & muamalah sosial Sem 1'],
    ['Identifikasi rukun jual beli dan pembeda riba fadhl/nasiah vs margin jual beli sah tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['fikih-mts-s1-thaharah-shalat-zakat'], relatedTopicIds: ['fikih-mts-s1-thaharah-shalat-zakat'], suggestedGrade: '9', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'fikih-ma-s1-ushul-fikih-maqashid', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Ushul Fikih & Sumber Hukum',
    'Sumber Hukum Islam (Al-Qur’an, Sunnah, Ijma’, Qiyas) dan Maqashid Syariah Lima Kemaslahatan',
    'Peserta didik dapat menjelaskan hierarki sumber hukum Islam, alur analogi hukum (Qiyas: ashl, far’, hukm, illat), serta tujuan Maqashid Syariah menjaga agama, jiwa, akal, keturunan, dan harta.',
    'Terapkan latihan illat qiyas pada persoalan kontemporer seperti larangan zat adiktif baru atau etika privasi data.',
    'Menganalisis dasar istinbath hukum Islam untuk menjawab persoalan baru tanpa kehilangan tujuan maslahat.',
    ['Fikih ibadah & muamalah MTs'],
    ['Komponen 4 rukun Qiyas pada kasus hukum baru dianalisis tepat dan selaras Maqashid Syariah'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'fikih-ma-s2-siyasah-jinayah-mawaris', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Fikih Munakahat, Mawaris & Jinayah',
    'Ketentuan Pembagian Waris (Faraid), Etika Keluarga (Munakahat), dan Prinsip Keadilan Hukum Islam',
    'Peserta didik dapat menghitung bagian ahli waris pokok (dzawil furudh 1/2, 1/4, 1/8, 2/3, 1/3) dalam kasus sederhana serta menjelaskan prinsip perlindungan keluarga dan keadilan pidana.',
    'Gunakan bagan silsilah dan KPK penyebut dalam membagi harta peninggalan setelah melunasi biaya jenazah, utang, dan wasiat.',
    'Menghitung hak waris secara adil-proporsional dan memahami hikmah ketentuan keluarga/hukum Islam.',
    ['Ushul fikih & pecahan matematika'],
    ['Urutan kewajiban sebelum pembagian waris diikuti dan bagian furudh terhitung tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['fikih-ma-s1-ushul-fikih-maqashid'], relatedTopicIds: ['fikih-ma-s1-ushul-fikih-maqashid'], suggestedGrade: '12', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),

  // AL-QUR'AN HADIS
  s(
    'qhadis-mts-s1-tajwid-ilmu', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Ilmu Tajwid & Pemahaman Ayat',
    'Hukum Bacaan Nun Sukun/Tanwin, Mim Sukun, dan Mad Far’i serta Ayat–Hadis tentang Kejujuran–Ilmu',
    'Peserta didik dapat membedakan hukum bacaan Izhar, Idgham, Iqlab, Ikhfa dan ragam Mad saat tilawah serta mengaitkan isi hadis amanah–kejujuran ke kebiasaan belajar.',
    'Latih identifikasi huruf tajwid langsung pada potongan ayat surah pilihan beserta praktik makhraj.',
    'Membaca Al-Qur’an sesuai kaidah tajwid dan meneladani kandungan ayat tentang kejujuran.',
    ['Kelancaran membaca Al-Qur’an dasar'],
    ['Klasifikasi hukum nun mati/tanwin & mad pada ayat uji akurat ≥ 80%'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'qhadis-mts-s2-hadis-sosial-lingkungan', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Kandungan Ayat & Hadis Sosial',
    'Gharib Bacaan Tilawah serta Ayat–Hadis tentang Tolong-Menolong (Ta’awun), Kebersihan, & Kelestarian Alam',
    'Peserta didik dapat mempraktikkan bacaan khusus (Imalah, Isymam, Saktah ringkas) serta menganalisis tanggung jawab menjaga kelestarian alam dan solidaritas terhadap yatim–dhuafa.',
    'Kaitkan pesan larangan berbuat kerusakan di bumi dengan aksi pengurangan sampah dan kepedulian sosial sekolah.',
    'Mengimplementasikan nilai sosial-ekologis Al-Qur’an dan Hadis dalam aksi peduli lingkungan.',
    ['Tajwid dasar Sem 1'],
    ['Membedakan contoh bacaan gharib tepat dan merumuskan pesan ta’awun lingkungan berbasis dalil'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['qhadis-mts-s1-tajwid-ilmu'], relatedTopicIds: ['qhadis-mts-s1-tajwid-ilmu'], suggestedGrade: '9', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'qhadis-ma-s1-ulumul-quran-hadis', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase E', 'Ulumul Qur’an & Ulumul Hadis',
    'Asbabun Nuzul, Sejarah Kodifikasi Al-Qur’an, serta Klasifikasi Kualitas Hadis (Shahih, Hasan, Dhaif)',
    'Peserta didik dapat menjelaskan syarat kesahihan sanad dan matan hadis serta manfaat memahami Asbabun Nuzul agar tidak menafsirkan ayat secara terputus dari konteksnya.',
    'Tekankan pentingnya mengecek sanad (rantai perawi) sebagai inspirasi literasi verifikasi sumber pada era informasi digital.',
    'Menilai autentisitas riwayat dan menerapkan prinsip kontekstualisasi ayat secara berhati-hati.',
    ['Tajwid & tafsir ringkas MTs'],
    ['Lima syarat hadis shahih teridentifikasi dan pentingnya Asbabun Nuzul dijelaskan dengan contoh ayat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '10', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'qhadis-ma-s2-tafsir-tematik-kemanusiaan', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Tafsir Tematik Kontemporer',
    'Kajian Ayat–Hadis Tematik: Demokrasi Musyawarah, Etos Ilmu–Kerja, & Toleransi Kemanusiaan',
    'Peserta didik dapat menganalisis keterkaitan lintas ayat dan hadis mengenai tanggung jawab pemimpin bermusyawarah, etos kerja profesional, dan penghormatan kemanusiaan.',
    'Latih membandingkan kandungan tematik ayat Al-Qur’an dan hadis sahih tanpa mengklaim tafsir mutlak sepihak.',
    'Menghubungkan ajaran tekstual Al-Qur’an–Hadis dengan etika sosial kewargaan modern.',
    ['Ulumul Qur’an & Hadis Sem 1'],
    ['Sintesis ayat–hadis tematik menyajikan dalil tepat lengkap dengan penerapan kontekstual Indonesia'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['qhadis-ma-s1-ulumul-quran-hadis'], relatedTopicIds: ['qhadis-ma-s1-ulumul-quran-hadis'], suggestedGrade: '11', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),

  // AKIDAH AKHLAK
  s(
    'akidah-mts-s1-asmaul-mahmudah', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Akidah & Akhlak Mahmudah',
    'Akidah Islam, Makna Asmaul Husna, dan Pembiasaan Akhlak Terpuji (Husnuzhan, Tawadhu, Tasamuh)',
    'Peserta didik dapat mengaitkan iman kepada Allah dan kitab/rasul dengan sikap rendah hati, berbaik sangka, serta bertoleransi terhadap sesama pelajar dan warga.',
    'Kontraskan tawadhu vs minder serta tasamuh sosial vs mencampuradukkan prinsip akidah.',
    'Membangun fondasi keimanan kokoh yang tercermin pada akhlak santun dan terbuka.',
    ['Akhlak dasar MI'],
    ['Membedakan contoh perilaku husnuzhan, tawadhu, dan tasamuh dalam kehidupan remaja dengan benar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'akidah-mts-s2-adab-keteladanan', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Adab & Menghindari Akhlak Tercela',
    'Menghindari Ghibah, Hasad, & Namimah serta Adab Bergaul dengan Orang Tua, Guru, dan Media Sosial',
    'Peserta didik dapat menganalisis akar psikologis penyakit hati (hasad, riya, fitnah) dan menerapkan adab hormat orang tua–guru sekaligus etika bermedia sosial tanpa menyakiti sesama.',
    'Berikan latihan skenario pengendalian emosi dan penolakan ajakan menggosip atau perundungan di grup percakapan.',
    'Melatih pengendalian diri dari penyakit hati dan membiasakan adab pergaulan luring maupun daring.',
    ['Asmaul Husna & Akhlak Mahmudah Sem 1'],
    ['Identifikasi perbedaan hasad/ghibah/namimah tepat beserta strategi penghindarannya di ruang digital'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['akidah-mts-s1-asmaul-mahmudah'], relatedTopicIds: ['akidah-mts-s1-asmaul-mahmudah'], suggestedGrade: '9', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'akidah-ma-s1-kalam-mazhab-tasawuf', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase E', 'Ilmu Kalam & Pemurnian Hati',
    'Pengantar Ilmu Kalam (Asy’ariyah–Maturidiyah–Mu’tazilah), Akidah Moderat, dan Tasawuf Amali (Tazkiyatun Nafs)',
    'Peserta didik dapat memahami perbedaan pendekatan akal–wahyu dalam aliran teologi Islam klasik secara objektif serta menerapkan pengendalian hawa nafsu dalam tasawuf positif.',
    'Tekankan tasawuf modern mendorong keterlibatan sosial aktif dan kebersihan niat kerja, bukan pengasingan diri dari tanggung jawab dunia.',
    'Memahami khazanah pemikiran teologi Islam secara moderat dan membina kecerdasan spiritual pelajar.',
    ['Akidah & akhlak MTs'],
    ['Perbandingan pokok pemikiran teologi dijelaskan netral; penerapan nilai tazkiyatun nafs realistis'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'akidah-ma-s2-akhlak-pergaulan-remaja-publik', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Etika Sosial & Profesi',
    'Etika Pergaulan Remaja, Anti-Korupsi, Kepedulian Sosial, dan Akhlak Profesi di Era Digital',
    'Peserta didik dapat menerapkan nilai keadilan, kejujuran anti-suap, dan penghormatan etika pergaulan dalam menghadapi tekanan sosial dewasa muda dan dunia kerja.',
    'Kaitkan etika tanggung jawab amanah dengan tantangan integritas akademik dan profesional pasca-MA.',
    'Mengintegrasikan kesadaran spiritual-moral menjadi kompas etis menghadapi kehidupan publik dan profesi.',
    ['Ilmu kalam & tasawuf amali'],
    ['Analisis dilema etis remaja/kerja menyertakan alasan moral amanah dan pencegahan perilaku koruptif'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['akidah-ma-s1-kalam-mazhab-tasawuf'], relatedTopicIds: ['akidah-ma-s1-kalam-mazhab-tasawuf'], suggestedGrade: '12', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),

  // SKI
  s(
    'ski-mts-s1-makkah-madinah-klasik', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Peradaban Islam Klasik',
    'Dakwah Rasulullah Periode Makkah–Madinah, Piagam Madinah, hingga Kemajuan Ilmu Pengetahuan Abbasiyah',
    'Peserta didik dapat menganalisis strategi pembinaan masyarakat majemuk Madinah melalui Piagam Madinah dan menelusuri faktor kemajuan ilmuwan Islam pada masa Abbasiyah.',
    'Soroti prinsip kebebasan beragama dan solidaritas warga dalam Piagam Madinah serta tradisi penerjemahan ilmu di Baghdad.',
    'Menelaah strategi pembinaan sosial-konstitusional damai dan budaya literasi ilmiah dalam sejarah Islam.',
    ['Sejarah nabi dasar MI'],
    ['Poin kunci Piagam Madinah dan kontribusi ilmuwan klasik (Ibnu Sina, Al-Khawarizmi, Al-Zahrawi) tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'ski-mts-s2-islam-nusantara-walisongo', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Islam di Nusantara',
    'Jalur Masuknya Islam di Nusantara, Kesultanan Lokal, dan Metode Dakwah Kultural Wali Songo',
    'Peserta didik dapat membandingkan pendekatan dakwah kultural Wali Songo lewat seni, pesantren, dan niaga dengan karakter masyarakat Nusantara sehingga Islam diterima luas secara damai.',
    'Contoh akulturasi menara Kudus, tembang macapat, dan peran pesantren sebagai pusat pendidikan kerakyatan.',
    'Memahami akar harmonis Islam Nusantara dalam merawat kekayaan tradisi lokal.',
    ['Peradaban awal Sem 1'],
    ['Bukti akulturasi budaya Nusantara dan strategi dakwah tiap tokoh Wali Songo diuraikan akurat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ski-mts-s1-makkah-madinah-klasik'], relatedTopicIds: ['ski-mts-s1-makkah-madinah-klasik'], suggestedGrade: '9', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'ski-ma-s1-daulah-tiga-kerajaan', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase E', 'Peradaban Islam Dunia',
    'Kemajuan & Kemunduran Tiga Kerajaan Besar (Usmani, Safawi, Mughal) serta Kontak Ilmu dengan Eropa',
    'Peserta didik dapat menganalisis arsitektur, tata kelola multietnis, dan perkembangan militer-administrasi tiga kesultanan besar Islam serta sebab internal kemundurannya.',
    'Tekankan pentingnya menjaga pembaruan ilmu pengetahuan dan tata kelola pemerintahan bebas intrik untuk kelangsungan peradaban.',
    'Mengambil pelajaran sejarah dari naik-turunnya kekuasaan besar Islam di dunia.',
    ['Peradaban klasik & Abbasiyah MTs'],
    ['Perbandingan faktor kemajuan dan sebab kemunduran Usmani, Safawi, Mughal terpetakan jelas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'ski-ma-s2-pembaruan-organisasi-kebangsaan', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Pembaruan & Kebangsaan',
    'Gerakan Pembaruan Islam Modern, Organisasi Sosial–Pendidikan (NU, Muhammadiyah, dll.), & Kebangsaan Indonesia',
    'Peserta didik dapat melacak gagasan pembaruan pendidikan dan keagamaan dari dunia Islam hingga lahirnya ormas Islam di Indonesia yang memperkokoh perjuangan kemerdekaan NKRI.',
    'Soroti kontribusi madrasah, sekolah modern, rumah sakit rakyat, serta Resolusi Jihad dan peran tokoh Islam merumuskan dasar negara.',
    'Menganalisis sinergi keislaman dan kebangsaan dalam membangun kemerdekaan dan peradaban Indonesia modern.',
    ['Islam Nusantara & 3 Kerajaan Besar'],
    ['Keterkaitan gerakan pembaruan pendidikan dengan kebangkitan nasional dan integrasi NKRI diuraikan tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['ski-ma-s1-daulah-tiga-kerajaan'], relatedTopicIds: ['ski-ma-s1-daulah-tiga-kerajaan'], suggestedGrade: '12', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),

  // BAHASA ARAB (MI/MTs/MA)
  s(
    'arab-mts-s1-taaruf-yaumiyyat', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Istima’ & Kalam',
    'At-Ta’aruf (Perkenalan), Perlengkapan Sekolah (Isim Isyarah هذا/هذه), dan Al-Yaumiyyat (Aktivitas Harian)',
    'Peserta didik dapat memperkenalkan identitas diri serta benda kelas dalam bahasa Arab sederhana dan menyusun 3 kalimat aktivitas harian memakai awalan fi’il mudhari’ yang sesuai pelaku.',
    'Latih membedakan mudzakkar–muannats (هذا/هذه), dhamir muttashil kepemilikan, serta awalan أ/ت/ي pada kata kerja harian.',
    'Menggunakan ungkapan perkenalan dan rutinitas harian berpola isim isyarah dan fi’il mudhari’ tepat.',
    ['Membaca huruf hijaiyah berharakat lengkap'],
    ['Kesesuaian jenis kata mudzakkar/muannats serta awalan fi’il pelaku tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'arab-mts-s2-tarkib-kalimat-tempat', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Qira’ah & Tarkib',
    'Lingkungan Sekolah–Rumah (Harf Jar & Dzaraf Tempat) serta Klasifikasi Kalimat Isim–Fi’il–Harf & Na’at',
    'Peserta didik dapat membaca teks pendek letak ruangan (أمام، وراء، في، على) dengan harakat akhir kasrah setelah harf jar serta memilah kata menjadi kelompok Isim, Fi’il, dan Harf.',
    'Ajarkan ciri pembeda isim (ال/tanwin), fi’il (terikat waktu), dan harf beserta kesesuaian sifat–benda (Na’at–Man’ut).',
    'Menafsirkan teks bacaan deskriptif berharakat dan mengenali struktur tata bahasa Arab dasar.',
    ['Kosakata benda sekolah & perkenalan Sem 1'],
    ['Letak ruangan sesuai teks denah dan pemilahan kategori Isim/Fi’il/Harf akurat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['arab-mts-s1-taaruf-yaumiyyat'], relatedTopicIds: ['arab-mts-s1-taaruf-yaumiyyat'], suggestedGrade: '8', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'arab-ma-s1-jumlah-fiiliyyah-wacana', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase E', 'Qira’ah & Tarkib Lanjutan',
    'Teks Wacana Tematik Sosial–Pendidikan dengan Pola Jumlah Ismiyyah–Fi’liyyah dan Fi’il Madhi–Mudhari’',
    'Peserta didik dapat menelaah informasi utama dan tersirat dari paragraf bahasa Arab berharakat minimal serta membedakan fungsi pelaku (fa’il) dan objek (maf’ul bih).',
    'Tekankan perubahan harakat akhir rafa’/nashab sederhana dan konversi bentuk lampau (madhi) ke kini/mendatang (mudhari’).',
    'Memahami wacana fungsional dan gramatika perubahan bentuk kata kerja Arab.',
    ['Klasifikasi Isim–Fi’il–Harf MTs'],
    ['Identifikasi pelaku–objek dalam jumlah fi’liyyah tepat dan jawaban bacaan sesuai teks'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),
  s(
    'arab-ma-s2-insya-komposisi-pidato', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Kitabah & Kalam Lanjutan',
    'Menulis Paragraf Terstruktur (Insya’ Muwajjah) Bertema Peradaban/Teknologi dan Presentasi Lisan',
    'Peserta didik dapat menyusun karangan pendek berbahasa Arab berstruktur pembuka–isi–penutup memakai tarkib idhafah dan na’at secara konsisten serta menyampaikannya lisan.',
    'Latih teknik penyuntingan kesalahan kesesuaian jumlah dan jenis kata (adad–ma’dud dan mudzakkar–muannats) sebelum presentasi.',
    'Memproduksi teks eksposisi sederhana serta presentasi lisan berbahasa Arab secara komunikatif.',
    ['Jumlah ismiyyah–fi’liyyah Sem 1'],
    ['Karangan minimal 2 paragraf koheren bebas salah idhafah/harakat kasus pokok'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['arab-ma-s1-jumlah-fiiliyyah-wacana'], relatedTopicIds: ['arab-ma-s1-jumlah-fiiliyyah-wacana'], suggestedGrade: '11', sumberDokumen: KMA_MADRASAH_DOC, tahunVersi: '2025/2026' }
  ),

  // =====================================================================
  // 10. SENI MUSIK (Section 6 — Panduan Mapel Seni Musik Revisi 3, 13 Sep 2025)
  // =====================================================================
  // Fase A (SD 1-2) — 3 Sem 1 + 3 Sem 2 terkurasi merujuk Panduan Seni Musik hlm. 11, 17–25
  s(
    'musik-fa-s1-kenal-bunyi-ketukan', 'Seni Musik', 'SD/MI', 'Fase A', 'Mengalami',
    'Mengenali Sumber Bunyi Alam/Sekitar, Tinggi–Rendah Nada (Do–Sol), dan Ketukan Pulsa Stabil Sederhana',
    'Peserta didik dapat menyimak dan membedakan bunyi alam maupun alat musik (tinggi–rendah nada solmisasi do sampai sol), keras–lembut (dinamika), dan bertepuk tangan mengikuti pulsa ketukan teratur.',
    'Merujuk Panduan Seni Musik (hlm. 19–20): gunakan pendekatan play-based learning memakai suara sekitar (lonceng/drum, gelas air) serta solmisasi naik-turun do sampai sol.',
    'Mengalami unsur bunyi pokok (tinggi–rendah nada dan irama panjang–pendek) melalui gerak, suara, dan lagu anak.',
    ['Mendengarkan lagu anak dan bunyi lingkungan sekitar'],
    ['Tepukan mengikuti ketukan pulsa tetap dan membedakan nada tinggi vs rendah secara tepat'],
    '1 (Ganjil)', 'pengenalan',
    {
      suggestedGrade: '1',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Mengalami (CP hlm. 11, Materi Esensial hlm. 17, 19–20)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fa-s1-pola-irama-nada-instrumen', 'Seni Musik', 'SD/MI', 'Fase A', 'Berpikir dan Bekerja Artistik',
    'Menirukan Pola Irama (Nilai Nada Utuh, Setengah, Seperempat) dan Nada Do–Re–Mi dengan Alat Musik Sederhana',
    'Peserta didik dapat menirukan pola irama nilai nada utuh, setengah, dan seperempat serta menirukan rangkaian nada do–re–mi secara berurutan maupun acak memakai alat ritmis/melodis sederhana.',
    'Merujuk Panduan Seni Musik (hlm. 21–22): latih kepekaan imitasi pola irama bertahap sebelum memadukan nada dengan tepukan, marakas, atau pianika.',
    'Menirukan pola irama dan tinggi–rendah nada menggunakan alat musik ritmis/melodis sederhana.',
    ['Pengenalan nada tinggi–rendah dan pulsa ketukan'],
    ['Ketepatan menirukan kombinasi nilai nada dan menebak bunyi do–re–mi secara konsisten'],
    '1 (Ganjil)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fa-s1-kenal-bunyi-ketukan'],
      relatedTopicIds: ['musik-fa-s1-kenal-bunyi-ketukan'],
      suggestedGrade: '1',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Berpikir dan Bekerja Artistik (CP hlm. 11, hlm. 21–22)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fa-s1-ragam-alat-musik-kebersihan', 'Seni Musik', 'SD/MI', 'Fase A', 'Berpikir dan Bekerja Artistik',
    'Mengenali Ragam Alat Musik & Karakter Bunyinya serta Praktik Memainkan dan Membersihkan Alat Musik',
    'Peserta didik dapat menyebutkan jenis alat musik sederhana berdasarkan cara bunyi (dipukul, ditiup, dipetik, digesek), memainkannya secara aman dalam rentang do–sol, serta membersihkan dan menyimpannya kembali.',
    'Merujuk Panduan Seni Musik (hlm. 22–23): biasakan tanggung jawab menjaga kebersihan alat musik sekolah (pianika, rekorder, marakas/snare) setiap selesai berlatih.',
    'Mengenali ragam sumber bunyi instrumen sekaligus membiasakan etika memainkan dan membersihkan alat musik.',
    ['Menirukan pola irama & nada dasar'],
    ['Menyebut nama alat musik dan cara bunyinya dengan benar serta mempraktikkan langkah membersihkan alat musik'],
    '1 (Ganjil)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fa-s1-pola-irama-nada-instrumen'],
      relatedTopicIds: ['musik-fa-s1-pola-irama-nada-instrumen'],
      suggestedGrade: '2',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Berpikir & Bekerja Artistik (CP hlm. 11, hlm. 22–23)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fa-s2-pola-irama-ekspresi', 'Seni Musik', 'SD/MI', 'Fase A', 'Menciptakan',
    'Membuat Pola Irama Sederhana dengan Anggota Tubuh (Call & Response) serta Benda Sekitar',
    'Peserta didik dapat menyusun pola irama 4 ketukan menggunakan tepuk tangan, hentakan kaki, jentikan jari, atau perkusi sederhana lingkungan melalui permainan musikal call and response.',
    'Merujuk Panduan Seni Musik (hlm. 23–24): beralih dari sekadar meniru pola guru di Semester 1 menjadi merangkai pola balasan (response) ciptaan murid sendiri.',
    'Menciptakan pola irama sederhana menggunakan anggota tubuh maupun alat ritmis sekitar dengan tempo stabil.',
    ['Menirukan pola irama dan mengenali alat musik Sem 1'],
    ['Siswa membuat pola ritmis call-and-response orisinal 4 ketukan menggunakan tepuk/hentak secara teratur'],
    '2 (Genap)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fa-s1-kenal-bunyi-ketukan', 'musik-fa-s1-pola-irama-nada-instrumen'],
      relatedTopicIds: ['musik-fa-s1-kenal-bunyi-ketukan'],
      spiralRelation: {
        previousTopicId: 'musik-fa-s1-kenal-bunyi-ketukan',
        previousTopicTitle: 'Mengenali Sumber Bunyi Alam/Sekitar, Tinggi–Rendah Nada (Do–Sol), dan Ketukan Pulsa Stabil Sederhana',
        reactivatedConcept: 'Kesadaran pulsa ketukan teratur dan perbedaan bunyi panjang–pendek',
        newCompetency: 'Menciptakan urutan pola irama baru secara mandiri menggunakan anggota tubuh (tepuk–hentak–jentik) pada permainan call and response',
        depthDifference: 'Meningkat dari menyimak dan menirukan pulsa guru menjadi merangkai pola ritmis sendiri tanpa meniru persis',
        newContextOrApplication: 'Interaksi musikal tanya–jawab (call and response) berpasangan atau berkelompok memakai perkusi tubuh',
        pedagogicalReason: 'Panduan Seni Musik Fase A (hlm. 23–24) mengarahkan murid menirukan pola ritmik dahulu sebelum berkreasi menyusun pola irama baru.',
      },
      suggestedGrade: '2',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Menciptakan (CP hlm. 11, Materi Esensial hlm. 18, 23–24)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fa-s2-praktik-bermain-umpan-balik', 'Seni Musik', 'SD/MI', 'Fase A', 'Merefleksikan',
    'Praktik Bermain Musik Lagu Anak Sederhana dan Memberikan Umpan Balik dengan Bahasa Sehari-hari',
    'Peserta didik dapat memainkan lagu anak sederhana (seperti Balonku atau Pelangi) secara berkelompok dengan alat musik sederhana serta memberi tanggapan apresiatif atas penampilan diri/teman.',
    'Merujuk Panduan Seni Musik (hlm. 20–21): bimbing siswa usia kelas 1–2 mengungkapkan kesan dan apresiasi memakai bahasa sehari-hari yang santun, bukan istilah teknis rumit.',
    'Melatih koordinasi gerak–musik sederhana sekaligus membiasakan umpan balik santun terhadap praktik bermusik.',
    ['Ragam alat musik & pola irama Sem 1'],
    ['Menyanyikan/mengiringi lagu anak kelompok dan memberi tanggapan lisan santun tentang penampilan teman'],
    '2 (Genap)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fa-s1-ragam-alat-musik-kebersihan'],
      relatedTopicIds: ['musik-fa-s1-ragam-alat-musik-kebersihan'],
      suggestedGrade: '2',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Merefleksikan (CP hlm. 11, hlm. 20–21)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fa-s2-ekspresi-senang-bermusik', 'Seni Musik', 'SD/MI', 'Fase A', 'Berdampak',
    'Menunjukkan Ekspresi Senang, Keberanian Tampil, dan Kolaborasi dalam Kegiatan Bermusik',
    'Peserta didik dapat memilih lagu anak atau alat musik sederhana yang disukai untuk tampil penuh ekspresi senang, bernyanyi lantang, dan bekerja sama dalam perayaan musik kelas.',
    'Merujuk Panduan Seni Musik (hlm. 24–25): ciptakan iklim kelas yang rekreatif dan aman sehingga murid berani berekspresi dan merasakan kegembiraan bermusik.',
    'Menumbuhkan ekspresi positif, rasa percaya diri tampil, dan antusiasme berkolaborasi lewat musik.',
    ['Pola irama & praktik bermain musik Sem 2'],
    ['Observasi menunjukkan keterlibatan antusias, keberanian bernyanyi/bermain musik, dan sikap menghargai teman'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-fa-s2-pola-irama-ekspresi', 'musik-fa-s2-praktik-bermain-umpan-balik'],
      relatedTopicIds: ['musik-fa-s2-praktik-bermain-umpan-balik'],
      suggestedGrade: '2',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase A — Elemen Berdampak (CP hlm. 11, hlm. 24–25)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // Fase B (SD 3-4) — 3 Sem 1 + 3 Sem 2 terkurasi merujuk Panduan Seni Musik hlm. 11–12, 17–18, 25–35, 101–102, 112–125
  s(
    'musik-fb-s1-notasi-ritmis-melodis-dasar', 'Seni Musik', 'SD/MI', 'Fase B', 'Mengalami & Berpikir Artistik',
    'Mengenali & Menirukan Nada (Do–Sol) serta Pola Irama Nilai Nada Utuh s.d. Seperdelapan (2 Birama)',
    'Peserta didik dapat mengenali nada tangga nada diatonis serta nilai ketukan notasi utuh, setengah, seperempat, dan seperdelapan melalui gerakan tangan/solmisasi dan membaca melodi 2 birama sederhana.',
    'Merujuk Panduan Seni Musik (hlm. 25–28, ATP Kelas III no. 1–2 hlm. 101): gunakan lagu akrab seperti Ibu Kita Kartini atau Naik Delman sebelum menirukan melodi memakai pianika/belira.',
    'Mengembangkan kepekaan membedakan tinggi–rendah nada dan panjang–pendek pola irama secara terukur.',
    ['Pulsa ketukan dan lagu anak Fase A'],
    ['Membaca dan menepuk pola ritme 2 birama tepat serta menirukan solmisasi do sampai sol selaras'],
    '1 (Ganjil)', 'pengenalan',
    {
      suggestedGrade: '3',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Mengalami (CP hlm. 11, Materi hlm. 25–28, ATP hlm. 101)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fb-s1-karakteristik-alat-musik-bunyi', 'Seni Musik', 'SD/MI', 'Fase B', 'Berpikir dan Bekerja Artistik',
    'Karakteristik Ragam Alat Musik (Ritmis, Melodis, Harmonis) dan Sumber Penghasil Bunyinya',
    'Peserta didik dapat membedakan karakteristik bunyi alat musik ritmis, melodis, dan harmonis sederhana (seperti tamborin, angklung, pianika, belira) serta menjelaskan cara memainkannya.',
    'Merujuk Panduan Seni Musik (hlm. 28–30, ATP Kelas III no. 3 hlm. 101): kaitkan cara alat musik menghasilkan bunyi dengan getaran bahan serta fungsinya dalam lagu.',
    'Mengidentifikasi jenis alat musik, asal bunyi, dan peran ritmis vs melodis dalam permainan musik.',
    ['Pengenalan nada dan pola irama'],
    ['Menyebutkan jenis alat musik, membedakan fungsi ritmis/melodis, dan mendemonstrasikan bunyinya'],
    '1 (Ganjil)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar'],
      relatedTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar'],
      suggestedGrade: '3',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Berpikir & Bekerja Artistik (CP hlm. 11, hlm. 28–30, ATP hlm. 101)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fb-s1-teknik-main-merawat-instrumen', 'Seni Musik', 'SD/MI', 'Fase B', 'Berpikir dan Bekerja Artistik',
    'Teknik Posisi Tangan–Kontrol Tekanan Memainkan Alat Musik serta Prosedur Merawat dan Menyimpan Instrumen',
    'Peserta didik dapat mempraktikkan posisi tangan dan embouchure/ketukan dasar pada alat musik kelas (pianika/angklung/tamborin) lalu melakukan perawatan serta penyimpanan aman sesuai jenis alat.',
    'Merujuk Panduan Seni Musik (hlm. 30–32, ATP Kelas III no. 4 & Kelas IV no. 5 hlm. 101–102): bedakan antara "membersihkan" di Fase A menjadi pemahaman "cara memainkan dan merawat" alat musik milik bersama.',
    'Membangun koordinasi teknik dasar bermain instrumen sekaligus disiplin merawat perlengkapan musik sekolah.',
    ['Karakteristik ragam alat musik'],
    ['Praktik memainkan melodi/ritme pendek dengan teknik benar dan memperagakan langkah perawatan dengan kain kering'],
    '1 (Ganjil)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fb-s1-karakteristik-alat-musik-bunyi'],
      relatedTopicIds: ['musik-fb-s1-karakteristik-alat-musik-bunyi'],
      suggestedGrade: '4',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Berpikir & Bekerja Artistik (hlm. 30–32, ATP hlm. 101–102)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fb-s2-istilah-musik-umpan-balik', 'Seni Musik', 'SD/MI', 'Fase B', 'Merefleksikan',
    'Istilah Musik Dasar (Tempo Largo–Allegro & Dinamika Pianissimo–Forte) untuk Umpan Balik Bermusik',
    'Peserta didik dapat menggunakan istilah musik dasar (melodi, ritme, tempo cepat/lambat seperti largo–allegro, dinamika piano–forte) saat memberikan ulasan atas penampilan sendiri dan teman.',
    'Merujuk Panduan Seni Musik (hlm. 26–27, ATP Kelas IV no. 6 hlm. 102): tingkatkan refleksi dari bahasa sehari-hari (Fase A) menjadi menggunakan istilah musik yang tepat.',
    'Menginterpretasikan variasi tempo dan dinamika lagu serta menggunakannya sebagai bahasa umpan balik artistik.',
    ['Nada, pola irama, dan alat musik Sem 1'],
    ['Memberikan ulasan penampilan musik teman dengan menyebut minimal 2 istilah tempo/dinamika secara tepat'],
    '2 (Genap)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar'],
      relatedTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar'],
      suggestedGrade: '4',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Merefleksikan (CP hlm. 11, hlm. 26–27, ATP hlm. 102)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fb-s2-kreasi-bunyi-tubuh-instrumen', 'Seni Musik', 'SD/MI', 'Fase B', 'Menciptakan',
    'Membuat Bunyi dan Pola Irama Kreatif dengan Anggota Tubuh (Body Percussion) & Alat Ritmis–Melodis Sekitar',
    'Peserta didik dapat menciptakan kombinasi bunyi berpola ritmis menggunakan anggota tubuh (tepuk, hentak, bersiul) bersama alat musik ritmis/melodis sekitar berdasarkan eksperimen sumber bunyi.',
    'Merujuk Panduan Seni Musik (hlm. 32–33, ATP Kelas IV no. 7 hlm. 102, Modul hlm. 116–118): padukan permainan body percussion lagu anak dengan eksplorasi benda penghasil nada di sekitar kelas.',
    'Mengeksplorasi variasi sumber bunyi tubuh dan benda sekitar menjadi kreasi pola ritmik–melodis terstruktur.',
    ['Pola irama & teknik dasar instrumen Sem 1'],
    ['Menyajikan kreasi pola ritmis tubuh + alat musik sekitar dalam kelompok kecil secara teratur'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-fb-s1-teknik-main-merawat-instrumen'],
      relatedTopicIds: ['musik-fb-s1-teknik-main-merawat-instrumen'],
      suggestedGrade: '4',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Menciptakan (CP hlm. 11, hlm. 32–33, ATP hlm. 102, Modul hlm. 116–118)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fb-s2-penyajian-ansambel-daerah', 'Seni Musik', 'SD/MI', 'Fase B', 'Berpikir Artistik & Berdampak',
    'Menyajikan Lagu Daerah dalam Kelompok Musik & Menumbuhkan Minat Bermusik yang Positif',
    'Peserta didik dapat bekerja sama menyajikan lagu daerah sederhana (misalnya Suwe Ora Jamu atau Gundhul-Gundhul Pacul) menggunakan vokal, anggota tubuh, atau alat musik kelas serta merefleksikan minat bermusik pribadi.',
    'Merujuk Panduan Seni Musik (hlm. 34–35, ATP Kelas IV no. 8 hlm. 102, Modul hlm. 118–126): terapkan pembacaan melodi & pola irama Sem 1 ke unjuk kerja ansambel lagu daerah dilengkapi jurnal minat dan refleksi kesehatan suara.',
    'Menerapkan keterampilan bermusik dalam sajian lagu daerah kolaboratif sekaligus menumbuhkan minat berkelanjutan.',
    ['Membaca melodi 2 birama & istilah musik'],
    ['Penyajian kelompok sinkron awal–akhir disertai catatan refleksi minat bermusik dan evaluasi istilah musik'],
    '2 (Genap)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar', 'musik-fb-s2-istilah-musik-umpan-balik'],
      relatedTopicIds: ['musik-fb-s1-notasi-ritmis-melodis-dasar'],
      spiralRelation: {
        previousTopicId: 'musik-fb-s1-notasi-ritmis-melodis-dasar',
        previousTopicTitle: 'Mengenali & Menirukan Nada (Do–Sol) serta Pola Irama Nilai Nada Utuh s.d. Seperdelapan (2 Birama)',
        reactivatedConcept: 'Kepekaan intonasi solmisasi nada dan ketepatan ketukan pola irama 2 birama',
        newCompetency: 'Menyelaraskan vokal, perkusi tubuh, dan instrumen kelas dalam sajian utuh lagu daerah berkelompok beserta evaluasi memakai istilah musik',
        depthDifference: 'Naik dari latihan pengenalan nada–ritme per fragmen menuju penyajian ansambel lagu daerah utuh berorientasi kerja sama dan minat bermusik',
        newContextOrApplication: 'Pertunjukan kelas lagu daerah Nusantara (Panduan Seni Musik Modul Kelas IV hlm. 118–125)',
        pedagogicalReason: 'Keterampilan membaca nada dan nilai ketukan di Semester 1 menjadi pijakan langsung bagi kolaborasi penyajian lagu daerah dan tumbuhnya minat bermusik di Semester 2.',
      },
      suggestedGrade: '4',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase B — Elemen Berdampak & Modul Kelas IV (CP hlm. 12, hlm. 34–35, hlm. 112–125)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // Fase C (SD 5-6) — 3 Sem 1 + 3 Sem 2 terkurasi merujuk Panduan Seni Musik hlm. 12, 17–18, 35–46
  s(
    'musik-fc-s1-harmoni-akord-interval', 'Seni Musik', 'SD/MI', 'Fase C', 'Mengalami & Berpikir Artistik',
    'Unsur Musik (Tangga Nada Do–Si, Interval, Sukat–Birama) dan Klasifikasi Sumber Bunyi Alat Musik',
    'Peserta didik dapat mengenali dan menerapkan unsur nada do–si, interval, sukat, birama, serta mengklasifikasikan ragam alat musik tradisional/modern menurut sumber bunyinya (idiofon, membranofon, aerofon, kordofon, elektrik).',
    'Merujuk Panduan Seni Musik (hlm. 35–36, 40–41): perluas rentang nada ke skala penuh do–si serta perkenalkan lima pengelompokan organologi alat musik sederhana beserta cara memainkannya.',
    'Memperdalam pemahaman struktur unsur musik do–si serta penggolongan instrumen Nusantara dan modern berdasar sumber bunyi.',
    ['Nada do–sol dan karakteristik alat musik Fase B'],
    ['Identifikasi perbedaan interval/birama lagu tepat serta klasifikasi 5 kelompok sumber bunyi alat musik akurat'],
    '1 (Ganjil)', 'pengenalan',
    {
      suggestedGrade: '5',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Elemen Mengalami & Berpikir Artistik (CP hlm. 12, hlm. 35–36, 40–41)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fc-s1-notasi-pola-irama-tempo-melodi', 'Seni Musik', 'SD/MI', 'Fase C', 'Mengalami & Berpikir Artistik',
    'Eksplorasi Variasi Pola Irama, Tempo, dan Melodi melalui Pembacaan Partitur Notasi Angka & Balok Sederhana',
    'Peserta didik dapat membaca serta menuliskan variasi pola irama (nilai nada utuh hingga seperdelapan), perubahan tempo lambat ke cepat, dan rangkaian melodi sederhana menggunakan notasi angka maupun balok.',
    'Merujuk Panduan Seni Musik (hlm. 38–39): latih membaca partitur sederhana bertahap dari pola ritmis mudah ke variasi tempo serta menulis sketsa melodi singkat.',
    'Mengembangkan kecakapan literasi notasi musik (angka dan balok) serta kepekaan variasi tempo–melodi.',
    ['Tangga nada do–si & birama dasar'],
    ['Membaca melodi partitur sederhana dari beragam pola irama dan tempo dengan ketepatan tinggi'],
    '1 (Ganjil)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fc-s1-harmoni-akord-interval'],
      relatedTopicIds: ['musik-fc-s1-harmoni-akord-interval'],
      suggestedGrade: '5',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Elemen Mengalami & Berpikir Artistik (hlm. 35–39)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fc-s1-teknik-ritmis-melodis-spesifikasi', 'Seni Musik', 'SD/MI', 'Fase C', 'Berpikir dan Bekerja Artistik',
    'Teknik Bermain Alat Musik Ritmis–Melodis Berkelompok dan Perawatan Sesuai Spesifikasi Bahan Alat',
    'Peserta didik dapat memainkan lagu daerah/anak (seperti Burung Kakatua atau Ambilkan Bulan, Bu) secara kelompok memadukan alat ritmis dan melodis serta merawat alat musik sesuai spesifikasi bahannya (kayu, kulit, logam).',
    'Merujuk Panduan Seni Musik (hlm. 36–37, 41–43): tekankan perbedaan menjaga ketukan alat ritmis vs memainkan nada melodis serta cara merawat instrumen spesifik berbahan kayu/logam/membran.',
    'Menerapkan koordinasi teknik bermain instrumen ritmis–melodis sekaligus perawatan khusus berbasis bahan alat.',
    ['Klasifikasi sumber bunyi & pembacaan partitur sederhana'],
    ['Penampilan kelompok memadukan peran pengatur tempo dan melodi stabil disertai praktik perawatan sesuai bahan alat'],
    '1 (Ganjil)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fc-s1-notasi-pola-irama-tempo-melodi'],
      relatedTopicIds: ['musik-fc-s1-notasi-pola-irama-tempo-melodi'],
      suggestedGrade: '6',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Elemen Berpikir & Bekerja Artistik (CP hlm. 12, hlm. 36–37, 41–43)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fc-s2-istilah-tempo-dinamika-ekspresi', 'Seni Musik', 'SD/MI', 'Fase C', 'Merefleksikan',
    'Menerapkan Istilah Musik (Tanda Tempo, Tanda Dinamika, dan Tanda Ekspresi) dalam Umpan Balik Karya',
    'Peserta didik dapat mengelompokkan tanda tempo, dinamika, dan ekspresi pada partitur/lagu serta menggunakannya secara tepat saat mengulas kekuatan dan perbaikan karya maupun penampilan teman.',
    'Merujuk Panduan Seni Musik (hlm. 38): perluas kosakata musik Fase B ke penguasaan tanda ekspresi untuk mengevaluasi penyajian musik secara tepat dan konstruktif.',
    'Menggunakan istilah tempo, dinamika, dan ekspresi musik secara tepat dalam mengapresiasi dan mengevaluasi karya.',
    ['Pembacaan notasi & teknik permainan Sem 1'],
    ['Diskusi kelompok dan ulasan lisan/tertulis menggunakan istilah tanda tempo, dinamika, dan ekspresi yang sesuai'],
    '2 (Genap)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fc-s1-notasi-pola-irama-tempo-melodi'],
      relatedTopicIds: ['musik-fc-s1-notasi-pola-irama-tempo-melodi'],
      suggestedGrade: '6',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Elemen Merefleksikan (CP hlm. 12, Materi hlm. 38)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fc-s2-body-percussion-kearifan-lokal', 'Seni Musik', 'SD/MI', 'Fase C', 'Menciptakan & Berdampak',
    'Komposisi Pola Irama Anggota Tubuh & Alat Ritmis Berbasis Kearifan Lokal Daerah serta Jurnal Minat',
    'Peserta didik dapat menciptakan dan mengembangkan komposisi pola irama teratur memakai anggota tubuh (body percussion terinspirasi tradisi seperti Tari Saman) atau perkusi lokal yang mencerminkan kearifan daerah dan menunjukkan rasa ingin tahu bermusik.',
    'Merujuk Panduan Seni Musik (hlm. 43–46): fokus CP Elemen Menciptakan Fase C menekankan pengembangan pola irama berdasar nilai kearifan lokal serta tumbuhnya rasa ingin tahu dalam eksplorasi bunyi.',
    'Menciptakan pola irama kreatif berakar budaya lokal dengan memadukan perkusi tubuh dan instrumen lingkungan.',
    ['Pola irama, sumber bunyi, dan istilah musik'],
    ['Pertunjukan kelompok menampilkan komposisi pola ritme tubuh/ritmis bertema kearifan lokal dengan tempo stabil dan jurnal refleksi minat'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-fc-s1-teknik-ritmis-melodis-spesifikasi'],
      relatedTopicIds: ['musik-fc-s1-teknik-ritmis-melodis-spesifikasi'],
      suggestedGrade: '6',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Elemen Menciptakan & Berdampak (CP hlm. 12, hlm. 43–46)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fc-s2-kreasi-motif-lagu-kanon', 'Seni Musik', 'SD/MI', 'Fase C', 'Mengalami & Berpikir Artistik',
    'Penerapan Unsur Musik pada Lagu Daerah/Nusantara dan Eksplorasi Penyajian Melodi–Ritmis Lanjutan',
    'Peserta didik dapat memadukan penguasaan unsur nada do–si, variasi tempo, serta eksplorasi sumber bunyi tradisional maupun modern ke dalam penyajian lagu Nusantara terstruktur sebagai jembatan menuju jenjang SMP.',
    'Merujuk Panduan Seni Musik (hlm. 35–42): konsolidasikan seluruh unsur musik Fase C (interval, birama, karakter bunyi, dinamika) dalam unjuk kerja musik bermakna dan penuh rasa ingin tahu.',
    'Mengintegrasikan penguasaan literasi notasi, kepekaan unsur bunyi, dan kerja sama ansambel SD tingkat akhir.',
    ['Unsur musik, partitur sederhana, dan body percussion'],
    ['Penyajian lagu Nusantara menampilkan kontrol nada do–si, tempo, dan peran ritmis–melodis seimbang disertai refleksi diri'],
    '2 (Genap)', 'pendalaman',
    {
      prasyaratTopicIds: ['musik-fc-s1-harmoni-akord-interval', 'musik-fc-s1-notasi-pola-irama-tempo-melodi'],
      relatedTopicIds: ['musik-fc-s1-harmoni-akord-interval'],
      spiralRelation: {
        previousTopicId: 'musik-fc-s1-harmoni-akord-interval',
        previousTopicTitle: 'Unsur Musik (Tangga Nada Do–Si, Interval, Sukat–Birama) dan Klasifikasi Sumber Bunyi Alat Musik',
        reactivatedConcept: 'Penguasaan skala nada do–si, birama/sukat, dan karakter sumber bunyi instrumen',
        newCompetency: 'Menerapkan dan menyelaraskan unsur nada, irama, tempo, serta eksplorasi bahan sumber bunyi ke dalam penyajian karya musik lengkap secara mandiri/kelompok',
        depthDifference: 'Meningkat dari pengenalan konseptual unsur musik dan klasifikasi instrumen di Sem 1 menjadi aplikasi holistik dalam performa musik berkesadaran di akhir Fase C',
        newContextOrApplication: 'Pementasan mini lagu daerah–modern SD kelas 5–6 serta persiapan literasi musik Fase D SMP (Panduan Seni Musik hlm. 35–36)',
        pedagogicalReason: 'Panduan Seni Musik (hlm. 35) menegaskan bahwa penguasaan unsur musik Fase C menjadi kompetensi prasyarat bagi keterampilan musik jenjang SMP.',
      },
      suggestedGrade: '6',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase C — Penguatan Unsur Musik & Transisi Fase D (CP hlm. 12, hlm. 35–42)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // Fase D (SMP 7-9) — Skenario kunci pengujian progresi (Panduan Seni Musik hlm. 12–13, 17–18, 47–72, 103–106, 127–145)
  s(
    'musik-fd-s1-unsur-musik-notasi', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Mengalami',
    'Pengenalan & Analisis Unsur Musik (Irama, Melodi, Harmoni, Dinamika, Timbre) serta Notasi Angka–Balok',
    'Peserta didik dapat menganalisis keterpaduan unsur irama, melodi, tempo, dinamika, dan warna suara pada rekaman musik Nusantara maupun modern serta membaca partitur melodi dasar.',
    'Bimbing pengamatan aktif membedah bagaimana perubahan dinamika (crescendo/decrescendo) dan tempo membentuk emosi lagu, dilanjutkan membaca garis paranada treble.',
    'Menganalisis elemen musikal secara terstruktur menggunakan istilah musik baku dan membaca notasi.',
    ['Membaca ketukan dan solmisasi dasar SD'],
    ['Identifikasi birama, tempo, dinamika, dan baca partitur melodi 8 birama akurat'],
    '1 (Ganjil)', 'pengenalan',
    {
      suggestedGrade: '7',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Elemen Mengalami (CP hlm. 12, Materi hlm. 47–50, ATP Kelas VII hlm. 103)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fd-s1-teknik-vokal-instrumen', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Berpikir dan Bekerja Artistik',
    'Pengembangan Keterampilan Musikal: Teknik Vokal (Pernapasan Diafragma–Phrasering) & Instrumen Dasar',
    'Peserta didik dapat mempraktikkan teknik pernapasan diafragma, artikulasi, intonasi vokal unisono, atau teknik dasar memainkan instrumen ritmis/harmonis (gitar/pianika/angklung/alat daerah).',
    'Tekankan postur tubuh ergonomis, pemanasan vokal/jari aman, dan cara merawat serta menyetem instrumen secara bertanggung jawab.',
    'Mengembangkan penguasaan teknik dasar vokal/instrumen dan kebiasaan latihan bermusik yang disiplin.',
    ['Analisis unsur musik & notasi Sem 1'],
    ['Intonasi nada stabil, artikulasi/penjarian sesuai teknik dasar, dan instrumen dirawat sesuai prosedur'],
    '1 (Ganjil)', 'pengembangan',
    {
      prasyaratTopicIds: ['musik-fd-s1-unsur-musik-notasi'],
      relatedTopicIds: ['musik-fd-s1-unsur-musik-notasi'],
      suggestedGrade: '8',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Elemen Berpikir & Bekerja Artistik (CP hlm. 13, hlm. 57–61, Modul Kelas IX hlm. 127–139)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fd-s1-ansambel-musik-nusantara', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Berpikir Artistik & Berdampak',
    'Penerapan & Penyajian Musik Ansambel Sejenis/Campuran (Lagu Daerah Nusantara & Lagu Nasional)',
    'Peserta didik dapat menyelaraskan peran melodi utama, iringan akord, dan ritmis dalam ansambel kecil untuk menyajikan satu repertoar lagu Nusantara secara utuh dan percaya diri.',
    'Latih teknik mendengarkan sesama pemain ansambel (balancing suara) serta memaknai konteks budaya asal lagu daerah.',
    'Menerapkan koordinasi antarperan ansambel dalam penyajian repertoar bermuatan nilai budaya.',
    ['Teknik vokal & instrumen dasar'],
    ['Ansambel menyajikan lagu secara kompak dengan keseimbangan volume melodi dan pengiring'],
    '1 (Ganjil)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fd-s1-teknik-vokal-instrumen'],
      relatedTopicIds: ['musik-fd-s1-teknik-vokal-instrumen'],
      suggestedGrade: '8',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Penyajian Musik Daerah & Nusantara (CP hlm. 13, hlm. 59–64, ATP hlm. 103–105)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fd-s2-analisis-interpretasi-genre', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Merefleksikan & Mengalami',
    'Analisis dan Interpretasi Musik Lintas Gaya (Tradisional, Populer, Keroncong/Klasik Dasar)',
    'Peserta didik dapat membandingkan bentuk lagu (A–B / verse–chorus), instrumen khas, fungsi sosial-budaya, serta menafsirkan pesan/suasana karya musik lintas genre secara analitis.',
    'Ajak menelaah mengapa sebuah aransemen memilih instrumen dan harmoni tertentu untuk memperkuat makna lirik atau upacara budaya.',
    'Mengevaluasi struktur bentuk lagu, konteks historis-sosial, dan pilihan artistik suatu karya musik.',
    ['Unsur musik & penyajian ansambel Sem 1'],
    ['Laporan analisis musik menggunakan kosakata musikal tepat (bentuk, tekstur, timbre, interpretasi)'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-fd-s1-unsur-musik-notasi', 'musik-fd-s1-ansambel-musik-nusantara'],
      relatedTopicIds: ['musik-fd-s1-unsur-musik-notasi'],
      suggestedGrade: '8',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Genre & Apresiasi Musik (CP hlm. 12, Materi hlm. 51–57, ATP hlm. 104)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fd-s2-kreasi-aransemen-vokal-group', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Menciptakan',
    'Kreasi & Pengembangan Karya: Mengaransemen Melodi Lagu Daerah/Sederhana untuk Vokal Grup atau Ansambel',
    'Peserta didik dapat menciptakan aransemen singkat (intro, variasi pola ritmik/pengiring akord I–IV–V–vi, dan ending) atau menggubah lagu pendek sederhana bertema lingkungan.',
    'Transisi dari sekadar memainkan lagu jadi di Semester 1 menjadi memodifikasi/menciptakan variasi harmoni & ritme orisinal.',
    'Mengembangkan kreativitas aransemen musik sederhana dengan memadukan unsur ritmik dan harmonis terstruktur.',
    ['Teknik vokal/instrumen & ansambel Sem 1'],
    ['Karya aransemen memuat notasi/catatan progresi akord dan pola ritmis berbeda dari versi asli'],
    '2 (Genap)', 'pendalaman',
    {
      prasyaratTopicIds: ['musik-fd-s1-teknik-vokal-instrumen', 'musik-fd-s1-ansambel-musik-nusantara'],
      relatedTopicIds: ['musik-fd-s1-ansambel-musik-nusantara'],
      spiralRelation: {
        previousTopicId: 'musik-fd-s1-ansambel-musik-nusantara',
        previousTopicTitle: 'Penerapan & Penyajian Musik Ansambel Sejenis/Campuran (Lagu Daerah Nusantara & Lagu Nasional)',
        reactivatedConcept: 'Koordinasi peran melodi, pengiring akord, dan ritmis dalam ansambel',
        newCompetency: 'Menciptakan dan memodifikasi aransemen (intro, variasi iringan, ending) alih-alih sekadar menirukan partitur jadi',
        depthDifference: 'Naik dari tahap Penerapan penyajian repertoar baku menjadi tahap Pendalaman/Kreasi penciptaan aransemen orisinal',
        newContextOrApplication: 'Pengolahan vokal grup atau ansambel campuran berbasis gubahan siswa sendiri',
        pedagogicalReason: 'Keterampilan koordinasi ansambel di Semester 1 diaktifkan kembali sebagai fondasi untuk mencipta aransemen baru di Semester 2.',
      },
      suggestedGrade: '9',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Elemen Menciptakan (CP hlm. 13, Materi hlm. 66–70, ATP hlm. 104, 106)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fd-s2-pertunjukan-refleksi-evaluasi', 'Seni Musik', 'SMP/MTs', 'Fase D', 'Merefleksikan & Berdampak',
    'Refleksi, Kurasi Pergelaran Musik Kelas, dan Evaluasi Musikal Berdampak Positif',
    'Peserta didik dapat merancang susunan acara pertunjukan musik kelas sederhana, menyuguhkan karya aransemen kelompok, dan menulis evaluasi teknis maupun dampak sosial karya secara objektif.',
    'Gunakan rubrik evaluasi musikal (ketepatan intonasi, kekompakan tempo, penjiwaan ekspresi, kesiapan panggung) sebagai umpan balik bermakna.',
    'Merefleksikan kualitas artistik pertunjukan sendiri/rekan serta dampak positif bermusik bagi komunitas sekolah.',
    ['Analisis interpretasi & kreasi aransemen Sem 2'],
    ['Pergelaran terlaksana tertib dan refleksi pasca-pentas memuat evaluasi teknis spesifik dan rencana perbaikan'],
    '2 (Genap)', 'pendalaman',
    {
      prasyaratTopicIds: ['musik-fd-s2-analisis-interpretasi-genre', 'musik-fd-s2-kreasi-aransemen-vokal-group'],
      relatedTopicIds: ['musik-fd-s2-kreasi-aransemen-vokal-group'],
      suggestedGrade: '9',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase D — Elemen Berdampak & Empati Sosial (CP hlm. 13, hlm. 71–73, ATP hlm. 105–106)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // Seni Musik Fase E (SMA/SMK Umum Kelas 10 — bukan konsentrasi kejuruan!)
  s(
    'musik-fe-sma-s1-estetika-eksperimen-bunyi', 'Seni Musik', 'SMA/MA', 'Fase E', 'Mengalami & Berpikir Artistik',
    'Eksplorasi Akustik Bunyi, Tangga Nada Non-Diatonis Nusantara/Dunia, dan Tekstur Polifoni Dasar',
    'Peserta didik dapat membandingkan karakter tangga nada pentatonis Nusantara (slendro/pelog) dengan tangga nada diatonis mayor–minor serta mengeksplorasi tekstur monofoni, homofoni, dan polifoni.',
    'Gunakan pendengaran komparatif dua karya dengan tangga nada dan kepadatan tekstur berbeda sebelum mencoba imitasi pola.',
    'Mengalami dan membedakan sistem pelarasan bunyi lokal–global serta lapisan tekstur musikal.',
    ['Unsur musik & notasi Fase D'],
    ['Identifikasi tekstur (homofoni vs polifoni) dan karakter pelarasan pentatonis vs diatonis akurat'],
    '1 (Ganjil)', 'pengembangan',
    {
      suggestedGrade: '10',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase E — Elemen Mengalami & Unsur Musik Lengkap (CP hlm. 13, Materi hlm. 73–76, ATP hlm. 107–108)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fe-sma-s1-improvisasi-musik-kontemporer', 'Seni Musik', 'SMA/MA', 'Fase E', 'Menciptakan',
    'Teknik Improvisasi Terstruktur & Eksperimen Musik Kontemporer Menggunakan Media Bunyi Sekitar',
    'Peserta didik dapat merancang gagasan komposisi/improvisasi musik modern dengan memadukan instrumen konvensional, vokal, dan sumber bunyi benda alternatif secara berstruktur.',
    'Bentuk kesadaran bahwa musik kontemporer tetap membutuhkan niat artistik, dinamika kontras, dan kejelasan alur waktu.',
    'Menciptakan gagasan bunyi eksperimental terencana melalui notasi grafis atau partitur bebas.',
    ['Eksplorasi akustik & tekstur Sem 1'],
    ['Karya eksperimen dilengkapi notasi grafis/panduan tanda main dan alur klimaks yang disengaja'],
    '1 (Ganjil)', 'penerapan',
    {
      prasyaratTopicIds: ['musik-fe-sma-s1-estetika-eksperimen-bunyi'],
      relatedTopicIds: ['musik-fe-sma-s1-estetika-eksperimen-bunyi'],
      suggestedGrade: '10',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase E — Elemen Menciptakan (CP hlm. 13, Materi hlm. 77–80, ATP hlm. 109–110)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fe-sma-s2-produksi-audio-aransemen', 'Seni Musik', 'SMA/MA', 'Fase E', 'Menciptakan & Berpikir Artistik',
    'Aransemen Musik Lintas Budaya & Pengenalan Perekaman/Mixing Digital Sederhana (DAW)',
    'Peserta didik dapat memadukan motif musik daerah dengan harmoni populer dalam aransemen multi-track sederhana serta memperhatikan kejernihan perekaman dan keseimbangan kanal.',
    'Latih menyusun lapisan ritme, bassline, harmoni pengiring, dan melodi secara seimbang tanpa benturan frekuensi kasar.',
    'Mengintegrasikan kepekaan musikal lintas tradisi dengan teknologi perekaman dan penyuntingan digital.',
    ['Improvisasi & harmoni dasar'],
    ['Hasil aransemen menampilkan perpaduan motif tradisional–modern yang harmonis dan seimbang'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-fe-sma-s1-estetika-eksperimen-bunyi', 'musik-fe-sma-s1-improvisasi-musik-kontemporer'],
      relatedTopicIds: ['musik-fe-sma-s1-improvisasi-musik-kontemporer'],
      suggestedGrade: '10',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase E — Menciptakan & Mendokumentasikan Karya (CP hlm. 13, Materi hlm. 78–80, ATP hlm. 108–110)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-fe-sma-s2-kritik-musik-dampak-sosial', 'Seni Musik', 'SMA/MA', 'Fase E', 'Merefleksikan & Berdampak',
    'Penulisan Kritik Musik Analitis & Evaluasi Dampak Karya Musik Terhadap Kesejahteraan Komunitas',
    'Peserta didik dapat menyusun ulasan kritik musik konstruktif atas konser/rekaman nyata serta merancang presentasi karya berdampak sosial positif di lingkungan sekolah.',
    'Bedakan ulasan musik berbasis pengamatan teknis unsur bunyi + estetika pertunjukan dari preferensi selera pribadi semata.',
    'Mengevaluasi karya musik dengan argumen estetis matang dan menghubungkannya dengan kesejahteraan sosial.',
    ['Aransemen & eksperimen musik'],
    ['Esai kritik musik mengkaji teknik, struktur bentuk, serta relevansi sosial karya secara objektif'],
    '2 (Genap)', 'pendalaman',
    {
      prasyaratTopicIds: ['musik-fe-sma-s2-produksi-audio-aransemen'],
      relatedTopicIds: ['musik-fe-sma-s2-produksi-audio-aransemen'],
      suggestedGrade: '10',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase E — Merefleksikan & Dampak Positif (CP hlm. 13, hlm. 76–77, 80–81, Modul hlm. 146–162)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // Seni Musik Fase F (SMA Kelas 11-12 — terpisah dari Fase E!)
  s(
    'musik-ff-sma-s1-harmoni-lanjutan-musikologi', 'Seni Musik', 'SMA/MA', 'Fase F', 'Mengalami & Berpikir Artistik',
    'Analisis Harmoni Lanjutan (Akord Septim, Modulasi) & Kajian Sejarah Musik Barat–Nusantara',
    'Peserta didik dapat mengidentifikasi fungsi progresi akord perluasan serta menganalisis perubahan gaya komposisi musik dari periode klasik ke modern dan tradisi Nusantara.',
    'Kaitkan evolusi gaya musikal dengan perubahan teknologi instrumen dan fungsi musik di masyarakat tiap era.',
    'Menguasai analisis harmoni perluasan dan perspektif historis komposisi musik lintas zaman.',
    ['Tekstur, tangga nada, & aransemen Fase E'],
    ['Analisis progresi akord dan perbandingan karakteristik periode musik didukung contoh partitur/audio'],
    '1 (Ganjil)', 'pendalaman',
    {
      suggestedGrade: '11',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase F — Elemen Mengalami & Evaluasi Karya (CP hlm. 14, Materi hlm. 81–84)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),
  s(
    'musik-ff-sma-s2-komposisi-manajemen-konser', 'Seni Musik', 'SMA/MA', 'Fase F', 'Menciptakan & Berdampak',
    'Komposisi Orisinal Karya Musik Utuh, Hak Cipta Karya Musik, dan Manajemen Produksi Pertunjukan',
    'Peserta didik dapat merampungkan komposisi orisinal utuh bernotasi rapi, memahami perlindungan hak cipta/royalti musik dasar, serta mengelola produksi konser apresiasi akhir jenjang.',
    'Gabungkan perencanaan artistik, pembagian panitia produksi akustik–tata panggung, dan evaluasi dampak pertunjukan.',
    'Menghasilkan karya komposisi mandiri, memahami etika HAKI musik, dan menuntaskan produksi pergelaran.',
    ['Harmoni lanjutan Sem 1'],
    ['Partitur karya orisinal terbaca pemain lain dan laporan manajemen pergelaran memuat evaluasi artistik–teknis'],
    '2 (Genap)', 'integrasi',
    {
      prasyaratTopicIds: ['musik-ff-sma-s1-harmoni-lanjutan-musikologi'],
      relatedTopicIds: ['musik-ff-sma-s1-harmoni-lanjutan-musikologi'],
      suggestedGrade: '12',
      sumberDokumen: SENI_MUSIK_GUIDE_DOC,
      urlReferensi: SENI_MUSIK_GUIDE_URL,
      nomorHalamanAtauBagian: 'Fase F — Manajemen Pementasan & Penghayatan (CP hlm. 14, Materi hlm. 86–88)',
      statusVerifikasiSumber: 'berdasarkan_contoh_panduan',
      jenisKonten: 'contoh_panduan',
    }
  ),

  // =====================================================================
  // 11. SENI BUDAYA & PRAKARYA (HANYA untuk Seni Budaya / Prakarya / Rupa / Tari — BUKAN catch-all!)
  // =====================================================================
  s(
    'seni-sd-s1-unsur-rupa-alam', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Mengalami & Menciptakan (Seni Rupa)',
    'Unsur Rupa (Garis, Warna Primer–Sekunder, Tekstur) dan Sketsa Motif Dekoratif Nusantara',
    'Peserta didik dapat membedakan warna primer–sekunder serta menggambar motif dekoratif flora/fauna daerah menggunakan pengulangan pola rapi.',
    'Demonstrasikan pencampuran warna dasar dan latihan ritme pengulangan motif garis atau daun.',
    'Mengenali unsur visual dasar dan memadukannya dalam komposisi dekoratif simetris.',
    ['Menggambar bentuk dasar'],
    ['Komposisi motif menunjukkan pengulangan bentuk teratur dan perpaduan warna primer–sekunder tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  s(
    'seni-sd-s1-irama-gerak-tari', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Mengalami & Mengekspresikan (Musik/Tari)',
    'Pola Irama, Tempo, dan Komposisi Gerak Berpola dalam Permainan Tari Anak Daerah',
    'Peserta didik dapat bergerak mengikuti ketukan tempo lambat–cepat serta mengenali pola lantai lurus dan lengkung dasar dalam tari berkelompok.',
    'Padukan tepukan ketukan teratur dengan variasi level gerak rendah–sedang–tinggi secara kompak.',
    'Mengembangkan kesadaran ruang gerak, tempo, dan kekompakan ekspresi kelompok.',
    ['Mengikuti irama tepuk sederhana'],
    ['Perpindahan pola lantai dan ketepatan gerakan terhadap hitungan ketukan terjaga'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  s(
    'seni-sd-s2-kerajinan-daur-ulang', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Merefleksikan & Menciptakan (Prakarya)',
    'Perancangan Produk Kerajinan Bahan Alam & Daur Ulang dengan Prinsip 3R dan Keselamatan Alat',
    'Peserta didik dapat memilih bahan alam atau limbah anorganik bersih, menyusun sketsa dimensi beserta daftar alat aman, dan menghasilkan produk kerajinan fungsional.',
    'Tekankan keselamatan menggunakan gunting/cutter/lem panas dan uji kekokohan sebelum produk dipajang.',
    'Mengolah limbah bersih menjadi karya guna yang estetik dan aman.',
    ['Memilah sampah organik dan anorganik'],
    ['Rancangan kerja memuat ukuran bahan, langkah aman, dan karya akhir berfungsi kokoh'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '5' }
  ),
  s(
    'seni-sd-s2-kurasi-pameran-karya', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Berpikir & Bekerja Artistik',
    'Kurasi Pameran Mini Kelas: Label Karya, Evaluasi Proporsi Visual, dan Apresiasi Karya Santun',
    'Peserta didik dapat menuliskan label identitas karya serta memberi apresiasi dua bagian (kelebihan teknik + saran membangun) terhadap karya teman tanpa komentar merendahkan.',
    'Pandu format label (Judul, Pembuat, Media/Bahan, Konsep) dan rubrik apresiasi unsur warna, proporsi, serta kerapian finishing.',
    'Mengapresiasi karya seni secara objektif menggunakan istilah unsur rupa/gerak dasar.',
    ['Unsur rupa & karya prakarya Sem 1–2'],
    ['Ulasan karya menyebut aspek visual konkret (warna/kerapian), bukan sekadar "bagus"'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['seni-sd-s1-unsur-rupa-alam', 'seni-sd-s2-kerajinan-daur-ulang'], relatedTopicIds: ['seni-sd-s2-kerajinan-daur-ulang'], suggestedGrade: '6' }
  ),
  // SMP Seni Budaya / Prakarya
  s(
    'seni-smp-s1-ragam-hias-tekstur', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Mengalami & Menciptakan (Seni Rupa)',
    'Pengolahan Ragam Hias Nusantara, Gambar Perspektif Dasar, dan Teknik Pewarnaan Karya Rupa',
    'Peserta didik dapat membedakan motif ragam hias flora, fauna, geometris, dan figuratif berbagai daerah Indonesia serta menerapkannya pada media gambar/kain dengan proporsi presisi.',
    'Jelaskan cara membuat titik hilang perspektif dasar satu titik serta harmoni warna hangat–dingin.',
    'Menciptakan desain ragam hias berciri budaya Nusantara dengan teknik gambar proporsional.',
    ['Unsur rupa SD'],
    ['Karya ragam hias memuat ciri motif daerah tepat dengan teknik pewarnaan merata dan rapi'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  s(
    'seni-smp-s1-prakarya-limbah-reka', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Merefleksikan & Menciptakan (Prakarya)',
    'Desain Produk Prakarya Bahan Serat/Limbah Keras serta Teknologi Tepat Guna Sederhana',
    'Peserta didik dapat merancang alur produksi kerajinan bernilai guna tinggi dengan mempertimbangkan K3 bengkel kerja, efisiensi bahan, dan pengemasan menarik.',
    'Gunakan analisis fungsi–estetika–biaya agar produk prakarya layak pamer atau bernilai ekonomis ringan.',
    'Mengintegrasikan prinsip desain ergonomis, K3 alat kerja, dan pengemasan produk prakarya.',
    ['Prakarya 3R SD'],
    ['Dokumen desain menyertakan gambar kerja ukuran, rincian biaya bahan, dan prototipe kokoh'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'seni-smp-s2-tari-pertunjukan-musik', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Mengekspresikan (Seni Tari & Pertunjukan)',
    'Eksplorasi Gerak Tari Tradisional–Kreasi (Ruang, Waktu, Tenaga) dan Tata Iringan Pertunjukan',
    'Peserta didik dapat merangkai motif gerak tari daerah berdasar unsur ruang–waktu–tenaga serta merancang pola lantai simetris–asimetris untuk penyajian kelompok.',
    'Latih keselarasan dinamika gerak lembut vs patah tegas dengan ketukan musik pengiring pertunjukan.',
    'Menyusun koreografi tari kreasi kelompok dengan memperhatikan pola lantai dan dinamika gerak.',
    ['Pola irama & gerak dasar SD'],
    ['Pola lantai terbaca jelas dalam sketsa blok panggung dan gerak selaras iringan musik'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '8' }
  ),
  s(
    'seni-smp-s2-kurasi-pameran-digital', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Berpikir Artistik & Berdampak',
    'Manajemen Pameran Seni Sekolah (Kuratorial, Tata Ruang Pamer, Katalog Karya, dan Kritik Konstruktif)',
    'Peserta didik dapat merencanakan penataan pameran karya rupa/prakarya kelas, menyusun katalog singkat karya, dan menulis esai apresiasi/kritik estetis berimbang.',
    'Tekankan peran panitia kurasi, pencahayaan display karya 2D/3D, dan standar etiket kritik seni objektif.',
    'Mengelola publikasi karya seni pelajar secara kolaboratif serta mengevaluasi kualitas estetiknya.',
    ['Ragam hias & desain prakarya Sem 1'],
    ['Katalog memuat deskripsi medium dan konsep tiap karya; ulasan kritis mengevaluasi teknik dan komposisi'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['seni-smp-s1-ragam-hias-tekstur', 'seni-smp-s1-prakarya-limbah-reka'], relatedTopicIds: ['seni-smp-s1-ragam-hias-tekstur'], suggestedGrade: '9' }
  ),
];
