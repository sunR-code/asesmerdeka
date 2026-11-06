import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type {
  ModulAjarDokumen,
  LKPDDokumen,
  LKPDPresetType,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
  LKPDPertanyaanItem,
  ATPDokumen,
  ATPItem,
  ProtaDokumen,
  ProtaItem,
  PromesDokumen,
  PromesMingguColumn,
  PromesRowItem,
} from '../types/perangkatAjar';
import { getSemesterCurriculumPlan } from './kurikulumCatalog';

/**
 * Pembuat Modul Ajar (RPP Kurikulum Merdeka) Lengkap & Kontekstual
 */
export function buildSmartModulAjar(
  tp: CustomTPItem,
  profile: SchoolProfile,
  jumlahPertemuan: number = 2
): ModulAjarDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const alokasiJP = Number(tp.alokasiJP) || 8;
  const menitPerJP = profile.jenjang.includes('SD') ? 35 : profile.jenjang.includes('SMP') ? 40 : 45;
  const totalMenitPertemuan = Math.round((alokasiJP * menitPerJP) / jumlahPertemuan);

  // Profil Pelajar Pancasila yang relevan
  const profilList = [
    'Bernalar Kritis (menganalisis informasi, mengevaluasi argumen, dan menyelesaikan masalah secara logis)',
    'Gotong Royong (bekerja sama, berkolaborasi aktif, dan menghargai gagasan anggota kelompok dalam diskusi)',
    'Mandiri (memiliki inisiatif belajar, bertanggung jawab atas proses dan hasil kerjanya secara disiplin)',
    'Kreatif (mampu memodifikasi dan menghasilkan gagasan orisinal dalam pemecahan masalah kontekstual)',
  ];

  // Sarana & Prasarana
  const saranaList = [
    'Papan tulis / Spidol / Smart Board interaktif',
    'Buku teks utama & panduan guru Kurikulum Merdeka Kemendikbudristek',
    'Lembar Kerja Peserta Didik (LKPD) Kontekstual',
    'Perangkat presentasi (Laptop / Proyektor LCD) atau media kartu peraga',
    'Gawai / Akses internet untuk penelusuran referensi dan studi kasus nyata',
  ];

  // Pertanyaan Pemantik
  const pemantik = [
    `Pernahkah kalian menjumpai peristiwa atau penerapan "${tp.materiPokok}" dalam kehidupan kita sehari-hari?`,
    `Mengapa pemahaman mengenai konsep ini sangat penting dan bagaimana cara terbaik menyelesaikan permasalahannya?`,
    `Jika kita tidak memahami kaidah dasarnya, dampak atau kekeliruan apa yang mungkin terjadi di sekitar kita?`,
  ];

  // Pemahaman Bermakna
  const pemahamanBermakna = `Peserta didik memahami bahwa konsep "${tp.materiPokok}" bukan sekadar teori hafalan, melainkan prinsip aplikatif yang dapat dimanfaatkan untuk menganalisis situasi nyata, mengambil keputusan rasional, serta memecahkan masalah kontekstual di lingkungan sekitar dan dunia kerja.`;

  // Kompetensi Awal
  const kompetensiAwal = [
    `Peserta didik telah memiliki pengetahuan dasar tentang istilah-istilah pengantar materi terkait.`,
    `Peserta didik mampu melakukan pengamatan, membaca informasi terstruktur, dan berkomunikasi secara efektif.`,
    `Peserta didik memahami pentingnya bernalar logis dan disiplin dalam proses penyelidikan belajar.`,
  ];

  // Langkah Kegiatan Pembelajaran
  const kegiatanPembelajaran = Array.from({ length: jumlahPertemuan }, (_, i) => {
    const pertemuanKe = i + 1;
    const durasi = totalMenitPertemuan;
    const durasiPendahuluan = Math.round(durasi * 0.15);
    const durasiPenutup = Math.round(durasi * 0.15);

    return {
      pertemuan: pertemuanKe,
      alokasiMenit: durasi,
      pendahuluan: [
        `Kegiatan Pendahuluan (${durasiPendahuluan} Menit): Guru membuka pembelajaran dengan salam hangat, sapaan santun, dan mengajak peserta didik berdoa bersama dipimpin ketua kelas.`,
        `Guru memeriksa kehadiran, kesiapan fisik dan psikis peserta didik, serta kerapian ruang belajar.`,
        `Apersepsi: Guru mengaitkan materi pertemuan sebelumnya dengan topik "${tp.materiPokok}" melalui tanya jawab singkat.`,
        `Motivasi: Guru menyampaikan tujuan pembelajaran, pemahaman bermakna, serta relevansi materi dalam kehidupan nyata.`,
        `Guru memaparkan gambaran garis besar kegiatan pembelajaran dan skenario penilaian yang akan dilakukan.`,
      ],
      inti: [
        `Tahap 1 (Orientasi Masalah): Guru menyajikan stimulus kontekstual (video / studi kasus / teks infografis) mengenai "${tp.materiPokok}" dan mengajukan pertanyaan pemantik kepada kelas.`,
        `Tahap 2 (Organisasi Belajar): Peserta didik dibagi ke dalam kelompok heterogen beranggotakan 4–5 orang. Guru membagikan Lembar Kerja Peserta Didik (LKPD).`,
        `Tahap 3 (Penyelidikan Terbimbing): Setiap kelompok melakukan eksplorasi informasi, mendiskusikan langkah penyelesaian, dan mencatat data temuan. Guru berkeliling memberikan scaffolding/bimbingan bertingkat.`,
        `Tahap 4 (Pengembangan & Penyajian Karya): Masing-masing kelompok menyusun kesimpulan hasil diskusi pada LKPD. Perwakilan kelompok mempresentasikan hasil kerjanya di depan kelas.`,
        `Tahap 5 (Analisis & Evaluasi): Kelompok lain memberikan tanggapan apresiatif dan pertanyaan kritis. Guru bersama peserta didik menyimpulkan konsep kunci dan meluruskan miskonsepsi yang muncul.`,
      ],
      penutup: [
        `Kegiatan Penutup (${durasiPenutup} Menit): Peserta didik bersama guru melakukan refleksi bersama atas proses pembelajaran yang telah berlangsung hari ini (apa yang dipahami, apa yang menyenangkan, dan kendala yang dihadapi).`,
        `Guru memberikan apresiasi dan penguatan atas keaktifan, kerja sama, dan pencapaian seluruh peserta didik.`,
        `Guru menyampaikan arahan tindak lanjut serta topik yang akan dipelajari pada pertemuan berikutnya.`,
        `Pembelajaran ditutup dengan rasa syukur, doa bersama, dan salam penutup.`,
      ],
    };
  });

  // Glosarium
  const glosarium = [
    { istilah: tp.materiPokok, definisi: `Pokok bahasan inti yang menjadi fokus penguasaan kompetensi peserta didik.` },
    { istilah: 'Capaian Pembelajaran (CP)', definisi: 'Kompetensi pembelajaran yang harus dicapai peserta didik pada setiap fase perkembangan.' },
    { istilah: 'Tujuan Pembelajaran (TP)', definisi: 'Deskripsi pencapaian tiga aspek kompetensi (pengetahuan, keterampilan, sikap) yang diperoleh peserta didik dalam kegiatan belajar.' },
    { istilah: 'Problem-Based Learning (PBL)', definisi: 'Model pembelajaran yang memfokuskan peserta didik pada pemecahan masalah nyata untuk membangun pengetahuannya sendiri.' },
  ];

  return {
    id: `modul-${tp.id}-${Date.now().toString(36)}`,
    judul: `Modul Ajar: ${tp.materiPokok}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    alokasiWaktu: `${alokasiJP} Jam Pelajaran (${jumlahPertemuan} Pertemuan x ${totalMenitPertemuan} Menit)`,
    jumlahPertemuan,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    kompetensiAwal,
    profilPelajarPancasila: profilList,
    saranaPrasarana: saranaList,
    targetPesertaDidik: 'Peserta didik reguler/tipikal umum (dapat mengikuti pembelajaran tanpa hambatan belajar khusus, dengan diferensiasi proses dan produk).',
    modelPembelajaran: 'Problem-Based Learning (PBL) dipadukan dengan diskusi kelompok, inkuiri kontekstual, dan presentasi kolaboratif.',

    pemahamanBermakna,
    pertanyaanPemantik: pemantik,
    kegiatanPembelajaran,

    asesmen: {
      diagnostik: 'Tanya jawab apersepsi dan survei pemahaman awal sebelum memulai materi pokok.',
      formatif: 'Observasi keaktifan diskusi kelompok, unjuk kerja presentasi, dan penilaian kinerja pada LKPD.',
      sumatif: 'Tes tertulis (Pilihan Ganda, AKM Kompleks, dan Uraian HOTS) pada akhir bab/lingkup materi.',
    },
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Pemahaman Konsep & Istilah Kunci',
        baruBerkembang: 'Belum mampu mendefinisikan konsep inti meski telah dibimbing guru.',
        layak: 'Mampu menjelaskan definisi konsep dasar namun belum konsisten dalam contoh.',
        cakap: 'Mampu menjelaskan konsep dan memberikan contoh kontekstual secara runtut.',
        mahir: 'Mampu menguraikan konsep, menganalisis keterkaitan, dan memecahkan variasi masalah baru.',
      },
      {
        kriteria: 'Kemampuan Kolaborasi & Komunikasi',
        baruBerkembang: 'Pasif dalam diskusi dan memerlukan dorongan berkelanjutan.',
        layak: 'Terlibat dalam pembagian tugas kelompok namun kontribusi masih terbatas.',
        cakap: 'Aktif berdiskusi, mendengarkan rekan, dan menyampaikan pendapat secara terbuka.',
        mahir: 'Menginisiasi kerja sama, memfasilitasi solusi kelompok, dan mempresentasikan hasil dengan percaya diri.',
      },
    ],

    pengayaanDanRemedial: {
      pengayaan: `Diberikan kepada peserta didik yang telah mencapai ketuntasan tujuan pembelajaran (KKTP) berupa penugasan proyek eksplorasi mandiri atau pemecahan masalah tingkat lanjut yang membutuhkan penalaran analitis mendalam.`,
      remedial: `Diberikan bimbingan khusus individual atau tutor sebaya terhadap indikator TP yang belum dicapai, difokuskan pada penguatan konsep dasar dengan analogi sederhana dan latihan terarah.`,
    },

    refleksiGuru: [
      'Apakah seluruh peserta didik terlibat aktif dan antusias selama kegiatan pembelajaran berlangsung?',
      'Langkah atau instruksi manakah yang paling efektif dan bagian mana yang masih perlu perbaikan?',
      'Apakah alokasi waktu yang direncanakan sudah memadai untuk menyelesaikan seluruh tahapan kegiatan?',
    ],
    refleksiSiswa: [
      'Hal baru dan paling menarik apa yang saya pelajari pada materi hari ini?',
      'Bagian materi mana yang menurut saya masih paling menantang atau membutuhkan latihan tambahan?',
      'Bagaimana kontribusi saya dalam membantu kelompok saya menyelesaikan tugas LKPD?',
    ],

    glosarium,
    daftarPustaka: [
      `Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi Republik Indonesia. Buku Panduan Guru & Siswa ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama}. Jakarta: Kemendikbudristek.`,
      `Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen Kurikulum Merdeka.`,
      `Sumber referensi literatur dan media pembelajaran digital terkait topik ${tp.materiPokok}.`,
    ],
  };
}

interface LKPDSectionResult {
  judul: string;
  alokasiWaktu: string;
  petunjukPengerjaan: string[];
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal?: string;
  };
  eksperimenData?: LKPDEksperimenData;
  diferensiasiData?: LKPDDiferensiasiData;
  proyekData?: LKPDProyekData;
  langkahAktivitas: {
    langkahKe: number;
    judulLangkah?: string;
    instruksi: string;
    bantuanAtauTabel?: string[];
  }[];
  pertanyaanAnalisis: LKPDPertanyaanItem[];
  kesimpulanRefleksi: string[];
}

/**
 * Generator Archetype 1: Kasus & Wacana Kontekstual (Default)
 */
export function buildKasusSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  const materi = tp.materiPokok;
  const mapel = profile.mataPelajaranUtama;
  const judul = konteks
    ? `LKPD Studi Kasus: ${konteks}`
    : `Lembar Kerja Peserta Didik (LKPD): ${materi}`;

  const teksStimulus = konteks
    ? `Dalam kehidupan nyata dan perkembangan zaman saat ini, isu mengenai "${konteks}" menjadi tantangan nyata yang sangat berkaitan erat dengan materi "${materi}". Suatu kelompok masyarakat atau pelajar dihadapkan pada situasi kritis di mana mereka harus mengamati fenomena, menganalisis data faktual, dan mengambil keputusan berbasis pemahaman ${mapel}. Tanpa pemahaman konsep yang tepat, solusi yang diambil dapat menimbulkan dampak yang kurang optimal. Oleh karena itu, mari kita telusuri dan pecahkan tantangan kontekstual ini bersama rekan kelompokmu!`
    : `Dalam kehidupan sehari-hari, kita sering menjumpai fenomena atau persoalan yang memerlukan pemahaman matang mengenai "${materi}". Suatu kelompok masyarakat atau siswa dihadapkan pada situasi di mana mereka harus mengamati pola, mencatat data akurat, dan mengambil keputusan tepat berdasarkan prinsip-prinsip ${mapel}. Jika analisis dilakukan secara keliru, solusi yang dihasilkan tidak akan efektif. Oleh karena itu, mari kita telusuri dan selidiki kasus ini bersama kelompokmu!`;

  return {
    judul,
    alokasiWaktu: '60 - 80 Menit (Kerja Kelompok Kolaboratif)',
    petunjukPengerjaan: [
      'Berdoalah sebelum memulai kegiatan belajar bersama kelompokmu.',
      'Tuliskan nama anggota kelompok dan nomor presensi pada kolom identitas yang tersedia.',
      'Bacalah stimulus wacana / skenario kasus dengan teliti dan cermat.',
      'Diskusikan setiap tahapan aktivitas bersama rekan kelompok secara aktif, santun, dan saling menghargai gagasan.',
      'Tuliskan hasil penyelidikan dan simpulan kelompokmu pada lembar jawab yang telah disediakan.',
      'Periksa kembali jawaban kelompok sebelum dipresentasikan di hadapan bapak/ibu guru dan teman-teman sekelas.',
    ],
    stimulusKasus: {
      judul: konteks
        ? `Studi Kasus Kontekstual: ${konteks}`
        : `Studi Kasus Kontekstual: Tantangan & Aplikasi ${materi}`,
      teks: teksStimulus,
      pertanyaanAwal:
        'Berdasarkan uraian kasus di atas, fakta penting apa saja yang dapat kamu temukan dan masalah utama apa yang perlu segera dipecahkan?',
    },
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Identifikasi Masalah & Pengumpulan Fakta Awal',
        instruksi: `Catatlah minimal 3 informasi kunci atau fakta penting yang berkaitan dengan materi "${materi}" dari stimulus yang diberikan.`,
        bantuanAtauTabel: [
          'Informasi / Fakta Kunci ke-1: ......................................................................................................',
          'Informasi / Fakta Kunci ke-2: ......................................................................................................',
          'Informasi / Fakta Kunci ke-3: ......................................................................................................',
        ],
      },
      {
        langkahKe: 2,
        judulLangkah: 'Eksplorasi Konsep & Pemodelan Analisis',
        instruksi:
          'Diskusikan bersama kelompok cara memodelkan hubungan antarkonsep dan faktor penyebab untuk merumuskan alternatif solusi.',
        bantuanAtauTabel: [
          'Rumusan Masalah Utama: ..........................................................................................',
          'Konsep / Kaidah Dasar yang Relevan: ....................................................................',
          'Skema / Alur Penyelesaian Masalah: ............................................................................',
        ],
      },
      {
        langkahKe: 3,
        judulLangkah: 'Penyusunan Solusi & Bukti Analisis',
        instruksi:
          'Tuliskan rekomendasi solusi konkret kelompokmu beserta argumen pendukung yang logis dan dapat diterapkan secara nyata.',
      },
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-kasus-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        pertanyaan: `Mengapa konsep "${materi}" menjadi kunci utama dalam menyelesaikan persoalan kontekstual tersebut? Jelaskan dengan argumen logis kelompokmu!`,
        petunjukPengerjaan: 'Kaitkan dengan prinsip dasar yang telah dipelajari.',
        panduanJawabanSingkat:
          'Peserta didik menjelaskan konsep dasar materi dan menghubungkannya secara langsung dengan akar masalah dalam wacana.',
      },
      {
        id: 'q-kasus-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        pertanyaan:
          'Jika salah satu kondisi atau variabel pada kasus tersebut diubah, apa pengaruhnya terhadap hasil akhir atau dampak di masyarakat? Berikan analisis kritis kelompokmu!',
        petunjukPengerjaan: 'Berikan penjelasan sebab-akibat yang jelas dan berimbang.',
        panduanJawabanSingkat:
          'Peserta didik menganalisis hubungan kausalitas (sebab-akibat) jika terjadi modifikasi parameter atau kebijakan terkait.',
      },
      {
        id: 'q-kasus-3',
        nomor: 3,
        tingkatKognitif: 'Mahir',
        pertanyaan:
          'Sebutkan minimal 2 contoh lain dalam kehidupan nyata atau profesi masa depan di mana pemahaman materi ini menjadi penentu keberhasilan!',
        petunjukPengerjaan: 'Pilihlah contoh nyata yang ada di lingkungan sekitarmu atau inovasi terkini.',
        panduanJawabanSingkat:
          'Peserta didik mengidentifikasi implementasi riil materi di berbagai bidang, seperti sains teknologi, industri kreatif, atau kelestarian lingkungan.',
      },
    ],
    kesimpulanRefleksi: [
      'Kesimpulan Akhir Kelompok: Berdasarkan hasil investigasi dan diskusi hari ini, konsep utama yang kami pelajari adalah .........................................................................................................................................',
      'Refleksi Pembelajaran Siswa: Hal baru yang paling bermakna bagi saya setelah membedah kasus ini adalah ................................................... dan saya berkomitmen menerapkannya dalam kehidupan sehari-hari.',
    ],
  };
}

/**
 * Generator Archetype 2: Eksperimen & Penyelidikan Terstruktur
 */
export function buildEksperimenSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  const materi = tp.materiPokok;
  const mapel = profile.mataPelajaranUtama;
  const judul = konteks
    ? `LKPD Eksperimen Ilmiah: ${konteks}`
    : `LKPD Eksperimen & Penyelidikan Sains: ${materi}`;

  const teksStimulus = konteks
    ? `Dalam penyelidikan ilmiah, fenomena "${konteks}" yang berkaitan erat dengan konsep "${materi}" dapat dibuktikan melalui eksperimen langsung atau simulasi terstruktur. Untuk membuktikan prinsip-prinsip ${mapel}, kita perlu merancang penyelidikan berbasis bukti empiris, mengontrol variabel, serta mencatat data secara cermat agar kesimpulan yang diambil dapat dipertanggungjawabkan secara ilmiah.`
    : `Dalam metode ilmiah, teori mengenai "${materi}" perlu diverifikasi melalui pengamatan sistematis dan pembuktian langsung. Di dalam kegiatan praktikum ini, kalian akan menguji pengaruh perlakuan tertentu terhadap objek pengamatan, mengumpulkan data kuantitatif maupun kualitatif, serta menarik kesimpulan berdasarkan bukti nyata di laboratorium atau lingkungan sekitar.`;

  return {
    judul,
    alokasiWaktu: '80 - 100 Menit (Praktikum & Analisis Data Terstruktur)',
    petunjukPengerjaan: [
      'Berdoalah sebelum memulai prosedur praktikum bersama kelompokmu.',
      'Gunakan perlengkapan keselamatan kerja praktikum (bila relevan) dan pastikan meja kerja bersih dan rapi.',
      'Periksa kelengkapan alat serta bahan sebelum memulai pengujian atau pengukuran.',
      'Lakukan langkah eksperimen secara runtut, hati-hati, dan catat hasil observasi secara objektif pada tabel.',
      'Analisis data yang diperoleh bersama kelompok untuk menguji kebenaran hipotesis awal.',
      'Bersihkan kembali alat praktikum dan rapikan meja kerja setelah seluruh rangkaian selesai.',
    ],
    stimulusKasus: {
      judul: konteks
        ? `Penyelidikan Ilmiah: ${konteks}`
        : `Penyelidikan Ilmiah & Observasi: ${materi}`,
      teks: teksStimulus,
      pertanyaanAwal:
        'Berdasarkan rancangan penyelidikan ini, variabel apa saja yang perlu dijaga konstan (kontrol) dan variabel apa yang sengaja diubah (bebas) untuk melihat hasilnya?',
    },
    eksperimenData: {
      alatDanBahan: [
        'Perangkat ukur / instrumen pencatat (penggaris, stopwatch, termometer, atau timbangan)',
        `Sampel atau media pengamatan praktikum terkait ${materi}`,
        'Wadah reaksi / wadah uji / lembar spesimen percobaan',
        'Alat tulis dan lembar pencatatan data observasi',
        'Perangkat keselamatan kerja sederhana (sarung tangan/masker jika diperlukan)',
      ],
      hipotesisAwal: `Jika perlakuan atau variabel pada pengujian "${materi}" diubah atau ditingkatkan secara bertahap, maka hasil pengukuran akan menunjukkan respon yang konsisten dengan kaidah ${mapel}.`,
      tabelObservasi: {
        kolom: [
          'No',
          'Objek / Parameter Uji',
          'Kondisi Perlakuan',
          'Hasil Pengamatan (Kualitatif / Kuantitatif)',
          'Keterangan & Catatan Khusus',
        ],
        baris: [
          [
            '1',
            `Uji Kontrol (Standar) - ${materi}`,
            'Kondisi normal tanpa manipulasi variabel',
            '..................................................',
            'Titik acuan standar (baseline)',
          ],
          [
            '2',
            `Variasi Perlakuan A - ${materi}`,
            'Diberikan perlakuan tingkat rendah / sedang',
            '..................................................',
            'Perubahan mulai teramati',
          ],
          [
            '3',
            `Variasi Perlakuan B - ${materi}`,
            'Diberikan perlakuan tingkat tinggi / intensif',
            '..................................................',
            'Perubahan terukur signifikan',
          ],
        ],
      },
    },
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Persiapan Alat & Penegasan Variabel Percobaan',
        instruksi:
          'Susun instrumen dan identifikasi variabel kontrol, variabel bebas, serta variabel terikat sebelum memulai prosedur uji.',
        bantuanAtauTabel: [
          'Variabel Bebas (faktor yang sengaja diubah): ............................................................',
          'Variabel Terikat (respon yang diukur / diamati): ............................................................',
          'Variabel Kontrol (kondisi yang dijaga seragam): ............................................................',
        ],
      },
      {
        langkahKe: 2,
        judulLangkah: 'Pelaksanaan Prosedur & Pencatatan Data Observasi',
        instruksi:
          'Jalankan langkah kerja praktikum secara tertib, teliti, dan catat setiap angka pengukuran atau perubahan fisik pada tabel observasi.',
      },
      {
        langkahKe: 3,
        judulLangkah: 'Analisis Komparasi Data & Verifikasi Hipotesis',
        instruksi:
          'Bandingkan tren data antarperlakuan dengan kondisi kontrol, kemudian tentukan apakah bukti eksperimen mendukung hipotesis awal.',
      },
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-eksperimen-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        pertanyaan:
          'Berdasarkan tabel observasi di atas, perubahan atau kecenderungan apa yang paling jelas terlihat antara kondisi kontrol dengan kondisi perlakuan?',
        petunjukPengerjaan: 'Bacalah angka atau data visual pada tabel observasi kelompokmu.',
        panduanJawabanSingkat:
          'Peserta didik membaca tren kenaikan, penurunan, atau perbedaan karakteristik visual pada tabel secara objektif.',
      },
      {
        id: 'q-eksperimen-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        pertanyaan:
          'Apakah hasil pengamatan kelompokmu membuktikan atau menggugurkan hipotesis awal yang telah dirumuskan? Jelaskan alasannya secara ilmiah!',
        petunjukPengerjaan: 'Bandingkan rumusan hipotesis dengan data empiris yang diperoleh.',
        panduanJawabanSingkat:
          'Peserta didik menyatakan konfirmasi hipotesis (diterima/ditolak) didukung oleh bukti data kuantitatif atau kualitatif.',
      },
      {
        id: 'q-eksperimen-3',
        nomor: 3,
        tingkatKognitif: 'Mahir',
        pertanyaan:
          'Faktor apa saja yang berpotensi menimbulkan ketidakpastian atau galat (error) dalam pengujian ini dan bagaimana rekomendasi perbaikannya?',
        petunjukPengerjaan: 'Tinjau akurasi alat, kestabilan lingkungan percobaan, dan ketepatan mata pengamat.',
        panduanJawabanSingkat:
          'Peserta didik mengevaluasi limitasi alat atau metode, serta mengusulkan kalibrasi atau teknik pengulangan (replikasi).',
      },
    ],
    kesimpulanRefleksi: [
      `Kesimpulan Penyelidikan: Berdasarkan data eksperimen materi "${materi}", dapat disimpulkan bahwa .........................................................................................................................................`,
      'Refleksi Keterampilan Saintifik: Melalui kegiatan praktikum ini, saya menyadari pentingnya kejujuran data, kehati-hatian bekerja, dan ketepatan prosedur dalam metode ilmiah.',
    ],
  };
}

/**
 * Generator Archetype 3: Tugas Berdiferensiasi (Dasar, Menengah, Mahir)
 */
export function buildDiferensiasiSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  const materi = tp.materiPokok;
  const judul = konteks
    ? `LKPD Berdiferensiasi: ${konteks}`
    : `LKPD Aktivitas Berdiferensiasi: ${materi}`;

  const teksStimulus = konteks
    ? `Setiap peserta didik memiliki kecepatan dan gaya belajar yang unik dalam memahami topik "${konteks}" terkait "${materi}". Melalui lembar kerja berdiferensiasi ini, kamu diberikan ruang untuk memilih jalur aktivitas yang paling sesuai dengan tingkat kesiapanmu saat ini—mulai dari memantapkan konsep dasar, mengaplikasikan dalam studi kasus, hingga menciptakan gagasan solutif yang inovatif.`
    : `Dalam memahami materi "${materi}", setiap siswa memiliki titik awal kesiapan yang berbeda. Lembar kerja berdiferensiasi ini dirancang untuk mendampingi belajarmu melalui 3 jalur berjenjang: Jalur Perintis (Tingkat Dasar), Jalur Cakap (Tingkat Menengah), dan Jalur Mahir (Pengayaan). Pilihlah tantangan yang sesuai dan jangan ragu untuk meningkatkan pencapaian belajarmu!`;

  return {
    judul,
    alokasiWaktu: '60 - 80 Menit (Tugas Bertingkat Berbasis Kesiapan Belajar)',
    petunjukPengerjaan: [
      'Bacalah petunjuk umum dan pilih tingkat aktivitas (Dasar, Menengah, atau Mahir) sesuai kesiapan belajarmu.',
      'Bagi peserta didik yang memilih Tingkat Dasar: fokuslah pada pemahaman konsep inti dan identifikasi komponen utama.',
      'Bagi peserta didik yang memilih Tingkat Menengah: fokuslah pada analisis hubungan antarkonsep dan penyelesaian persoalan aplikatif.',
      'Bagi peserta didik yang memilih Tingkat Mahir: kembangkan evaluasi kritis dan rancang solusi inovatif terhadap tantangan yang diberikan.',
      'Konsultasikan kesulitan kepada bapak/ibu guru atau lakukan diskusi kelompok sebaya secara kolaboratif.',
      'Tuliskan jawaban secara sistematis dan refleksikan pencapaian belajarmu di akhir kegiatan.',
    ],
    stimulusKasus: {
      judul: konteks
        ? `Wacana Berdiferensiasi: ${konteks}`
        : `Eksplorasi Mandiri & Berkelanjutan: ${materi}`,
      teks: teksStimulus,
      pertanyaanAwal:
        'Di antara 3 tingkat kesiapan yang ditawarkan, pada tingkat mana kamu merasa paling percaya diri untuk berkontribusi secara optimal?',
    },
    diferensiasiData: {
      tingkatDasar: {
        instruksi: `Fokus pada identifikasi konsep fondasi dan pengenalan istilah kunci materi "${materi}".`,
        tugas: [
          `Tuliskan dan jelaskan dengan bahasa sendiri 3 istilah atau konsep dasar penting dalam materi "${materi}".`,
          `Berikan 2 contoh konkret penerapan materi ini yang dapat dijumpai di lingkungan sekolah atau rumah.`,
          `Lengkapi skema atau diagram alur sederhana yang menunjukkan alur atau bagian-bagian utama dari topik ini.`,
        ],
      },
      tingkatMenengah: {
        instruksi: `Fokus pada penerapan konsep dan analisis hubungan sebab-akibat terkait "${materi}".`,
        tugas: [
          `Analisis bagaimana perubahan salah satu faktor pada materi "${materi}" dapat mempengaruhi kondisi keseluruhan.`,
          `Selesaikan permasalahan kontekstual yang disajikan dengan menyertakan argumen logis dan langkah penalaran yang terstruktur.`,
          `Bandingkan dua solusi atau cara kerja alternatif dalam memecahkan masalah materi ini, lalu tentukan mana yang lebih efektif.`,
        ],
      },
      tingkatMahir: {
        instruksi: `Fokus pada evaluasi kritis, perancangan solusi orisinal, dan sintesis gagasan inovatif terkait "${materi}".`,
        tugas: [
          `Kritisi kelemahan atau celah efisiensi pada praktik konvensional terkait materi "${materi}" dengan argumentasi berbasis data.`,
          `Rancang sebuah prototipe ide atau skema solusi orisinal yang dapat memecahkan tantangan kontekstual terkini.`,
          `Susun rekomendasi strategis dalam format panduan aksi nyata atau mini-infografis yang dapat disosialisasikan secara luas.`,
        ],
      },
    },
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Identifikasi Kesiapan Belajar (Self-Readiness Assessment)',
        instruksi:
          'Tinjau kembali pemahaman awalmu dan centang tingkatan tugas (Dasar, Menengah, Mahir) yang siap kamu selesaikan hari ini.',
        bantuanAtauTabel: [
          'Pilihan Tingkat: [  ] Tingkat Dasar (Perintis)   [  ] Tingkat Menengah (Cakap)   [  ] Tingkat Mahir (Kreatif)',
          'Alasan Pemilihan Tingkat: ......................................................................................................',
        ],
      },
      {
        langkahKe: 2,
        judulLangkah: 'Pengerjaan Tugas Mandiri & Kolaborasi Terarah',
        instruksi:
          'Kerjakan butir-butir tugas yang tertera pada kartu tingkatan yang kamu pilih dengan sungguh-sungguh dan mandiri.',
      },
      {
        langkahKe: 3,
        judulLangkah: 'Konsolidasi & Berbagi Perspektif Antar-Tingkat',
        instruksi:
          'Diskusikan hasil pengerjaan dengan rekan kelompok atau pasangan dari tingkat berbeda untuk memperkaya sudut pandang konsep.',
      },
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-diferensiasi-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        pertanyaan: `Bagian mana dari konsep "${materi}" yang paling mudah kamu pahami dan bagian mana yang memerlukan penguatan lebih lanjut? Jelaskan alasannya!`,
        petunjukPengerjaan: 'Evaluasi pemahaman diri secara jujur.',
        panduanJawabanSingkat:
          'Peserta didik mengenali area penguasaan dan area yang masih membutuhkan latihan tambahan.',
      },
      {
        id: 'q-diferensiasi-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        pertanyaan:
          'Bagaimana pemahaman pada Tingkat Dasar menjadi bekal penting saat kamu menyelesaikan tugas di Tingkat Menengah atau Mahir?',
        petunjukPengerjaan: 'Jelaskan keterkaitan konsep fondasi dengan pemecahan masalah yang lebih kompleks.',
        panduanJawabanSingkat:
          'Peserta didik menjelaskan bahwa konsep fundamental adalah prasyarat logika sebelum melakukan analisis mendalam.',
      },
      {
        id: 'q-diferensiasi-3',
        nomor: 3,
        tingkatKognitif: 'Mahir',
        pertanyaan:
          'Jika kamu diminta membagikan pemahaman materi ini kepada rekan sebaya, strategi atau perumpamaan apa yang akan kamu gunakan?',
        petunjukPengerjaan: 'Gunakan analogi kontekstual sehari-hari yang mudah diingat.',
        panduanJawabanSingkat:
          'Peserta didik merumuskan analogi kreatif yang merefleksikan kedalaman pemahaman materi.',
      },
    ],
    kesimpulanRefleksi: [
      `Refleksi Kemajuan Belajar: Setelah menuntaskan aktivitas bertingkat pada materi "${materi}", kompetensi baru yang berhasil saya kembangkan adalah .........................................................................................................................................`,
      'Komitmen Belajar Mandiri: Untuk menantang diri ke jenjang pemahaman berikutnya, target belajar saya selanjutnya adalah .........................................................................................................................................',
    ],
  };
}

/**
 * Generator Archetype 4: Proyek Kolaboratif & Desain Solusi
 */
export function buildProyekSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  const materi = tp.materiPokok;
  const mapel = profile.mataPelajaranUtama;
  const judul = konteks
    ? `LKPD Proyek Kolaboratif: ${konteks}`
    : `LKPD Proyek Kolaboratif & Desain Solusi: ${materi}`;

  const teksStimulus = konteks
    ? `Dunia saat ini membutuhkan inovasi nyata untuk menjawab tantangan "${konteks}". Melalui pendekatan berbasis proyek kolaboratif, kelompokmu ditantang menerapkan prinsip-prinsip materi "${materi}" dalam ${mapel} untuk merancang sebuah produk, karya edukatif, atau purwarupa solusi yang berdaya guna dan relevan bagi kehidupan bermasyarakat.`
    : `Pembelajaran berbasis proyek mengajak kita tidak hanya memahami konsep "${materi}" secara teoretis, tetapi mentransformasikannya menjadi aksi nyata. Bersama tim kerja, kalian ditantang untuk merencanakan, merancang, dan menyajikan sebuah produk atau media informatif yang solutif bagi permasalahan di sekitar lingkungan sekolah maupun tempat tinggal.`;

  return {
    judul,
    alokasiWaktu: '2 - 3 Pertemuan (Perencanaan, Pembuatan Karya, dan Gelar Pameran)',
    petunjukPengerjaan: [
      'Bentuklah kelompok kerja proyek yang terdiri dari 4-5 peserta didik secara heterogen.',
      'Sepakati pembagian peran (Ketua Tim, Spesialis Data, Desainer Produk, Presenter) dan pahami tugas masing-masing.',
      'Pelajari panduan proyek, tujuan capaian karya, dan rubrik penilaian yang telah ditetapkan bersama guru.',
      'Susun jadwal kerja (timeline) agar seluruh tahapan perancangan hingga finalisasi produk selesai tepat waktu.',
      'Lakukan konsultasi berkala (asistensi) dengan bapak/ibu guru untuk mendapatkan umpan balik konstruktif.',
      'Tampilkan hasil karya terbaik kelompok dalam gelar pameran karya / presentasi kelas dengan percaya diri dan santun.',
    ],
    stimulusKasus: {
      judul: konteks
        ? `Tantangan Desain Proyek: ${konteks}`
        : `Tantangan Desain Solusi Nyata: ${materi}`,
      teks: teksStimulus,
      pertanyaanAwal:
        'Karya atau produk nyata seperti apa yang ingin diciptakan kelompokmu untuk membuktikan penerapan konsep ini secara kreatif?',
    },
    proyekData: {
      tujuanProyek: `Menghasilkan karya/produk nyata atau laporan investigasi kreatif berbasis materi "${materi}" yang memberikan dampak positif dan aplikatif.`,
      tahapanWaktu:
        'Minggu I: Pembagian Peran & Riset Gagasan; Minggu II: Eksekusi Produksi / Pembuatan Prototipe; Minggu III: Uji Fungsi, Pameran Karya & Evaluasi.',
      peranAnggota: [
        {
          peran: 'Ketua Tim / Koordinator Proyek',
          tanggungJawab:
            'Mengatur alur kerja tim, memimpin diskusi perencanaan, memantau batas waktu (deadline), dan memastikan keaktifan seluruh anggota.',
        },
        {
          peran: 'Spesialis Data & Periset Konsep',
          tanggungJawab: `Mengumpulkan literatur dan data acuan materi "${materi}", serta memvalidasi keakuratan konten ilmiah pada karya tim.`,
        },
        {
          peran: 'Desainer & Pengembang Produk',
          tanggungJawab:
            'Merancang visual prototipe, format tata letak produk/poster/alat peraga, dan memimpin teknis pembuatan karya kolaboratif.',
        },
        {
          peran: 'Juru Bicara & Presenter',
          tanggungJawab:
            'Menyusun naskah presentasi, memaparkan karya di depan kelas/penguji, serta mencatat masukan audiens untuk evaluasi tindak lanjut.',
        },
      ],
      rubrikKarya: [
        {
          kriteria: 'Relevansi & Keakuratan Konsep',
          deskripsiSkor: `Karya secara jelas menerapkan prinsip materi "${materi}" secara tepat, mendalam, dan bebas dari miskonsepsi.`,
        },
        {
          kriteria: 'Kreativitas & Daya Inovasi Solusi',
          deskripsiSkor:
            'Desain karya orisinal, estetis, fungsional, dan memberikan manfaat nyata dalam memecahkan masalah kontekstual.',
        },
        {
          kriteria: 'Kolaborasi & Kejelasan Presentasi',
          deskripsiSkor:
            'Setiap anggota menjalankan perannya secara bertanggung jawab, kerja sama tim solid, dan presentasi disampaikan secara percaya diri.',
        },
      ],
    },
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Pembagian Peran & Penyusunan Jadwal Kerja (Timeline)',
        instruksi:
          'Tetapkan peran setiap anggota tim dan susun target mingguan proyek agar pengerjaan terarah dan terukur.',
        bantuanAtauTabel: [
          'Nama Ketua Tim: ....................................... | Target Minggu 1: .......................................',
          'Nama Spesialis Riset: ....................................... | Target Minggu 2: .......................................',
          'Nama Desainer: ....................................... | Target Minggu 3: .......................................',
          'Nama Presenter: ....................................... | Tanggal Presentasi: .......................................',
        ],
      },
      {
        langkahKe: 2,
        judulLangkah: 'Pengembangan Prototipe & Fabrikasi Karya',
        instruksi:
          'Buatlah produk nyata atau media solutif sesuai rancangan awal berpedoman pada materi ajar dan rubrik penilaian kualitas karya.',
      },
      {
        langkahKe: 3,
        judulLangkah: 'Uji Kelayakan Internal & Simulasi Presentasi',
        instruksi:
          'Lakukan uji coba fungsi produk bersama tim, lakukan penyempurnaan akhir, dan simulasikan paparan presentasi sebelum unjuk gelar karya.',
      },
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-proyek-1',
        nomor: 1,
        tingkatKognitif: 'Menengah',
        pertanyaan:
          'Bagaimana pembagian peran yang telah disepakati membantu efektivitas kerja tim dalam menyelesaikan proyek ini? Hambatan apa yang muncul dan bagaimana mengatasinya?',
        petunjukPengerjaan: 'Evaluasi dinamika kerja sama tim dan strategi komunikasi antaranggota.',
        panduanJawabanSingkat:
          'Peserta didik menguraikan sinergi peran, kendala manajemen waktu/tugas, dan solusi kompromi yang ditempuh tim.',
      },
      {
        id: 'q-proyek-2',
        nomor: 2,
        tingkatKognitif: 'Mahir',
        pertanyaan: `Bagian mana dari konsep "${materi}" yang paling krusial dalam menentukan keberhasilan fungsi produk karya kelompokmu? Jelaskan integrasinya!`,
        petunjukPengerjaan: 'Tunjukkan kaitan langsung antara teori konsep materi dengan fitur teknis karya.',
        panduanJawabanSingkat:
          'Peserta didik menjelaskan penerapan fungsional konsep materi dalam elemen desain atau mekanisme karya.',
      },
      {
        id: 'q-proyek-3',
        nomor: 3,
        tingkatKognitif: 'Mahir',
        pertanyaan:
          'Jika produk karya kelompokmu akan diimplementasikan secara nyata di lingkungan sekolah atau masyarakat, inovasi lanjutan apa yang perlu ditambahkan?',
        petunjukPengerjaan: 'Gunakan sudut pandang keberlanjutan (sustainability), efisiensi biaya, dan kemudahan penggunaan.',
        panduanJawabanSingkat:
          'Peserta didik merumuskan ide pengembangan lanjutan terkait daya tahan bahan, aksesibilitas, atau skala adopsi.',
      },
    ],
    kesimpulanRefleksi: [
      `Pencapaian Utama Tim Proyek: Karya yang berhasil kami selesaikan membuktikan bahwa penguasaan materi "${materi}" membuka peluang solusi kreatif untuk .........................................................................................................................................`,
      'Refleksi Karakter Gotong Royong: Menjalani proyek ini mengajarkan saya bahwa sinergi berbagai keahlian dan komitmen bersama menghasilkan karya yang jauh lebih bermanfaat daripada bekerja sendiri.',
    ],
  };
}

/**
 * Pembuat Lembar Kerja Peserta Didik (LKPD) Kontekstual & Siap Cetak
 * Mendukung 4 Archetype Pedagogis Kurikulum Merdeka:
 * - 'kasus': Studi Kasus Kontekstual & Literasi Kritis
 * - 'eksperimen': Eksperimen & Penyelidikan Sains/Praktik
 * - 'diferensiasi': Tugas Berdiferensiasi (Dasar, Menengah, Mahir)
 * - 'proyek': Proyek Kolaboratif & Desain Solusi
 */
export function buildSmartLKPD(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType = 'kasus',
  konteksAktual?: string
): LKPDDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const normalizedKonteks = konteksAktual?.trim() || undefined;

  let section: LKPDSectionResult;
  switch (presetType) {
    case 'eksperimen':
      section = buildEksperimenSection(tp, profile, normalizedKonteks);
      break;
    case 'diferensiasi':
      section = buildDiferensiasiSection(tp, profile, normalizedKonteks);
      break;
    case 'proyek':
      section = buildProyekSection(tp, profile, normalizedKonteks);
      break;
    case 'kasus':
    default:
      section = buildKasusSection(tp, profile, normalizedKonteks);
      break;
  }

  return {
    id: `lkpd-${tp.id}-${Date.now().toString(36)}`,
    tpId: tp.id,
    presetType,
    konteksAktual: normalizedKonteks,
    judul: section.judul,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiWaktu: section.alokasiWaktu,

    petunjukPengerjaan: section.petunjukPengerjaan,
    stimulusKasus: section.stimulusKasus,

    eksperimenData: section.eksperimenData,
    diferensiasiData: section.diferensiasiData,
    proyekData: section.proyekData,

    langkahAktivitas: section.langkahAktivitas,
    pertanyaanAnalisis: section.pertanyaanAnalisis,
    kesimpulanRefleksi: section.kesimpulanRefleksi,
  };
}

/**
 * Pembuat Alur Tujuan Pembelajaran (ATP) 1 Semester / 1 Tahun
 */
export function buildSmartATP(
  tpList: CustomTPItem[],
  profile: SchoolProfile
): ATPDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const plan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    profile.semester
  );

  const profilOptions = [
    ['Bernalar Kritis', 'Mandiri'],
    ['Gotong Royong', 'Bernalar Kritis'],
    ['Kreatif', 'Bernalar Kritis'],
    ['Mandiri', 'Bergotong Royong'],
  ];

  const items: ATPItem[] = tpList.map((tp, idx) => ({
    no: idx + 1,
    kodeTP: tp.kode,
    elemen: tp.elemen,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    profilPancasila: profilOptions[idx % profilOptions.length],
    indikatorKetercapaian: `Peserta didik mampu mendeskripsikan, menganalisis, dan menyelesaikan permasalahan yang berkaitan dengan ${tp.materiPokok} secara tepat dan mandiri.`,
    asesmen: 'Formatif (Observasi kinerja & LKPD) dan Sumatif (Tes tertulis lingkup materi)',
    kataKunci: tp.materiPokok.split(' ').slice(0, 3).join(', '),
  }));

  const totalJP = items.reduce((acc, it) => acc + it.alokasiJP, 0);

  return {
    id: `atp-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    capaianPembelajaranFase: plan.capaianPembelajaran,
    items,
    totalJP,
  };
}

