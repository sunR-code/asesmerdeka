import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 9. BANK SOAL PJOK / PENDIDIKAN JASMANI, OLAHRAGA, & KESEHATAN
// ============================================================================
export function buildPJOKQuestionBank(
  req: GenerationRequest,
  isSD: boolean,
  _isSMA: boolean
): QuestionBank {
  const topik = req.materiPokok;

  if (isSD) {
    return {
      capaianPembelajaran: `Peserta didik mampu memahami dan mempraktikkan gerak dasar lokomotor, non-lokomotor, dan manipulatif, serta menerapkan pola hidup sehat pada materi ${topik}.`,
      tujuanPembelajaranDefault: `Peserta didik dapat mengidentifikasi 3 pola gerak dasar, memahami fungsi pemanasan/pendinginan, dan menerapkan perilaku hidup sehat.`,
      pgPool: [
        {
          stimulus: `Saat bermain sepak bola di lapangan sekolah, Edo berlari cepat mengejar bola yang bergulir, kemudian melompat untuk menyundul bola ke arah gawang.`,
          pertanyaan: `Aktivitas berlari dan melompat yang dilakukan Edo termasuk dalam kategori gerak dasar ....`,
          opsi5: [
            'Lokomotor (berpindah tempat)',
            'Non-lokomotor (tidak berpindah tempat)',
            'Manipulatif (menguasai alat)',
            'Statis (diam di tempat)',
            'Refleks tanpa sadar',
          ],
          kunci: 'A',
          pembahasan:
            'Gerak lokomotor adalah gerakan anggota tubuh yang menyebabkan perpindahan posisi tubuh dari satu tempat ke tempat lain, seperti berjalan, berlari, dan melompat (Pilihan A).',
          levelKognitif: 'C2 (Mengidentifikasi Gerak Lokomotor)',
          indikatorSoal: 'Disajikan aktivitas olahraga, peserta didik dapat mengidentifikasi jenis gerak lokomotor.',
        },
        {
          stimulus: `Sebelum melakukan perlombaan lari, guru PJOK memimpin siswa melakukan peregangan statis dengan cara menekuk lutut, mengayunkan lengan, dan memutar pinggang di tempat.`,
          pertanyaan: `Gerakan menekuk lutut dan memutar pinggang tanpa berpindah tempat tersebut merupakan contoh gerak ....`,
          opsi5: [
            'Lokomotor',
            'Non-lokomotor',
            'Manipulatif',
            'Kombinasi cepat',
            'Irama bebas',
          ],
          kunci: 'B',
          pembahasan:
            'Gerak non-lokomotor adalah gerakan yang dilakukan di tempat tanpa menyebabkan tubuh berpindah posisi, contohnya mengayun, menekuk, memutar, dan meliuk (Pilihan B).',
          levelKognitif: 'C2 (Mengidentifikasi Gerak Non-Lokomotor)',
          indikatorSoal: 'Peserta didik dapat mengenali contoh gerak non-lokomotor pada pemanasan.',
        },
        {
          stimulus: `Pada permainan kasti, seorang regu penjaga melempar bola ke arah kawan dan menangkap bola lambung menggunakan sarung tangan dengan cermat.`,
          pertanyaan: `Keterampilan melempar dan menangkap bola menggunakan tangan termasuk dalam gerak dasar ....`,
          opsi5: [
            'Non-lokomotor',
            'Manipulatif',
            'Lokomotor',
            'Peregangan',
            'Kelenturan murni',
          ],
          kunci: 'B',
          pembahasan:
            'Gerak manipulatif adalah gerak yang melibatkan penguasaan atau tindakan terhadap suatu objek/alat olahraga, seperti melempar, menangkap, memukul, dan menendang bola (Pilihan B).',
          levelKognitif: 'C2 (Mengidentifikasi Gerak Manipulatif)',
          indikatorSoal: 'Disajikan permainan bola kasti, peserta didik dapat menentukan jenis gerak manipulatif.',
        },
        {
          stimulus: `Sebelum memulai latihan renang atau permainan bola basket, kita selalu diwajibkan melakukan gerakan pemanasan (warming up) selama 10 menit.`,
          pertanyaan: `Tujuan utama dilakukannya gerakan pemanasan sebelum berolahraga adalah ....`,
          opsi5: [
            'Membuat tubuh merasa lelah sebelum bertanding',
            'Menaikkan suhu otot, melenturkan persendian, dan mencegah cedera/kram',
            'Menghilangkan aturan pertandingan yang berlaku',
            'Menghabiskan waktu jam pelajaran olahraga',
            'Menggantikan kebutuhan minum air putih',
          ],
          kunci: 'B',
          pembahasan:
            'Pemanasan berfungsi menaikkan suhu tubuh secara bertahap, melancarkan sirkulasi darah ke otot, dan mempersiapkan persendian agar terhindar dari risiko cedera (Pilihan B).',
          levelKognitif: 'C3 (Memahami Fungsi Pemanasan)',
          indikatorSoal: 'Peserta didik dapat menjelaskan tujuan utama melakukan gerakan pemanasan olahraga.',
        },
        {
          stimulus: `Setelah selesai melakukan lari keliling lapangan dengan kencang, Udin tidak langsung duduk di lantai, melainkan berjalan perlahan sambil mengatur napas secara teratur (pendinginan/cooling down).`,
          pertanyaan: `Manfaat melakukan gerakan pendinginan setelah olahraga berat adalah ....`,
          opsi5: [
            'Menaikkan detak jantung setinggi mungkin',
            'Menstabilkan kembali detak jantung dan suhu tubuh secara bertahap',
            'Membakar seluruh energi yang tersisa di dalam tubuh',
            'Menghentikan aliran darah ke seluruh tubuh',
            'Membuat otot menjadi kaku dan tegang',
          ],
          kunci: 'B',
          pembahasan:
            'Pendinginan (cooling down) membantu menormalkan kembali detak jantung, mengembalikan suhu tubuh ke kondisi awal, dan mencegah penumpukan asam laktat yang memicu pegal (Pilihan B).',
          levelKognitif: 'C3 (Memahami Fungsi Pendinginan)',
          indikatorSoal: 'Peserta didik dapat menentukan manfaat melakukan cooling down setelah berolahraga.',
        },
        {
          stimulus: `Menjaga kebersihan diri merupakan bagian penting dari pola hidup sehat. Setelah berolahraga dan berkeringat, tindakan terbaik yang harus kita lakukan adalah ....`,
          pertanyaan: `Tindakan menjaga kebersihan diri yang paling tepat adalah ....`,
          opsi5: [
            'Langsung tidur di kasur dengan pakaian yang basah oleh keringat',
            'Mengelap keringat, mengganti pakaian yang bersih, dan mandi setelah suhu tubuh normal',
            'Membiarkan keringat menempel seharian tanpa mandi',
            'Minum air es secara berlebihan saat masih terengah-engah',
            'Menggunakan seragam olahraga yang kotor untuk belajar esok hari',
          ],
          kunci: 'B',
          pembahasan:
            'Kebersihan diri setelah berolahraga dijaga dengan mengeringkan keringat, mandi dengan air bersih setelah suhu stabil, dan berganti pakaian bersih agar terhindar dari penyakit kulit (Pilihan B).',
          levelKognitif: 'C3 (Menerapkan Pola Hidup Bersih & Sehat)',
          indikatorSoal: 'Peserta didik dapat menentukan tindakan pemeliharaan kebersihan diri pasca-olahraga.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Analisis Gerak Dasar dalam Cabang Olahraga:
Dalam setiap permainan seperti sepak bola dan basket, ketiga pola gerak dasar saling berkombinasi.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan gerak dasar berikut!',
          pernyataan: [
            { teks: 'Berlari menggiring bola ke gawang memadukan gerak lokomotor dan manipulatif.', isBenar: true },
            { teks: 'Menekuk lutut saat bersiap menerima servis bola voli adalah contoh gerak non-lokomotor.', isBenar: true },
            { teks: 'Melempar bola kasti sejauh-jauhnya termasuk kategori gerak lokomotor murni tanpa alat.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena melempar bola menggunakan tangan termasuk gerak manipulatif.',
          levelKognitif: 'C4 (Evaluasi Pola Gerak Dasar)',
          indikatorSoal: 'Peserta didik dapat memvalidasi klasifikasi gerak lokomotor, non-lokomotor, dan manipulatif.',
        },
        {
          stimulus: `Tahapan Latihan Fisik dan Kebugaran Jasmani:
Aktivitas fisik yang aman dan efektif selalu mengikuti urutan tahapan yang teratur.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap tahapan latihan di bawah ini!',
          pernyataan: [
            { teks: 'Pemanasan dilakukan di awal untuk melenturkan otot dan menaikkan suhu tubuh.', isBenar: true },
            { teks: 'Kita boleh langsung berlari cepat tanpa pemanasan asalkan meminum suplemen.', isBenar: false },
            { teks: 'Pendinginan (cooling down) membantu memulihkan detak jantung ke kondisi normal.', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena berolahraga berat tanpa pemanasan sangat berisiko memicu cedera otot dan kram.',
          levelKognitif: 'C4 (Mengevaluasi Prosedur Latihan Fisik)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi tahapan pemanasan, inti, dan pendinginan.',
        },
        {
          stimulus: `Nilai-Nilai Karakter dalam Berolahraga:
Olahraga beregu seperti kasti dan sepak bola mengajarkan kerja sama dan sportivitas.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap perilaku sportivitas berikut!',
          pernyataan: [
            { teks: 'Menjunjung tinggi fair play dan tidak melakukan kecurangan demi mengejar kemenangan.', isBenar: true },
            { teks: 'Mengakui keunggulan tim lawan dan memberi ucapan selamat setelah pertandingan usai.', isBenar: true },
            { teks: 'Menyalahkan teman satu tim ketika tim kita kebobolan atau kalah bertanding.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena kekalahan dalam tim harus dievaluasi bersama secara lapang dada tanpa saling menyalahkan.',
          levelKognitif: 'C3 (Menerapkan Nilai Sportivitas)',
          indikatorSoal: 'Peserta didik dapat memvalidasi sikap sportivitas dalam olahraga.',
        },
      ],
      uraianPool: [
        {
          stimulus: `3 Pola Gerak Dasar dalam Pendidikan Jasmani:
Keterampilan motorik anak dibangun melalui penguasaan gerak lokomotor, non-lokomotor, dan manipulatif.`,
          pertanyaan: `a) Jelaskan perbedaan antara gerak lokomotor, non-lokomotor, dan manipulatif!
b) Berikan masing-masing 2 contoh nyata untuk setiap jenis gerak tersebut pada permainan sepak bola!`,
          pedomanPenskoran: `Skor 20: Menjelaskan ketiga pengertian gerak dasar dengan tepat (9 poin) dan memberikan masing-masing 2 contoh konkret sepak bola (11 poin).`,
          contohJawaban: `a) Pengertian:
• Gerak Lokomotor: Gerakan berpindah tempat dari satu posisi ke posisi lain.
• Gerak Non-Lokomotor: Gerakan anggota tubuh yang dilakukan di tempat tanpa berpindah posisi.
• Gerak Manipulatif: Gerakan yang melibatkan penguasaan atau tindakan terhadap suatu alat/objek (bola).

b) Contoh pada sepak bola:
• Lokomotor: Berlari mengejar bola dan melompat menyundul bola.
• Non-Lokomotor: Menekuk lutut saat menjaga lawan dan mengayunkan kaki sebelum menendang.
• Manipulatif: Menendang bola ke gawang dan menangkap bola (bagi penjaga gawang).`,
          levelKognitif: 'C4 (Menguraikan 3 Macam Gerak Dasar)',
          indikatorSoal: 'Peserta didik dapat membedakan 3 gerak dasar dan memberikan contoh pada permainan sepak bola.',
        },
        {
          stimulus: `Pentingnya Pemanasan dan Pendinginan saat Berolahraga:
Guru PJOK selalu menekankan agar siswa tidak melewatkan sesi pemanasan sebelum olahraga dan pendinginan setelahnya.`,
          pertanyaan: `a) Mengapa kita wajib melakukan pemanasan sebelum olahraga berat?
b) Mengapa pendinginan (cooling down) tidak boleh diabaikan setelah berolahraga?`,
          pedomanPenskoran: `Skor 20: Menjelaskan fungsi pemanasan secara fisiologis (10 poin) dan fungsi pendinginan secara fisiologis (10 poin).`,
          contohJawaban: `a) Fungsi Pemanasan:
Pemanasan wajib dilakukan untuk menaikkan suhu tubuh dan elastisitas otot secara bertahap, melancarkan peredaran darah, serta melenturkan persendian sehingga otot tidak kaget dan terhindar dari cedera atau kram saat latihan berat.

b) Fungsi Pendinginan:
Pendinginan tidak boleh diabaikan karena berfungsi menormalkan kembali denyut jantung dan tekanan darah secara perlahan, mengalirkan oksigen ke seluruh otot, serta menguraikan penumpukan asam laktat agar tubuh tidak mengalami pegal-pegal atau pusing setelah olahraga selesai.`,
          levelKognitif: 'C4 (Menganalisis Fisiologi Latihan Fisik)',
          indikatorSoal: 'Peserta didik dapat menjelaskan alasan pentingnya pemanasan dan pendinginan.',
        },
        {
          stimulus: `Penerapan Pola Hidup Bersih dan Sehat (PHBS) Sehari-hari:
Kesehatan jasmani tidak hanya diperoleh dari latihan fisik, tetapi juga didukung oleh pola makan dan istirahat yang seimbang.`,
          pertanyaan: `Sebutkan dan jelaskan 3 kebiasaan hidup sehat yang harus diterapkan siswa agar memiliki daya tahan tubuh yang kuat dan bugar!`,
          pedomanPenskoran: `Skor 20: Menyebutkan dan menjelaskan 3 kebiasaan hidup sehat secara lengkap dan logis (masing-masing bernilai ~7 poin).`,
          contohJawaban: `Tiga kebiasaan hidup sehat:
1. Mengonsumsi makanan bergizi seimbang: Makan makanan yang mengandung karbohidrat, protein, sayuran, dan buah-buahan (prinsip Isi Piringku) serta minum air putih minimal 8 gelas sehari.
2. Istirahat dan tidur yang cukup: Tidur teratur selama 8-9 jam setiap malam agar sel-sel tubuh dan otak dapat beristirahat dan memulihkan energi.
3. Menjaga kebersihan diri dan lingkungan: Rutin mencuci tangan menggunakan sabun, mandi setelah beraktivitas berkeringat, serta menjaga kebersihan kamar dan lingkungan sekolah.`,
          levelKognitif: 'C4 (Merumuskan Kebiasaan Hidup Sehat)',
          indikatorSoal: 'Peserta didik dapat merumuskan 3 kebiasaan pola hidup bersih dan sehat.',
        },
      ],
    };
  }

  // SMP / SMA PJOK
  return {
    capaianPembelajaran: `Peserta didik mampu menganalisis taktik cabang olahraga beregu, komponen kebugaran jasmani, serta penanganan cedera akut pada materi ${topik}.`,
    tujuanPembelajaranDefault: `Peserta didik mampu mengevaluasi prinsip latihan kebugaran jasmani, menganalisis taktik permainan, dan menerapkan pertolongan pertama pada cedera.`,
    pgPool: [
      {
        stimulus: `Dalam permainan bola basket, sebuah regu menerapkan pola penyerangan cepat (fast break) saat tim lawan gagal mencetak angka dan berada dalam posisi transisi bertahan yang longgar.`,
        pertanyaan: `Kunci utama keberhasilan eksekusi taktik fast break dalam bola basket sangat ditentukan oleh ....`,
        opsi5: [
          'Penguasaan bola berlama-lama di area pertahanan sendiri',
          'Kecepatan transisi, operan panjang akurat, dan penyelesaian ruang kosong secara efisien',
          'Pelanggaran sengaja terhadap pemain lawan',
          'Jumlah pergantian pemain yang dilakukan pelatih',
          'Tinggi badan wasit yang memimpin pertandingan',
        ],
        kunci: 'B',
        pembahasan:
          'Taktik fast break mengandalkan kecepatan perpindahan bola secara kilat sebelum lawan membentuk formasi pertahanan terorganisir (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Taktik Permainan Beregu)',
        indikatorSoal: 'Disajikan situasi bola basket, peserta didik dapat menentukan faktor kunci keberhasilan penyerangan cepat.',
      },
      {
        stimulus: `Saat menjalani tes kebugaran jasmani (TKJI), seorang siswa melakukan lari bolak-balik memindahkan balok (Shuttle Run) sejauh 10 meter sebanyak 4 kali putaran dengan kecepatan maksimal.`,
        pertanyaan: `Komponen kebugaran jasmani yang paling dominan diukur melalui tes Shuttle Run adalah ....`,
        opsi5: [
          'Daya tahan jantung-paru (aerobik)',
          'Kelincahan (Agility) dan koordinasi arah gerak',
          'Kelenturan sendi panggul',
          'Kekuatan statis otot perut',
          'Daya ledak otot dada',
        ],
        kunci: 'B',
        pembahasan:
          'Tes Shuttle Run (lari bolak-balik) dirancang secara spesifik untuk mengukur kelincahan (agility), yaitu kemampuan mengubah arah gerak tubuh secara cepat tanpa kehilangan keseimbangan (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Komponen Kebugaran Jasmani)',
        indikatorSoal: 'Disajikan tes shuttle run, peserta didik dapat mengidentifikasi komponen kebugaran yang diukur.',
      },
      {
        stimulus: `Saat bermain sepak bola, seorang pemain mengalami benturan keras pada pergelangan kaki (ankle) yang menyebabkan pembengkakan akut dan rasa nyeri hebat.`,
        pertanyaan: `Langkah pertolongan pertama paling tepat sesuai protokol medis olahraga RICE (Rest, Ice, Compression, Elevation) adalah ....`,
        opsi5: [
          'Segera mengurut dan memijat bagian cedera dengan minyak panas',
          'Mengistirahatkan bagian cedera, mengompres dengan es batu, membalut tekan dengan perban elastis, dan meninggikan posisi kaki',
          'Memaksa pemain berdiri dan melanjutkan pertandingan',
          'Merendam pergelangan kaki dalam air hangat mendidih',
          'Mengoleskan balsem panas dan membiarkannya berjalan sendiri',
        ],
        kunci: 'B',
        pembahasan:
          'Protokol RICE (Rest, Ice, Compression, Elevation) merupakan standar pertolongan pertama cedera jaringan lunak akut untuk menekan pendarahan dalam dan pembengkakan. Mengurut atau memanaskan bagian cedera baru justru memperparah robekan ligamen (Pilihan B).',
        levelKognitif: 'C4 (Menerapkan Protokol Pertolongan Pertama Cedera)',
        indikatorSoal: 'Disajikan kasus cedera ankle, peserta didik dapat menentukan prosedur RICE yang tepat.',
      },
      {
        stimulus: `Dalam merancang program latihan peningkatan kebugaran jasmani mandiri, seorang atlet menerapkan prinsip FITT yang meliputi Frekuensi, Intensitas, Waktu (Time), dan Jenis Latihan (Type).`,
        pertanyaan: `Penyesuaian variabel "Intensitas" dalam latihan daya tahan kardiorespirasi (aerobik) biasanya diukur berdasarkan ....`,
        opsi5: [
          'Banyaknya keringat yang keluar dari baju',
          'Persentase Denyut Nadi Maksimal (DNM = 220 - Usia)',
          'Waktu lamanya tidur siang setelah latihan',
          'Harga sepatu olahraga yang dikenakan',
          'Jumlah suplemen makanan yang diminum',
        ],
        kunci: 'B',
        pembahasan:
          'Intensitas latihan aerobik diukur secara objektif melalui denyut nadi latihan, lazimnya berada di zona target latihan (65%–85% dari Denyut Nadi Maksimal) (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Variabel Intensitas Latihan FITT)',
        indikatorSoal: 'Peserta didik dapat mengidentifikasi tolok ukur intensitas latihan kardiorespirasi.',
      },
      {
        stimulus: `Dalam permainan bola voli modern, pemain yang bertindak sebagai Libero memiliki aturan khusus yang diatur dalam regulasi resmi FIVB.`,
        pertanyaan: `Karakteristik peran dan batasan bagi pemain Libero dalam permainan bola voli adalah ....`,
        opsi5: [
          'Boleh melakukan pukulan smash menyerang dari depan net',
          'Boleh melakukan servis keras melompat dari garis belakang',
          'Berposisi murni sebagai pemain bertahan dan dilarang melakukan smash di atas net maupun servis',
          'Bertindak sebagai kapten utama yang memimpin pergantian pemain',
          'Boleh menghadang (block) serangan lawan di depan net',
        ],
        kunci: 'C',
        pembahasan:
          'Pemain Libero mengenakan seragam warna berbeda dan bertugas murni sebagai spesialis bertahan (receive/dig). Libero dilarang melakukan smash serang saat bola di atas tinggi net, dilarang melakukan servis, dan dilarang melakukan blocking (Pilihan C).',
        levelKognitif: 'C3 (Memahami Aturan Khusus Posisi Libero)',
        indikatorSoal: 'Disajikan posisi libero bola voli, peserta didik dapat mengidentifikasi aturan pembatasannya.',
      },
      {
        stimulus: `Seorang siswa yang rutin berlatih kebugaran jasmani selama 3 bulan mengalami penurunan denyut nadi istirahat (resting heart rate) dari 80 denyut per menit menjadi 62 denyut per menit.`,
        pertanyaan: `Penurunan denyut nadi istirahat tersebut membuktikan bahwa ....`,
        opsi5: [
          'Kondisi jantung siswa tersebut mengalami kelemahan otot',
          'Volume sekuncup jantung (stroke volume) meningkat sehingga pompa darah lebih efisien',
          'Siswa tersebut mengalami penyumbatan pembuluh darah',
          'Paru-paru siswa tersebut kehilangan kapasitas vital udara',
          'Siswa tersebut harus segera menghentikan aktivitas fisik',
        ],
        kunci: 'B',
        pembahasan:
          'Efek positif dari latihan aerobik rutin (bradikardia atletis) adalah otot ventrikel jantung menguat dan volume sekuncup (stroke volume) meningkat, sehingga jantung memompa lebih banyak darah per denyut dan berdetak lebih efisien saat istirahat (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Adaptasi Fisiologis Kardiovaskular)',
        indikatorSoal: 'Disajikan data penurunan denyut nadi istirahat, peserta didik dapat menganalisis adaptasi efisiensi jantung.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Prinsip Latihan dan Kebugaran Kardiorespirasi (FITT):
Latihan kebugaran harus dilakukan secara terukur agar memicu adaptasi fisiologis yang positif.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan prinsip latihan berikut!',
        pernyataan: [
          { teks: 'Target zona latihan aerobik efektif berada pada rentang 65%–85% dari denyut nadi maksimal.', isBenar: true },
          { teks: 'Latihan fisik berintensitas tinggi wajib dilakukan setiap hari tanpa memberikan hari istirahat pemulihan otot.', isBenar: false },
          { teks: 'Prinsip overload progresif berarti beban latihan ditingkatkan secara bertahap sesuai kemampuan adaptasi tubuh.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena waktu istirahat (recovery) sangat krusial bagi regenerasi serat otot dan mencegah overtraining.',
        levelKognitif: 'C4 (Evaluasi Prinsip Latihan FITT)',
        indikatorSoal: 'Peserta didik dapat memvalidasi kaidah latihan kebugaran jasmani.',
      },
      {
        stimulus: `Manajemen Pertolongan Pertama Cedera Olahraga (Metode RICE):
Penanganan yang tepat pada 24-48 jam pertama sangat menentukan kecepatan pemulihan cedera jaringan lunak.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap tindakan penanganan cedera berikut!',
        pernyataan: [
          { teks: 'Kompres es dilakukan selama 15-20 menit secara berkala untuk menyempitkan pembuluh darah dan menekan bengkak.', isBenar: true },
          { teks: 'Mengurut atau memijat keras bagian ligamen yang baru terkilir dapat memutus serat jaringan yang sedang robek.', isBenar: true },
          { teks: 'Posisi bagian cedera sebaiknya diletakkan lebih rendah dari posisi jantung agar darah mengalir deras ke sana.', isBenar: false },
        ],
        pembahasan:
          'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena elevasi justru mengharuskan bagian cedera ditinggikan di atas permukaan jantung untuk mengurangi penumpukan cairan edema.',
        levelKognitif: 'C4 (Evaluasi Tindakan RICE)',
        indikatorSoal: 'Peserta didik dapat mengevaluasi prosedur penanganan cedera akut.',
      },
      {
        stimulus: `Taktik Permainan Beregu dan Sportivitas Kompetisi:
Keberhasilan strategi olahraga ditopang oleh kekompakan tim dan disiplin taktis pemain.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan taktik di bawah ini!',
        pernyataan: [
          { teks: 'Pola pertahanan zona (zone defense) mengutamakan penjagaan wilayah ruang gerak daripada membuntuti satu pemain secara individu.', isBenar: true },
          { teks: 'Melakukan pelanggaran kasar secara sengaja adalah strategi terpuji asalkan mampu menghentikan gol lawan.', isBenar: false },
          { teks: 'Komunikasi verbal dan non-verbal yang efektif antarpemain mempercepat koordinasi formasi saat bertahan.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena mencederai lawan dengan sengaja melanggar prinsip sportivitas dan terancam kartu merah.',
        levelKognitif: 'C4 (Menganalisis Taktik dan Etika Bertanding)',
        indikatorSoal: 'Peserta didik dapat memvalidasi taktik pertahanan dan etika sportivitas.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Penyusunan Program Latihan Kebugaran Mandiri (FITT):
Seorang pelajar SMA ingin meningkatkan daya tahan jantung-paru (kardiorespirasi) dan menurunkan persentase lemak tubuh.`,
        pertanyaan: `Rancanglah sebuah rencana program latihan mingguan berbasis prinsip FITT (Frequency, Intensity, Time, Type) secara terstruktur!`,
        pedomanPenskoran: `Skor 20: Merumuskan Frekuensi (5 poin), Intensitas (5 poin), Durasi Waktu (5 poin), dan Jenis Latihan (5 poin) secara spesifik dan logis.`,
        contohJawaban: `Rencana Program Latihan Kardiorespirasi FITT:
1. Frequency (Frekuensi): 3–4 kali seminggu diselingi hari istirahat (misal Senin, Rabu, Jumat, Minggu).
2. Intensity (Intensitas): Intensitas moderat di zona target 65%–75% dari Denyut Nadi Maksimal (DNM = 220 - Usia).
3. Time (Waktu): Durasi latihan 30–45 menit per sesi, didahului pemanasan 10 menit dan diakhiri pendinginan 10 menit.
4. Type (Jenis Latihan): Latihan aerobik berirama teratur seperti jogging, bersepeda, berenang, atau lompat tali (skipping).`,
        levelKognitif: 'C6 (Merancang Program Kebugaran Jasmani FITT)',
        indikatorSoal: 'Peserta didik mampu merancang program latihan aerobik berbasis prinsip FITT.',
      },
      {
        stimulus: `Prosedur Penanganan Cedera Akut Olahraga (Protokol RICE):
Dalam sebuah pertandingan futsal, seorang pemain terjatuh dengan posisi pergelangan kaki tertekuk ke dalam dan merasakan sakit luar biasa.`,
        pertanyaan: `a) Jelaskan langkah-langkah pertolongan pertama menggunakan metode RICE secara terperinci!
b) Mengapa pada 48 jam pertama bagian cedera DILARANG diurut (massage) atau diberi kompres panas?`,
        pedomanPenskoran: `Skor 20: Menjelaskan 4 tahapan RICE (12 poin) dan menjelaskan alasan larangan massage/kompres panas akut (8 poin).`,
        contohJawaban: `a) Langkah-langkah RICE:
1. Rest (Istirahat): Segera hentikan aktivitas olahraga dan jangan biarkan bagian cedera menumpu beban tubuh.
2. Ice (Kompres Es): Tempelkan es yang dibalut kain selama 15–20 menit setiap 2–3 jam untuk menyempitkan pembuluh darah dan meredakan nyeri.
3. Compression (Balut Tekan): Balut area cedera menggunakan perban elastis (tidak terlalu ketat) untuk membatasi pembengkakan.
4. Elevation (Meninggikan): Posisikan bagian cedera lebih tinggi dari posisi jantung agar aliran darah balik lancar dan penumpukan cairan edema berkurang.

b) Alasan larangan kompres panas/massage pada fase akut:
Karena pada 48 jam pertama terjadi robekan kapiler darah mikro di area cedera. Memberikan panas (vasodilatasi) atau memijat/mengurut justru memperlebar robekan pembuluh darah, memicu pendarahan internal lebih luas, memperparah pembengkakan, dan memperlama masa penyembuhan jaringan ligamen.`,
        levelKognitif: 'C5 (Mengevaluasi Penanganan Medis Cedera Olahraga)',
        indikatorSoal: 'Peserta didik dapat menguraikan prosedur RICE dan alasan medis larangan perlakuan panas.',
      },
      {
        stimulus: `Analisis Taktik Menyerang dan Bertahan dalam Olahraga Beregu:
Setiap formasi olahraga beregu (seperti sepak bola atau bola voli) dirancang untuk memanfaatkan kelemahan lawan dan menutupi celah sendiri.`,
        pertanyaan: `Jelaskan perbedaan mendasar antara taktik pertahanan "Man-to-Man Marking" dengan "Zone Defense", serta sebutkan kelebihan dan kelemahan masing-masing!`,
        pedomanPenskoran: `Skor 20: Menjelaskan pengertian kedua taktik (10 poin) serta menganalisis kelebihan dan kelemahannya (10 poin).`,
        contohJawaban: `1. Man-to-Man Marking:
• Konsep: Setiap pemain bertahan ditugaskan membayangi dan menjaga satu pemain lawan tertentu secara ketat ke mana pun bergerak.
• Kelebihan: Mempersempit ruang gerak pemain kunci lawan dan mencegah operan bebas.
• Kelemahan: Menguras fisik dan jika satu pemain bertahan berhasil dilewati lawan, formasi pertahanan langsung runtuh (terbuka celah fatal).

2. Zone Defense:
• Konsep: Setiap pemain bertahan bertanggung jawab menjaga zona/wilayah tertentu di area pertahanannya sendiri.
• Kelebihan: Menghemat stamina pemain, menutup ruang tembak di area berbahaya, dan memudahkan skema serangan balik cepat (counter attack).
• Kelemahan: Rentan ditembus jika pemain lawan melakukan pergerakan silang (overload) atau memiliki pemain dengan akurasi tembakan jarak jauh yang tinggi.`,
        levelKognitif: 'C5 (Menganalisis Taktik Pertahanan Olahraga Beregu)',
        indikatorSoal: 'Peserta didik dapat membandingkan taktik man-to-man marking dan zone defense.',
      },
    ],
  };
}

// ============================================================================
// 10. BANK SOAL SENI BUDAYA & PRAKARYA (SENI RUPA, MUSIK, SBdP)
// ============================================================================
export function buildSeniPrakaryaQuestionBank(
  req: GenerationRequest,
  isSD: boolean,
  _isSMA: boolean
): QuestionBank {
  const topik = req.materiPokok;

  if (isSD) {
    return {
      capaianPembelajaran: `Peserta didik mampu mengenal unsur seni rupa (garis, bentuk, warna), membedakan warna primer/sekunder, alat musik ritmis/melodis, serta kreasi prakarya bahan alam pada materi ${topik}.`,
      tujuanPembelajaranDefault: `Peserta didik dapat mengidentifikasi warna pokok dan campurannya, membedakan alat musik ritmis dan melodis, serta membuat kerajinan ramah lingkungan.`,
      pgPool: [
        {
          stimulus: `Saat menggambar pemandangan taman bunga di buku gambar, Siti menggunakan warna Merah, Kuning, dan Biru.`,
          pertanyaan: `Warna Merah, Kuning, dan Biru dalam teori seni rupa disebut sebagai kelompok warna ....`,
          opsi5: [
            'Primer (Warna Pokok)',
            'Sekunder (Warna Campuran)',
            'Tersier',
            'Gelap-terang',
            'Monokrom',
          ],
          kunci: 'A',
          pembahasan:
            'Warna primer adalah warna pokok/dasar yang tidak dapat dihasilkan dari percampuran warna lain, yaitu Merah, Kuning, dan Biru (Pilihan A).',
          levelKognitif: 'C2 (Mengenal Warna Primer)',
          indikatorSoal: 'Disajikan kelompok warna dasar, peserta didik dapat mengidentifikasi warna primer.',
        },
        {
          stimulus: `Edo ingin mewarnai gambar daun pohon kelapa dengan warna Hijau, namun di kotak cat airnya hanya tersisa cat warna Merah, Kuning, dan Biru.`,
          pertanyaan: `Untuk menghasilkan warna Hijau (warna sekunder), dua warna primer yang harus dicampurkan Edo adalah ....`,
          opsi5: [
            'Merah dan Kuning',
            'Kuning dan Biru',
            'Biru dan Merah',
            'Merah dan Putih',
            'Kuning dan Hitam',
          ],
          kunci: 'B',
          pembahasan:
            'Pencampuran warna primer Kuning dan Biru dalam takaran yang sama akan menghasilkan warna sekunder Hijau (Pilihan B).',
          levelKognitif: 'C3 (Menerapkan Percampuran Warna)',
          indikatorSoal: 'Peserta didik dapat menentukan pasangan warna primer untuk menghasilkan warna hijau.',
        },
        {
          stimulus: `Dalam kegiatan bernyanyi bersama di kelas, Beni memainkan alat musik rebana dan tamborin dengan cara dipukul untuk mengatur ketukan dan irama lagu.`,
          pertanyaan: `Alat musik seperti rebana, tamborin, gendang, dan marakas yang tidak memiliki tangga nada pasti disebut alat musik ....`,
          opsi5: [
            'Melodis',
            'Ritmis',
            'Harmonis',
            'Elektronik',
            'Tiup modern',
          ],
          kunci: 'B',
          pembahasan:
            'Alat musik ritmis adalah alat musik yang berfungsi mengatur tempo dan irama lagu serta tidak memiliki tangga nada lagu yang tetap (Pilihan B).',
          levelKognitif: 'C2 (Mengidentifikasi Alat Musik Ritmis)',
          indikatorSoal: 'Disajikan alat musik pukul, peserta didik dapat mengklasifikasikan alat musik ritmis.',
        },
        {
          stimulus: `Ibu guru mengajarkan lagu "Pelangi-Pelangi" menggunakan alat musik pianika dan rekorder yang ditiup untuk menghasilkan nada do-re-mi-fa-sol yang merdu.`,
          pertanyaan: `Alat musik yang berfungsi memainkan rangkaian tangga nada melodi lagu disebut alat musik ....`,
          opsi5: [
            'Ritmis',
            'Melodis',
            'Perkusi murni',
            'Akustik tanpa nada',
            'Pengiring tempo',
          ],
          kunci: 'B',
          pembahasan:
            'Alat musik melodis berfungsi menghasilkan rangkaian melodi nada lagu (misal: pianika, rekorder, biola, gitar) (Pilihan B).',
          levelKognitif: 'C2 (Mengidentifikasi Alat Musik Melodis)',
          indikatorSoal: 'Peserta didik dapat mengidentifikasi fungsi alat musik melodis.',
        },
        {
          stimulus: `Untuk membuat karya seni kolase berbentuk burung merak, Lani mengumpulkan biji jagung, biji kacang hijau, beras merah, dan potongan daun kering yang ada di halaman rumahnya.`,
          pertanyaan: `Bahan-bahan yang digunakan Lani tersebut termasuk dalam kelompok bahan karya seni yang berasal dari ....`,
          opsi5: [
            'Bahan alam ramah lingkungan',
            'Bahan sintetis kimiawi',
            'Logam tembaga mulia',
            'Kaca patri industri',
            'Plastik buatan pabrik',
          ],
          kunci: 'A',
          pembahasan:
            'Biji-bijian, daun kering, cangkang telur, dan ranting adalah contoh bahan alam yang mudah ditemukan dan ramah lingkungan untuk kerajinan kolase (Pilihan A).',
          levelKognitif: 'C2 (Mengidentifikasi Bahan Alam Kerajinan)',
          indikatorSoal: 'Peserta didik dapat mengklasifikasikan bahan alam dalam karya kolase.',
        },
        {
          stimulus: `Saat menarikan tarian tradisional gembira di atas panggung, penari melangkah ke kanan, melangkah ke kiri, membentuk lingkaran, dan maju ke depan.`,
          pertanyaan: `Garis lintasan imajiner yang dilalui oleh penari di atas lantai saat bergerak disebut ....`,
          opsi5: [
            'Pola lantai',
            'Kostum tata rias',
            'Irama birama',
            'Properti pentas',
            'Dekorasi latar',
          ],
          kunci: 'A',
          pembahasan:
            'Pola lantai adalah garis lintasan yang dilalui oleh penari pada saat melakukan gerak tari di atas panggung (misal garis lurus, zig-zag, atau lingkaran) (Pilihan A).',
          levelKognitif: 'C2 (Mengenal Pola Lantai Gerak Tari)',
          indikatorSoal: 'Peserta didik dapat menentukan istilah garis pergerakan penari di panggung.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Teori Unsur Seni Rupa dan Pencampuran Warna:
Warna memberikan kesan suasana dan keindahan pada setiap karya lukisan.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan percampuran warna berikut!',
          pernyataan: [
            { teks: 'Warna Merah dicampur warna Kuning akan menghasilkan warna Oranye/Jingga.', isBenar: true },
            { teks: 'Warna Biru dicampur warna Kuning menghasilkan warna Hijau.', isBenar: true },
            { teks: 'Warna Primer dapat diciptakan dari campuran warna hitam dan putih.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena warna primer adalah warna murni yang tidak bisa dibuat dari campuran warna apa pun.',
          levelKognitif: 'C3 (Memvalidasi Campuran Warna)',
          indikatorSoal: 'Peserta didik dapat memvalidasi formula pencampuran warna primer dan sekunder.',
        },
        {
          stimulus: `Klasifikasi Alat Musik Ritmis dan Melodis:
Kombinasi alat musik ritmis dan melodis menghasilkan aransemen lagu yang harmonis.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pasangan alat musik di bawah ini!',
          pernyataan: [
            { teks: 'Rebana dan tamborin berfungsi sebagai alat musik ritmis pengatur tempo.', isBenar: true },
            { teks: 'Pianika dan rekorder termasuk alat musik melodis karena dapat memainkan notasi lagu.', isBenar: true },
            { teks: 'Gendang adalah alat musik melodis yang memiliki tuts nada do-re-mi.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena gendang tidak memiliki tuts/tangga nada, melainkan berfungsi sebagai alat musik ritmis.',
          levelKognitif: 'C4 (Memvalidasi Penggolongan Alat Musik)',
          indikatorSoal: 'Peserta didik dapat mengklasifikasikan alat musik ritmis dan melodis.',
        },
        {
          stimulus: `Kreasi Kerajinan Kolase dan Mozaik:
Membuat kerajinan tangan melatih ketelitian motorik halus dan rasa keindahan.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap langkah berkarya kolase berikut!',
          pernyataan: [
            { teks: 'Membuat sketsa gambar pola terlebih dahulu sebelum menempelkan bahan alam.', isBenar: true },
            { teks: 'Mengoleskan lem secara bertahap agar bahan biji-bijian menempel kuat dan rapi.', isBenar: true },
            { teks: 'Bahan alam yang basah dan berjamur sangat baik digunakan untuk kolase kertas.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena bahan alam yang digunakan harus bersih dan kering agar tidak berjamur atau merusak kertas.',
          levelKognitif: 'C3 (Mengevaluasi Langkah Berkarya Seni)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi tahapan pembuatan karya kolase.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Teori Dasar Warna dalam Seni Rupa:
Warna terbagi menjadi warna primer, warna sekunder, dan warna netral.`,
          pertanyaan: `a) Apa yang dimaksud dengan Warna Primer dan sebutkan 3 contoh warnanya!
b) Bagaimana cara menghasilkan warna sekunder: Oranye, Hijau, dan Ungu?`,
          pedomanPenskoran: `Skor 20: Menjelaskan warna primer & 3 warnanya (8 poin) serta menjelaskan formula pencampuran warna sekunder (12 poin).`,
          contohJawaban: `a) Pengertian Warna Primer:
Warna primer adalah warna pokok atau warna dasar yang tidak dapat diperoleh dari percampuran warna-warna lain. Tiga warna primer adalah: Merah, Kuning, dan Biru.

b) Cara menghasilkan warna sekunder:
1. Warna Oranye / Jingga = campuran warna Merah + Kuning.
2. Warna Hijau = campuran warna Kuning + Biru.
3. Warna Ungu = campuran warna Biru + Merah.`,
          levelKognitif: 'C4 (Menguraikan Teori Warna)',
          indikatorSoal: 'Peserta didik dapat menjelaskan warna primer dan formula pencampuran warna sekunder.',
        },
        {
          stimulus: `Mengenal Ragam Alat Musik Pengiring Lagu:
Dalam pelajaran seni musik, kita mengenal pembagian alat musik berdasarkan fungsinya.`,
          pertanyaan: `Jelaskan perbedaan mendasar antara ALAT MUSIK RITMIS dan ALAT MUSIK MELODIS serta berikan masing-masing 2 contoh alat musiknya!`,
          pedomanPenskoran: `Skor 20: Menjelaskan perbedaan ritmis dan melodis (10 poin) serta memberikan 2 contoh konkret masing-masing (10 poin).`,
          contohJawaban: `Perbedaan alat musik:
• Alat Musik Ritmis: Alat musik yang berfungsi mengatur tempo, irama, dan ketukan lagu. Alat musik ini tidak memiliki tangga nada lagu yang pasti.
  Contohnya: Tamborin, Rebana, Gendang, dan Marakas.
• Alat Musik Melodis: Alat musik yang berfungsi memainkan rangkaian notasi/melodi lagu (memiliki tangga nada yang jelas seperti do-re-mi).
  Contohnya: Pianika, Rekorder, Gitar, dan Biola.`,
          levelKognitif: 'C4 (Membedakan Alat Musik Ritmis & Melodis)',
          indikatorSoal: 'Peserta didik dapat membedakan fungsi alat musik ritmis dan melodis beserta contohnya.',
        },
        {
          stimulus: `Kreativitas Pembuatan Kerajinan Tangan Ramah Lingkungan:
Siswa diajak memanfaatkan bahan-bahan yang ada di sekitar rumah untuk membuat karya seni tempel kolase.`,
          pertanyaan: `Tuliskan 4 tahapan berurutan dalam membuat karya seni kolase dari bahan alam (daun kering / biji-bijian) agar hasilnya indah dan rapi!`,
          pedomanPenskoran: `Skor 20: Menguraikan 4 tahapan pembuatan kolase secara runtut dan sistematis (masing-masing 5 poin).`,
          contohJawaban: `Empat tahapan pembuatan kolase bahan alam:
1. Menentukan tema dan menggambar sketsa pola gambar pada kertas gambar (misal gambar kupu-kupu atau bunga).
2. Mempersiapkan dan membersihkan bahan alam (daun kering dipotong sesuai bentuk atau biji-bijian disortir warnanya).
3. Mengoleskan lem secara bertahap pada permukaan pola gambar yang akan diisi bahan.
4. Menempelkan bahan alam secara teliti dan rapat mengikuti garis pola hingga seluruh gambar tertutup rapi, kemudian dikeringkan.`,
          levelKognitif: 'C4 (Menyusun Tahapan Pembuatan Kolase)',
          indikatorSoal: 'Peserta didik dapat menyusun langkah-langkah membuat kolase bahan alam secara berurutan.',
        },
      ],
    };
  }

  // SMP / SMA Seni Budaya
  return buildContextualGeneralQuestionBank(req, _isSMA);
}

// ============================================================================
// 11. BANK SOAL ILMU PENGETAHUAN SOSIAL (IPS, EKONOMI, SEJARAH, GEOGRAFI)
// ============================================================================
export function buildIPSQuestionBank(
  req: GenerationRequest,
  isSD: boolean,
  _isSMA: boolean
): QuestionBank {
  const topik = req.materiPokok;

  if (isSD) {
    return {
      capaianPembelajaran: `Peserta didik mampu memahami kebutuhan hidup, 3 kegiatan ekonomi, kenampakan alam, serta peninggalan sejarah dan keragaman budaya nusantara pada materi ${topik}.`,
      tujuanPembelajaranDefault: `Peserta didik dapat membedakan kebutuhan primer dan sekunder, menjelaskan kegiatan produksi-distribusi-konsumsi, serta mengenal pahlawan dan keragaman nusantara.`,
      pgPool: [
        {
          stimulus: `Manusia memiliki berbagai macam kebutuhan untuk melangsungkan hidupnya. Makanan bergizi, pakaian bersih, dan tempat tinggal yang aman merupakan kebutuhan pokok yang wajib dipenuhi terlebih dahulu.`,
          pertanyaan: `Kebutuhan pokok manusia yang mutlak harus dipenuhi agar dapat bertahan hidup disebut kebutuhan ....`,
          opsi5: [
            'Primer (Pokok)',
            'Sekunder (Tambahan)',
            'Tersier (Mewah)',
            'Musiman',
            'Mendadak',
          ],
          kunci: 'A',
          pembahasan:
            'Kebutuhan primer adalah kebutuhan paling pokok yang harus dipenuhi untuk mempertahankan kelangsungan hidup manusia, meliputi sandang (pakaian), pangan (makanan), dan papan (tempat tinggal) (Pilihan A).',
          levelKognitif: 'C2 (Mengenal Kebutuhan Primer)',
          indikatorSoal: 'Disajikan kebutuhan pangan dan sandang, peserta didik dapat mengidentifikasi kebutuhan primer.',
        },
        {
          stimulus: `Pak Made menanam padi di sawah hingga panen. Beras hasil panen tersebut dibeli oleh seorang pedagang menggunakan truk untuk dibawa ke pasar kota, kemudian Ibu Siti membeli beras tersebut di pasar untuk dimasak menjadi nasi bagi keluarganya.`,
          pertanyaan: `Berdasarkan ilustrasi di atas, pihak yang melakukan kegiatan DISTRIBUSI (penyaluran barang) adalah ....`,
          opsi5: [
            'Pak Made yang menanam padi di sawah',
            'Pedagang truk yang menyalurkan beras dari desa ke pasar kota',
            'Ibu Siti yang memasak nasi untuk keluarga',
            'Seluruh keluarga Ibu Siti yang memakan nasi',
            'Pemilik toko beras yang hanya mengonsumsi',
          ],
          kunci: 'B',
          pembahasan:
            'Distribusi adalah kegiatan menyalurkan barang dari produsen (Pak Made) kepada konsumen (Ibu Siti). Pelaku distribusi pada ilustrasi tersebut adalah pedagang truk (Pilihan B).',
          levelKognitif: 'C3 (Mengidentifikasi Pelaku Distribusi)',
          indikatorSoal: 'Disajikan alur rantai beras, peserta didik dapat menentukan pelaku kegiatan distribusi.',
        },
        {
          stimulus: `Masyarakat yang tinggal di daerah pesisir pantai sebagian besar bekerja sebagai nelayan, petani garam, dan pengolah ikan asin. Sedangkan masyarakat yang tinggal di dataran tinggi pegunungan sebagian besar bekerja sebagai petani teh, kopi, dan sayur-mayur.`,
          pertanyaan: `Perbedaan mata pencaharian masyarakat tersebut membuktikan bahwa ....`,
          opsi5: [
            'Semua wilayah di Indonesia memiliki kenampakan alam yang seragam',
            'Mata pencaharian masyarakat sangat dipengaruhi oleh kondisi geografis dan sumber daya alam setempat',
            'Masyarakat pegunungan tidak membutuhkan garam dari pesisir pantai',
            'Kebutuhan hidup di pantai jauh lebih mahal daripada di pegunungan',
            'Kondisi alam tidak memiliki kaitan dengan pekerjaan warga',
          ],
          kunci: 'B',
          pembahasan:
            'Kondisi kenampakan alam (pantai, dataran rendah, pegunungan) menyediakan potensi sumber daya yang berbeda sehingga membentuk jenis mata pencaharian warga yang adaptif dengan lingkungannya (Pilihan B).',
          levelKognitif: 'C4 (Menganalisis Hubungan Geografis & Mata Pencaharian)',
          indikatorSoal: 'Peserta didik dapat menganalisis pengaruh kondisi geografis terhadap jenis pekerjaan masyarakat.',
        },
        {
          stimulus: `Setiap mendapatkan uang saku sekolah dari orang tuanya, Beni selalu menyisihkan sebagian uang logamnya untuk dimasukkan ke dalam celengan ayam di kamar. Ketika pensil atau bukunya habis, Beni dapat membelinya menggunakan uang tabungan tersebut.`,
          pertanyaan: `Sikap hidup hemat dan gemar menabung yang dilakukan Beni memberikan manfaat positif, yaitu ....`,
          opsi5: [
            'Membuat Beni menjadi anak yang sombong di hadapan teman',
            'Melatih kemandirian, hidup hemat, dan memiliki dana cadangan saat ada kebutuhan mendesak',
            'Menghabiskan seluruh uang saku untuk jajan makanan ringan',
            'Membuat uang saku menjadi cepat habis',
            'Mengabaikan kebutuhan belajar sekolah',
          ],
          kunci: 'B',
          pembahasan:
            'Gemar menabung melatih sikap disiplin, hidup hemat, dan mempersiapkan kebutuhan di masa mendatang secara mandiri (Pilihan B).',
          levelKognitif: 'C3 (Menilai Manfaat Hidup Hemat & Menabung)',
          indikatorSoal: 'Disajikan cerita menabung, peserta didik dapat menjelaskan manfaat sikap hidup hemat.',
        },
        {
          stimulus: `Rumah adat tradisional di Indonesia memiliki arsitektur yang unik dan sarat makna filosofis. Rumah Gadang dengan atap melengkung menyerupai tanduk kerbau (gonjong) berasal dari provinsi ....`,
          pertanyaan: `Provinsi asal dari rumah adat Rumah Gadang adalah ....`,
          opsi5: [
            'Sumatera Barat',
            'Jawa Tengah',
            'Sulawesi Selatan',
            'Papua',
            'Kalimantan Timur',
          ],
          kunci: 'A',
          pembahasan:
            'Rumah Gadang dengan atap bergonjong tanduk kerbau merupakan rumah adat tradisional suku Minangkabau di Provinsi Sumatera Barat (Pilihan A).',
          levelKognitif: 'C2 (Mengenal Rumah Adat Daerah)',
          indikatorSoal: 'Peserta didik dapat mengidentifikasi daerah asal rumah adat Rumah Gadang.',
        },
        {
          stimulus: `Pangeran Diponegoro, Tuanku Imam Bonjol, dan Pangeran Antasari adalah tokoh-tokoh pahlawan bangsa yang gigih berjuang memimpin perlawanan rakyat melawan penjajahan kolonial demi mempertahankan kedaulatan tanah air.`,
          pertanyaan: `Sikap keteladanan dari para pahlawan nasional yang harus kita terapkan sebagai pelajar saat ini adalah ....`,
          opsi5: [
            'Rela berkorban, pantang menyerah, dan cinta tanah air',
            'Mementingkan keuntungan diri sendiri di atas kepentingan bersama',
            'Mudah putus asa saat menghadapi tugas sekolah yang sulit',
            'Menolak mempelajari sejarah perjuangan bangsa',
            'Menimbulkan perselisihan dengan kawan sekelas',
          ],
          kunci: 'A',
          pembahasan:
            'Nilai-nilai keteladanan pahlawan yang wajib diwarisi generasi muda antara lain rela berkorban, cinta tanah air, pantang menyerah, dan berjiwa kesatria (Pilihan A).',
          levelKognitif: 'C3 (Meneladani Sikap Pahlawan Nasional)',
          indikatorSoal: 'Peserta didik dapat mengidentifikasi nilai keteladanan para pahlawan nasional.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Tiga Macam Kegiatan Ekonomi Utama (Produksi, Distribusi, Konsumsi):
Roda perekonomian masyarakat berjalan melalui keterkaitan tiga kegiatan ekonomi pokok.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kegiatan ekonomi berikut!',
          pernyataan: [
            { teks: 'Petani yang menanam sayuran dan peternak sapi perah bertindak sebagai produsen.', isBenar: true },
            { teks: 'Sopir truk pengangkut sembako dari gudang ke pasar tradisional melakukan kegiatan distribusi.', isBenar: true },
            { teks: 'Siswa yang membeli dan memakan roti di kantin sekolah sedang melakukan kegiatan produksi.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena siswa yang membeli dan memakan roti bertindak sebagai konsumen yang melakukan kegiatan konsumsi.',
          levelKognitif: 'C4 (Memvalidasi 3 Kegiatan Ekonomi)',
          indikatorSoal: 'Peserta didik dapat mengklasifikasikan kegiatan produksi, distribusi, dan konsumsi.',
        },
        {
          stimulus: `Kenampakan Alam dan Pemanfaatan Sumber Daya:
Kondisi geografis Indonesia yang beragam memberikan keunggulan komparatif bagi tiap daerah.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan geografis di bawah ini!',
          pernyataan: [
            { teks: 'Kawasan dataran tinggi dengan udara sejuk sangat cocok untuk perkebunan teh dan sayur-mayur.', isBenar: true },
            { teks: 'Wilayah perairan laut Indonesia kaya akan biota ikan, udang, dan potensi garam laut.', isBenar: true },
            { teks: 'Penduduk yang tinggal di kawasan pantai sebagian besar berprofesi sebagai petani padi ladang.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena warga pesisir pantai lazimnya bermata pencaharian sebagai nelayan, petani garam, atau pembudidaya tambak.',
          levelKognitif: 'C4 (Evaluasi Pemanfaatan Sumber Daya Geografis)',
          indikatorSoal: 'Peserta didik dapat memvalidasi hubungan bentang alam dengan potensi ekonomi.',
        },
        {
          stimulus: `Pengelolaan Keuangan Pribadi dan Skala Prioritas:
Setiap pelajar perlu memahami cara mengelola uang saku agar kebutuhan sekolah tercukupi.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap keputusan pengeluaran berikut!',
          pernyataan: [
            { teks: 'Membeli buku tulis dan pensil untuk belajar harus didahulukan daripada membeli mainan baru.', isBenar: true },
            { teks: 'Menyisihkan uang saku ke dalam celengan sebelum jajan merupakan kebiasaan hemat yang baik.', isBenar: true },
            { teks: 'Kita sebaiknya meminjam uang teman demi membeli makanan mewah yang sedang tren di media sosial.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena berutang demi keinginan tersier/gaya hidup melanggar prinsip skala prioritas yang rasional.',
          levelKognitif: 'C3 (Menilai Keputusan Skala Prioritas)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi keputusan finansial berdasarkan skala prioritas.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Tiga Kegiatan Pokok Ekonomi Masyarakat:
Dalam kehidupan sehari-hari, barang dan jasa bergerak dari pembuat hingga ke pengguna.`,
          pertanyaan: `a) Jelaskan pengertian dari PRODUKSI, DISTRIBUSI, dan KONSUMSI!
b) Berikan 1 contoh alur ketiga kegiatan tersebut dari padi di sawah hingga menjadi nasi di meja makan!`,
          pedomanPenskoran: `Skor 20: Menjelaskan 3 pengertian secara tepat (9 poin) dan memberikan contoh alur padi secara runtut (11 poin).`,
          contohJawaban: `a) Pengertian:
• Produksi: Kegiatan menghasilkan atau menambah nilai guna suatu barang/jasa.
• Distribusi: Kegiatan menyalurkan barang dari produsen kepada konsumen.
• Konsumsi: Kegiatan menggunakan atau menghabiskan nilai guna suatu barang/jasa.

b) Contoh Alur Padi:
1. Produksi: Petani membajak sawah, menanam padi, dan memanen gabah lalu menggilingnya menjadi beras.
2. Distribusi: Pedagang beras mengangkut beras dari lumbung desa ke toko-toko kelontong dan pasar di kota.
3. Konsumsi: Keluarga membeli beras di toko, memasaknya menjadi nasi, dan menyantapnya bersama saat makan siang.`,
          levelKognitif: 'C4 (Menguraikan 3 Kegiatan Ekonomi)',
          indikatorSoal: 'Peserta didik dapat menjelaskan 3 kegiatan ekonomi pokok dan alur penerapannya.',
        },
        {
          stimulus: `Perbedaan Kebutuhan dan Keinginan (Skala Prioritas):
Terkadang seorang anak sulit membedakan antara apa yang benar-benar dibutuhkan dan apa yang sekadar diinginkan.`,
          pertanyaan: `a) Apa perbedaan antara KEBUTUHAN dan KEINGINAN?
b) Mengapa kita harus menyusun skala prioritas dalam menggunakan uang saku?`,
          pedomanPenskoran: `Skor 20: Menjelaskan perbedaan kebutuhan vs keinginan (10 poin) dan menjelaskan alasan penyusunan skala prioritas (10 poin).`,
          contohJawaban: `a) Perbedaan:
• Kebutuhan adalah sesuatu yang mutlak harus dipenuhi agar kelangsungan hidup dan kegiatan belajar berjalan lancar (contoh: makanan, seragam, buku sekolah). Jika tidak terpenuhi, akan mengganggu kehidupan.
• Keinginan adalah sesuatu yang ingin dimiliki untuk menambah kepuasan diri atau kesenangan sesaat (contoh: mainan mahal, jajan berlebihan). Jika tidak terpenuhi, kehidupan tetap berjalan normal.

b) Alasan menyusun skala prioritas:
Karena uang saku atau sumber daya yang kita miliki jumlahnya terbatas, sedangkan kebutuhan dan keinginan kita sangat banyak. Dengan skala prioritas, kita dapat mendahulukan kebutuhan yang paling mendesak sehingga tidak boros dan memiliki tabungan untuk masa depan.`,
          levelKognitif: 'C4 (Menganalisis Kebutuhan vs Keinginan)',
          indikatorSoal: 'Peserta didik dapat membedakan kebutuhan dan keinginan serta urgensi skala prioritas.',
        },
        {
          stimulus: `Keragaman Kenampakan Alam dan Mata Pencaharian Penduduk:
Wilayah Indonesia terdiri dari pulau-pulau dengan kenampakan alam dataran rendah, dataran tinggi, dan pantai.`,
          pertanyaan: `Jelaskan bagaimana kondisi bentang alam dataran tinggi dan kawasan pesisir pantai memengaruhi jenis pekerjaan utama masyarakat yang tinggal di sana!`,
          pedomanPenskoran: `Skor 20: Menjelaskan pengaruh dataran tinggi (10 poin) dan pengaruh pesisir pantai (10 poin) beserta alasan sumber dayanya.`,
          contohJawaban: `1. Kawasan Dataran Tinggi:
Memiliki udara yang sejuk dan tanah vulkanik yang subur. Kondisi alam ini sangat cocok untuk perkebunan teh, kopi, sayuran (kol, wortel), buah-buahan, dan kawasan wisata alam. Oleh karena itu, mayoritas warganya bermata pencaharian sebagai petani perkebunan, peternak sapi perah, dan pemandu wisata.

2. Kawasan Pesisir Pantai:
Memiliki wilayah perairan laut yang luas dan suhu yang hangat. Kondisi ini kaya akan biota laut dan penguapan air laut yang cepat. Oleh karena itu, mayoritas warganya bekerja sebagai nelayan penangkap ikan, petani pembuat garam laut, pembudidaya udang/rumput laut, dan pedagang ikan.`,
          levelKognitif: 'C4 (Menganalisis Korelasi Alam dan Mata Pencaharian)',
          indikatorSoal: 'Peserta didik dapat menganalisis hubungan bentang alam dengan mata pencaharian penduduk.',
        },
      ],
    };
  }

  // SMP / SMA IPS & Ekonomi
  return buildContextualGeneralQuestionBank(req, _isSMA);
}

// ============================================================================
// 12. BANK SOAL INFORMATIKA & KEJURUAN / PKK
// ============================================================================
export function buildInformatikaPKKQuestionBank(
  req: GenerationRequest,
  _isSD: boolean,
  _isSMA: boolean
): QuestionBank {
  return buildContextualGeneralQuestionBank(req, _isSMA);
}

// ============================================================================
// 13. BANK SOAL KONTEKSTUAL UMUM (SUBSTANTIF, BEBAS JARGON, & BEBAS PENGECOH ANEH)
//     6 PG, 3 PGK, dan 3 Uraian dengan Distraktor Masuk Akal & Menguji Materi Nyata
// ============================================================================
export function buildContextualGeneralQuestionBank(req: GenerationRequest, _isSMA: boolean): QuestionBank {
  const topik = req.materiPokok;
  const mapel = req.mataPelajaran;
  const lowerMapel = mapel.toLowerCase();
  const isSejarah = lowerMapel.includes('sejarah');
  const isEkonomiIPS = lowerMapel.includes('ekonomi') || lowerMapel.includes('ips') || lowerMapel.includes('geografi') || lowerMapel.includes('sosiologi');
  const isPKK = lowerMapel.includes('pkk') || lowerMapel.includes('kewirausahaan') || lowerMapel.includes('kejuruan') || lowerMapel.includes('profesi');
  const isInformatika = lowerMapel.includes('informatika') || lowerMapel.includes('komputer');

  return {
    capaianPembelajaran: `Peserta didik mampu memahami konsep esensial, menganalisis hubungan sebab-akibat, serta menerapkan prinsip ${topik} pada mata pelajaran ${mapel} untuk memecahkan persoalan nyata.`,
    tujuanPembelajaranDefault:
      req.tujuanPembelajaranInput ||
      `Peserta didik mampu menganalisis konsep pokok ${topik}, menerapkan langkah kerja sistematis, dan mengevaluasi hasil penyelesaian masalah secara objektif.`,
    pgPool: [
      {
        stimulus: isSejarah
          ? `Seorang sejarawan meneliti peristiwa Proklamasi Kemerdekaan Indonesia dengan cara mengurutkan jalannya peristiwa secara berurutan mulai dari kekalahan Jepang (14 Agustus 1945), peristiwa Rengasdengklok (16 Agustus 1945), hingga pembacaan teks Proklamasi (17 Agustus 1945).`
          : isEkonomiIPS
          ? `Menjelang tahun ajaran baru, seorang siswa memiliki uang tabungan Rp300.000,00. Ia dihadapkan pada pilihan membeli sepatu sekolah baru karena sepatunya sudah jebol, atau membeli tiket konser musik akhir pekan.`
          : isPKK
          ? `Sebuah unit produksi siswa SMK merencanakan usaha lampu hias akrilik dengan Biaya Tetap (Fixed Cost) Rp200.000,00 dan Biaya Variabel (Variable Cost) Rp30.000,00 per unit. Produk tersebut dijual dengan harga Rp50.000,00 per unit.`
          : isInformatika
          ? `Sebuah tim siswa merancang sistem antrean digital perpustakaan sekolah dengan cara memecah masalah besar menjadi bagian-bagian kecil (alur peminjaman, alur pengembalian, dan modul pencarian katalog buku).`
          : `Dalam kegiatan pembelajaran ${mapel} pada materi "${topik}", peserta didik mengamati bahwa hasil kerja yang berkualitas sangat ditentukan oleh pemahaman terhadap definisi konsep dasar serta ketelitian dalam menerapkan kaidah inti.`,
        pertanyaan: isSejarah
          ? `Cara berpikir sejarah yang mengutamakan urutan waktu kejadian dari awal hingga akhir (memanjang dalam waktu, menyempit dalam ruang) seperti ilustrasi di atas disebut cara berpikir ....`
          : isEkonomiIPS
          ? `Berdasarkan prinsip ekonomi dan penyusunan skala prioritas yang rasional, keputusan paling tepat yang harus diambil siswa tersebut adalah ....`
          : isPKK
          ? `Berapakah jumlah unit lampu hias yang harus terjual agar usaha siswa tersebut mencapai Titik Impas (Break Even Point / BEP Unit)?`
          : isInformatika
          ? `Dalam empat pilar Berpikir Komputasional (Computational Thinking), teknik memecah masalah kompleks menjadi bagian-bagian yang lebih kecil disebut ....`
          : `Pernyataan berikut ini yang paling tepat menjelaskan pengertian inti dan karakteristik utama dari materi "${topik}" adalah ....`,
        opsi5: isSejarah
          ? [
              'Sinkronik (meluas dalam ruang)',
              'Diakronik / Kronologis (memanjang dalam waktu)',
              'Anakronisme sejarah',
              'Fiksi imajinatif',
              'Generalisasi spekulatif',
            ]
          : isEkonomiIPS
          ? [
              'Membeli tiket konser karena kesempatan tersebut jarang terjadi',
              'Mengutamakan membeli sepatu sekolah baru karena merupakan kebutuhan pokok penunjang belajar harian',
              'Menghabiskan seluruh uang tabungan untuk bermain game daring',
              'Meminjam uang teman agar bisa membeli keduanya sekaligus',
              'Menyimpan seluruh uang tanpa membeli sepatu yang rusak',
            ]
          : isPKK
          ? ['5 unit', '10 unit', '15 unit', '20 unit', '25 unit']
          : isInformatika
          ? [
              'Dekomposisi (Decomposition)',
              'Abstraksi (Abstraction)',
              'Pengenalan Pola (Pattern Recognition)',
              'Perancangan Algoritma',
              'Enkripsi Data',
            ]
          : [
              `Konsep pokok ${topik} berfungsi memandu langkah kerja praktis secara terukur, konsisten, dan dapat dipertanggungjawabkan kebenarannya.`,
              `Materi ${topik} hanya merupakan kumpulan istilah hafalan yang tidak memiliki kaitan dengan persoalan di lapangan.`,
              `Penerapan konsep ${topik} boleh mengabaikan kaidah dasar keilmuan yang telah teruji.`,
              `Hasil akhir materi ${topik} hanya berlaku pada satu kondisi khusus tanpa prinsip keberlanjutan.`,
              `Penguasaan ${topik} menuntut penolakan terhadap seluruh metode pengujian data yang objektif.`,
            ],
        kunci: isPKK ? 'B' : isSejarah || isEkonomiIPS ? 'B' : 'A',
        pembahasan: isSejarah
          ? 'Berpikir Diakronik (kronologis) adalah cara merekonstruksi peristiwa sejarah secara berurutan dalam rentang waktu tertentu (Pilihan B).'
          : isEkonomiIPS
          ? 'Dalam skala prioritas kebutuhan ekonomi, kebutuhan primer yang menunjang aktivitas pokok (sepatu sekolah) harus didahulukan dibanding kebutuhan rekreasi (Pilihan B).'
          : isPKK
          ? 'BEP Unit = Biaya Tetap / (Harga Jual - Biaya Variabel) = 200.000 / (50.000 - 30.000) = 200.000 / 20.000 = 10 unit (Pilihan B).'
          : isInformatika
          ? 'Dekomposisi adalah teknik memecah masalah besar dan rumit menjadi sub-masalah kecil yang lebih sederhana (Pilihan A).'
          : `Penguasaan konsep ${topik} berfungsi sebagai pedoman kerja terukur dan konsisten dalam memecahkan permasalahan nyata (Pilihan A).`,
        levelKognitif: 'C3 (Memahami Konsep Dasar Kontekstual)',
        indikatorSoal: `Peserta didik dapat mengidentifikasi konsep inti atau perhitungan dasar pada materi ${topik}.`,
      },
      {
        stimulus: `Dalam mengkaji materi "${topik}", pemahaman yang mendalam mensyaratkan peserta didik untuk mampu mengenali hubungan sebab-akibat antara faktor pemicu dan dampak yang dihasilkan pada sistem kerja materi tersebut.`,
        pertanyaan: `Apabila salah satu komponen utama atau kaidah dasar pada materi "${topik}" tidak dipenuhi dalam suatu proses pengamatan, dampak paling logis yang akan terjadi adalah ....`,
        opsi5: [
          'Hasil simpulan menjadi bias, tidak akurat, dan memiliki risiko kegagalan fungsi',
          'Kualitas hasil kerja justru menjadi jauh lebih optimal secara otomatis',
          'Proses kerja berlangsung lebih cepat tanpa membutuhkan evaluasi lanjutan',
          'Sistem secara ajaib akan memperbaiki dirinya sendiri tanpa intervensi manusia',
          'Tidak timbul pengaruh apa pun terhadap keabsahan data hasil akhir',
        ],
        kunci: 'A',
        pembahasan:
          'Kaidah keilmuan dan komponen materi bersifat sistemik. Pengabaian salah satu komponen kunci akan menyebabkan hasil simpulan menjadi bias dan tidak valid (Pilihan A).',
        levelKognitif: 'C4 (Menganalisis Hubungan Sebab-Akibat)',
        indikatorSoal: `Peserta didik dapat memprediksi dampak kegagalan pemenuhan komponen pada materi ${topik}.`,
      },
      {
        stimulus: `Studi Kasus Pemecahan Masalah (${mapel}):
Dalam suatu kegiatan observasi mengenai "${topik}", ditemukan perbedaan data yang cukup mencolok antara hasil uji kelompok pertama dan kelompok kedua meskipun objek yang diteliti sama.`,
        pertanyaan: `Langkah paling rasional dan ilmiah yang harus dilakukan oleh kedua kelompok tersebut adalah ....`,
        opsi5: [
          'Memilih data yang paling disukai dan membuang data yang tidak sesuai harapan',
          'Memeriksa kembali instrumen pengukuran, menyamakan prosedur pengujian, dan melakukan verifikasi ulang data di lapangan',
          'Menghentikan penelitian secara sepihak dan menyalahkan kelompok lain',
          'Mengarang data baru tanpa melakukan pengujian ulang',
          'Menyimpulkan bahwa materi pelajaran tersebut tidak memiliki manfaat praktis',
        ],
        kunci: 'B',
        pembahasan:
          'Sikap bernalar kritis dan objektif ditunjukkan dengan memeriksa kembali instrumen ukur, menyamakan prosedur, dan melakukan uji verifikasi ulang secara terbuka (Pilihan B).',
        levelKognitif: 'C4 (Mengevaluasi Ketelitian Prosedur Kerja)',
        indikatorSoal: `Disajikan perbedaan data pengamatan ${topik}, peserta didik dapat menentukan tindakan verifikasi yang tepat.`,
      },
      {
        stimulus: `Perhatikan dua metode dalam menerapkan materi "${topik}" berikut:
• Metode A: Mengandalkan data terukur, menerapkan prosedur bertahap, dan melakukan evaluasi berkala.
• Metode B: Bekerja berdasarkan perkiraan subjektif tanpa pedoman standar dan mengabaikan evaluasi akhir.`,
        pertanyaan: `Keunggulan utama penerapan Metode A dibandingkan Metode B bagi peserta didik adalah ....`,
        opsi5: [
          'Metode A memakan biaya yang tidak terukur dan memboroskan waktu',
          'Metode A menghasilkan solusi yang teruji validitasnya, konsisten, dan mudah dievaluasi jika terjadi kendala',
          'Metode A menghilangkan kebutuhan kerja sama dalam kelompok',
          'Metode A menjamin seluruh pekerjaan selesai seketika tanpa usaha berpikir',
          'Metode A mengabaikan kaidah keselamatan dan etika kerja',
        ],
        kunci: 'B',
        pembahasan:
          'Metode sistematis berbasis data (Metode A) menjamin keabsahan solusi, dapat diuji ulang (replikatif), dan mempermudah pelacakan sumber kendala (Pilihan B).',
        levelKognitif: 'C4 (Membandingkan Efektivitas Dua Metode)',
        indikatorSoal: `Peserta didik dapat menganalisis keunggulan metode sistematis pada materi ${topik}.`,
      },
      {
        stimulus: `Penerapan materi "${topik}" dalam kehidupan bermasyarakat menuntut kepatuhan terhadap standar etika, tanggung jawab sosial, serta kepedulian terhadap kelestarian lingkungan.`,
        pertanyaan: `Wujud nyata dari sikap bertanggung jawab seorang pelajar saat mempraktikkan materi "${topik}" adalah ....`,
        opsi5: [
          'Menyajikan data laporan apa adanya secara jujur dan berani mengakui keterbatasan hasil kerja',
          'Merekayasa data agar hasil penelitian terlihat sempurna di mata guru',
          'Menyerahkan seluruh tugas kepada anggota kelompok yang paling pandai',
          'Mengabaikan keselamatan diri sendiri demi menyelesaikan tugas paling awal',
          'Menolak menerima masukan dan kritik konstruktif dari guru serta kawan',
        ],
        kunci: 'A',
        pembahasan:
          'Integritas ilmiah dan tanggung jawab sosial tercermin dari kejujuran menyajikan data riil dan keterbukaan menerima evaluasi demi perbaikan mutu (Pilihan A).',
        levelKognitif: 'C3 (Menerapkan Sikap Tanggung Jawab & Kejujuran)',
        indikatorSoal: 'Peserta didik dapat menentukan wujud perilaku berintegritas dalam pembelajaran.',
      },
      {
        stimulus: `Dalam menyusun laporan akhir terkait materi "${topik}", peserta didik diminta merumuskan simpulan yang kuat berdasarkan bukti pendukung yang diperoleh selama proses belajar.`,
        pertanyaan: `Kriteria utama sebuah kesimpulan yang kredibel dan berkualitas tinggi adalah ....`,
        opsi5: [
          'Didasarkan pada opini pribadi tanpa data dukung yang relevan',
          'Disarikan secara logis dari analisis data empiris yang valid dan menjawab rumusan masalah secara tuntas',
          'Hanya memuat kutipan teori buku tanpa menghubungkannya dengan hasil temuan lapangan',
          'Memuat pernyataan yang saling bertentangan agar terlihat kompleks',
          'Disusun berdasarkan rumor yang berkembang tanpa verifikasi fakta',
        ],
        kunci: 'B',
        pembahasan:
          'Simpulan yang kredibel harus dirumuskan secara logis dan koheren dari hasil analisis data faktual serta secara tuntas menjawab tujuan pembelajaran (Pilihan B).',
        levelKognitif: 'C5 (Menyimpulkan Hasil Evaluasi Pembelajaran)',
        indikatorSoal: 'Peserta didik dapat menentukan karakteristik simpulan yang kredibel dan sahih.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Tabel Evaluasi Pemahaman Konseptual Materi "${topik}":
Penguasaan materi menuntut keterpaduan antara pemahaman teori dasar dan kemampuan aplikatif di lapangan.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan evaluasi materi berikut!',
        pernyataan: [
          { teks: `Pemahaman mendalam mengenai ${topik} membantu peserta didik menganalisis permasalahan sehari-hari secara terstruktur.`, isBenar: true },
          { teks: `Penerapan konsep ${topik} sama sekali tidak memerlukan ketelitian, perencanaan, maupun pengujian ulang.`, isBenar: false },
          { teks: `Evaluasi berkala diperlukan untuk memastikan hasil penerapan materi memberikan manfaat optimal bagi lingkungan.`, isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR sesuai prinsip Kurikulum Merdeka. Pernyataan 2 SALAH karena ketelitian dan perencanaan adalah syarat mutlak keberhasilan penerapan ilmu.',
        levelKognitif: 'C4 (Evaluasi Konsep & Aplikasi AKM)',
        indikatorSoal: `Peserta didik dapat memvalidasi pernyataan konseptual materi ${topik}.`,
      },
      {
        stimulus: `Prosedur Kendali Mutu dan Kolaborasi Tim (${mapel}):
Dalam mengerjakan tugas proyek berbasis masalah, partisipasi aktif dan pembagian tugas yang adil menentukan kualitas produk akhir.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kerja sama tim di bawah ini!',
        pernyataan: [
          { teks: 'Komunikasi terbuka dan pembagian peran yang merata mempercepat pencapaian target mutu proyek.', isBenar: true },
          { teks: 'Tahap verifikasi data sebelum laporan dikumpulkan berguna untuk meminimalkan kesalahan analisis.', isBenar: true },
          { teks: 'Keputusan penting dalam tim sebaiknya hanya ditentukan oleh satu anggota secara sepihak tanpa musyawarah.', isBenar: false },
        ],
        pembahasan:
          'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena proyek kolaboratif menuntut musyawarah mufakat dan kesepakatan bersama.',
        levelKognitif: 'C4 (Mengevaluasi Prosedur Kolaborasi Tim)',
        indikatorSoal: 'Peserta didik dapat mengevaluasi prinsip kerja sama dan kendali mutu.',
      },
      {
        stimulus: `Dampak Positif Penguasaan Materi "${topik}" bagi Pengembangan Diri:
Setiap kompetensi yang dipelajari dirancang untuk membentuk karakter pelajar yang mandiri, kritis, dan beretika.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan refleksi berikut!',
        pernyataan: [
          { teks: `Keterampilan pada materi ${topik} dapat diaplikasikan untuk menghasilkan solusi yang bermanfaat bagi masyarakat.`, isBenar: true },
          { teks: `Sikap bernalar kritis berarti menolak semua pandangan orang lain tanpa mendengarkan alasannya.`, isBenar: false },
          { teks: `Kejujuran dalam menyajikan data merupakan cerminan integritas moral Pelajar Pancasila.`, isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena bernalar kritis adalah kemampuan menganalisis argumen secara objektif, bukan menolak membabi buta.',
        levelKognitif: 'C4 (Merefleksikan Karakter & Nilai Ilmiah)',
        indikatorSoal: 'Peserta didik dapat memvalidasi refleksi karakter bernalar kritis.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Studi Kasus Penerapan Nyata Materi "${topik}" (${mapel}):
Penguasaan teori di kelas baru memiliki makna nyata apabila mampu diterapkan untuk memecahkan persoalan di kehidupan sehari-hari.`,
        pertanyaan: `Jelaskan secara runtut:
a) Apa pengertian inti dan 2 karakteristik utama dari materi "${topik}"?
b) Berikan 1 contoh kasus konkret penerapan materi "${topik}" di lingkungan sekolah atau masyarakat beserta manfaat positifnya!`,
        pedomanPenskoran: `Skor 20: Menjelaskan pengertian dan 2 karakteristik dengan tepat (10 poin) serta menyajikan contoh penerapan nyata beserta analisis manfaatnya secara logis (10 poin).`,
        contohJawaban: `a) Pengertian & Karakteristik:
Materi ${topik} pada mata pelajaran ${mapel} membahas prinsip dasar dan hubungan antar-komponen dalam menyelesaikan suatu tantangan kerja. Dua karakteristik utamanya: 1) Berbasis aturan/kaidah yang teruji dan terukur; 2) Berorientasi pada efisiensi dan pemecahan masalah kontekstual.

b) Contoh Penerapan Nyata:
Diterapkan dalam mengatasi permasalahan di lingkungan sekolah/masyarakat (misal penataan tata tertib atau optimalisasi kegiatan kelompok). Manfaat positifnya adalah pekerjaan menjadi lebih teratur, transparan, terhindar dari pemborosan sumber daya, dan memberikan hasil yang adil bagi seluruh pihak.`,
        levelKognitif: 'C5 (Menganalisis Konsep & Contoh Penerapan Nyata)',
        indikatorSoal: `Peserta didik mampu menguraikan konsep dasar dan contoh penerapan materi ${topik}.`,
      },
      {
        stimulus: `Analisis Kendala dan Perumusan Solusi Perbaikan (${topik}):
Dalam sebuah kegiatan praktik di sekolah, ditemukan bahwa hasil yang diperoleh peserta didik belum mencapai standar kriteria ketercapaian yang ditentukan.`,
        pertanyaan: `Sebagai peserta didik yang telah mempelajari kaidah materi "${topik}":
a) Identifikasi 2 faktor penyebab yang paling mungkin memicu terjadinya kendala tersebut!
b) Rumuskan 2 langkah perbaikan konkret dan sistematis agar hasil kegiatan berikutnya mencapai standar optimal!`,
        pedomanPenskoran: `Skor 20: Mengidentifikasi 2 faktor penyebab secara analitis (10 poin) dan merumuskan 2 langkah perbaikan yang aplikatif (10 poin).`,
        contohJawaban: `a) Dua faktor penyebab kendala:
1. Kurangnya ketelitian pada tahap persiapan awal dalam memahami standar prosedur materi ${topik}.
2. Belum dilakukannya pemeriksaan berkala (monitoring) saat proses pengerjaan berlangsung, sehingga kekeliruan baru disadari di akhir.

b) Dua langkah perbaikan konkret:
1. Menyusun lembar periksa (checklist) langkah kerja standar sebelum memulai praktik agar tidak ada tahapan kunci yang terlewat.
2. Membagi tugas tim secara spesifik sesuai kompetensi dan melakukan evaluasi mini di setiap pertengahan tahapan kerja untuk memastikan data/hasil tetap akurat.`,
        levelKognitif: 'C5-C6 (Mendiagnosis Kendala & Merancang Solusi)',
        indikatorSoal: 'Peserta didik dapat menganalisis faktor kegagalan dan merancang langkah perbaikan.',
      },
      {
        stimulus: `Refleksi Dimensi Profil Pelajar Pancasila dalam Pembelajaran ${mapel}:
Kurikulum Merdeka menanamkan pentingnya dimensi Bernalar Kritis, Kreatif, dan Bergotong Royong dalam setiap aktivitas pembelajaran.`,
        pertanyaan: `Uraikan pendapatmu secara terstruktur:
a) Bagaimana cara menerapkan sikap "Bernalar Kritis" saat menghadapi permasalahan pada materi "${topik}"?
b) Mengapa sikap saling menghargai dan kerja sama tim sangat diperlukan untuk mencapai keberhasilan bersama?`,
        pedomanPenskoran: `Skor 20: Menjelaskan penerapan bernalar kritis secara tepat (10 poin) dan menguraikan pentingnya kerja sama tim serta toleransi (10 poin).`,
        contohJawaban: `a) Penerapan Sikap Bernalar Kritis:
Diterapkan dengan cara tidak menerima simpulan atau informasi secara mentah-mentah, melainkan memeriksa kebenaran data sumber, mempertanyakan alasan di balik setiap langkah prosedur materi ${topik}, serta mengevaluasi kelemahan dan kekuatan alternatif solusi secara objektif.

b) Urgensi Kerja Sama dan Sikap Saling Menghargai:
Karena setiap anggota tim memiliki sudut pandang dan kelebihan yang saling melengkapi. Kerja sama yang dilandasi saling menghargai menciptakan lingkungan yang aman untuk bertukar gagasan, mempercepat penyelesaian tugas yang rumit, dan memastikan hasil karya mencerminkan konsensus mufakat yang berkeadilan.`,
        levelKognitif: 'C5 (Merefleksikan Nilai Karakter Pancasila)',
        indikatorSoal: 'Peserta didik dapat merefleksikan dimensi bernalar kritis dan gotong royong pada materi pembelajaran.',
      },
    ],
  };
}