/**
 * Pembuat Program Tahunan (Prota) Semester 1 & 2
 */
export function buildSmartProta(
  profile: SchoolProfile,
  tpListSem1: CustomTPItem[]
): ProtaDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);

  // Buat TP Semester 2 otomatis jika belum ada
  const planSem2 = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    '2 (Genap)'
  );

  const itemsSemester1: ProtaItem[] = tpListSem1.map((tp, idx) => ({
    no: idx + 1,
    semester: '1 (Ganjil)',
    kodeTP: tp.kode,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    keterangan: 'Tuntas Semester Ganjil',
  }));

  const itemsSemester2: ProtaItem[] = planSem2.tpList.map((tp, idx) => ({
    no: idx + 1,
    semester: '2 (Genap)',
    kodeTP: tp.kode,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    keterangan: 'Tuntas Semester Genap',
  }));

  const totalJPSemester1 = itemsSemester1.reduce((sum, it) => sum + it.alokasiJP, 0);
  const totalJPSemester2 = itemsSemester2.reduce((sum, it) => sum + it.alokasiJP, 0);

  return {
    id: `prota-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    itemsSemester1,
    itemsSemester2,
    totalJPSemester1,
    totalJPSemester2,
    totalJPTahunan: totalJPSemester1 + totalJPSemester2,
  };
}

/**
 * Pembuat Program Semester (Promes) Visual Minggu Efektif
 */
export function buildSmartPromes(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): PromesDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const isSem1 = !profile.semester.startsWith('2');

  const bulanList = isSem1
    ? [
        { nama: 'Juli', jumlahMinggu: 4, nonEfektif: [1] }, // M1: MPLS
        { nama: 'Agustus', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'September', jumlahMinggu: 4, nonEfektif: [4] }, // M4: PTS/STS
        { nama: 'Oktober', jumlahMinggu: 5, nonEfektif: [] },
        { nama: 'November', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'Desember', jumlahMinggu: 4, nonEfektif: [2, 3, 4] }, // PAS & Libur
      ]
    : [
        { nama: 'Januari', jumlahMinggu: 4, nonEfektif: [1] },
        { nama: 'Februari', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'Maret', jumlahMinggu: 4, nonEfektif: [3] }, // STS
        { nama: 'April', jumlahMinggu: 4, nonEfektif: [2] }, // Libur Idul Fitri / Hari Besar
        { nama: 'Mei', jumlahMinggu: 5, nonEfektif: [] },
        { nama: 'Juni', jumlahMinggu: 4, nonEfektif: [2, 3, 4] }, // SAS & Pembagian Rapor
      ];

  const columns: PromesMingguColumn[] = [];
  bulanList.forEach((bln) => {
    for (let m = 1; m <= bln.jumlahMinggu; m++) {
      const isEfektif = !bln.nonEfektif.includes(m);
      let labelKegiatan: string | undefined = undefined;
      if (!isEfektif) {
        if (bln.nama === 'Juli' && m === 1) labelKegiatan = 'MPLS';
        else if ((bln.nama === 'September' || bln.nama === 'Maret') && (m === 3 || m === 4)) labelKegiatan = 'STS';
        else if ((bln.nama === 'Desember' || bln.nama === 'Juni') && m === 2) labelKegiatan = 'SAS';
        else if ((bln.nama === 'Desember' || bln.nama === 'Juni') && m >= 3) labelKegiatan = 'Libur';
        else labelKegiatan = 'Non-Efektif';
      }
      columns.push({
        bulanNama: bln.nama,
        mingguKe: m,
        isEfektif,
        labelKegiatan,
      });
    }
  });

  // Distribusikan alokasi JP per TP ke minggu-minggu efektif secara berurutan
  let colPointer = 0;
  const rows: PromesRowItem[] = tpList.map((tp, idx) => {
    const jpPerWeek = 4; // Bawaan rata-rata 4 JP per minggu
    let sisaJP = Number(tp.alokasiJP) || 12;
    const distribusiJP: { [colIndex: number]: number } = {};

    while (sisaJP > 0 && colPointer < columns.length) {
      if (columns[colPointer].isEfektif) {
        const alokasi = Math.min(sisaJP, jpPerWeek);
        distribusiJP[colPointer] = alokasi;
        sisaJP -= alokasi;
        if (sisaJP <= 0) {
          colPointer++;
          break;
        }
      }
      colPointer++;
    }

    return {
      no: idx + 1,
      kodeTP: tp.kode,
      materiPokok: tp.materiPokok,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      alokasiJP: Number(tp.alokasiJP) || 12,
      distribusiJP,
    };
  });

  const totalJPEfektif = rows.reduce((sum, r) => sum + r.alokasiJP, 0);

  return {
    id: `promes-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    columns,
    rows,
    totalJPEfektif,
  };
}
