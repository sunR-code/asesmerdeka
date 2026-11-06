import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 6. BANK SOAL SAINS (IPA, IPAS, FISIKA, KIMIA, BIOLOGI — Min 6 PG, 3 PGK, 3 Uraian)
// ============================================================================
export function buildScienceQuestionBank(
  req: GenerationRequest,
  lowerMapel: string,
  lowerMateri: string
): QuestionBank {
  const isFisika = lowerMapel.includes('fisika') || lowerMateri.includes('newton') || lowerMateri.includes('energi') || lowerMateri.includes('listrik');
  const isKimia = lowerMapel.includes('kimia') || lowerMateri.includes('atom') || lowerMateri.includes('ikatan') || lowerMateri.includes('reaksi');

  return {
    capaianPembelajaran: `Peserta didik mampu memahami konsep ilmiah, menganalisis mekanisme proses dan hukum alam, serta menerapkan perhitungan/metode ilmiah pada materi ${req.materiPokok} (${req.mataPelajaran}).`,
    tujuanPembelajaranDefault: `Peserta didik dapat menganalisis fenomena sains, mengidentifikasi hubungan antar-variabel eksperimen, dan memecahkan permasalahan pada topik ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: isFisika
          ? `Sebuah benda bermassa 4 kg berada di atas bidang datar yang licin. Benda tersebut ditarik dengan gaya mendatar sebesar 20 Newton selama 3 sekon dari keadaan diam.`
          : isKimia
          ? `Perhatikan lambang atom unsur Natrium (²³₁₁Na) dan unsur Oksigen (¹⁶₈O) dalam tabel periodik unsur!`
          : `Di sebuah ekosistem sawah terdapat komponen biotik berupa tanaman padi, belalang, katak, ular sawah, burung elang, serta bakteri pengurai.`,
        pertanyaan: isFisika
          ? 'Berdasarkan Hukum II Newton (ΣF = m × a), berapakah percepatan yang dialami benda tersebut?'
          : isKimia
          ? 'Jumlah proton, elektron, dan neutron yang dimiliki oleh satu atom netral Natrium (²³₁₁Na) berturut-turut adalah ....'
          : 'Apabila populasi katak di sawah tersebut menurun drastis akibat perburuan liar, dampak langsung yang akan terjadi pada ekosistem tersebut adalah ....',
        opsi5: isFisika
          ? ['2 m/s²', '4 m/s²', '5 m/s²', '8 m/s²', '10 m/s²']
          : isKimia
          ? [
              '11 proton, 11 elektron, dan 12 neutron',
              '11 proton, 12 elektron, dan 11 neutron',
              '12 proton, 11 elektron, dan 23 neutron',
              '23 proton, 11 elektron, dan 12 neutron',
              '11 proton, 23 elektron, dan 11 neutron',
            ]
          : [
              'Populasi belalang meningkat pesat sehingga hasil panen padi menurun.',
              'Populasi belalang ikut punah karena kehilangan sumber makanan.',
              'Populasi ular sawah meningkat pesat karena makanannya bertambah.',
              'Produksi tanaman padi meningkat dua kali lipat.',
              'Tidak terjadi perubahan apa pun pada jaring-jaring makanan.',
            ],
        kunci: isFisika ? 'C' : 'A',
        pembahasan: isFisika
          ? 'Berdasarkan Hukum II Newton: a = ΣF / m = 20 N / 4 kg = 5 m/s² (Pilihan C).'
          : isKimia
          ? 'Pada atom netral ²³₁₁Na: Nomor atom Z = 11 menunjukkan jumlah proton = 11 dan elektron = 11. Jumlah neutron = A - Z = 23 - 11 = 12 neutron (Pilihan A).'
          : 'Katak adalah predator alami belalang (Konsumen I). Jika populasi katak menurun drastis, populasi belalang akan meledak (meningkat pesat) sehingga memakan lebih banyak tanaman padi dan menurunkan hasil panen (Pilihan A).',
        levelKognitif: 'C4 (Menganalisis Hukum Sains / Sebab-Akibat)',
        indikatorSoal: `Disajikan kasus ilmiah pada materi ${req.materiPokok}, peserta didik dapat menganalisis hasil perhitungan atau dampak perubahan komponen sistem.`,
      },
      {
        stimulus: `Seorang siswa melakukan percobaan ilmiah berjudul: "Pengaruh Intensitas Cahaya Matahari terhadap Pertumbuhan Tinggi Kecambah Kacang Hijau selama 7 Hari". Siswa tersebut menyiapkan 3 pot dengan jenis tanah, ukuran biji, dan volume penyiraman air yang sama persis, namun diletakkan di tempat terang, redup, dan gelap.`,
        pertanyaan: 'Dalam percobaan tersebut, yang berperan sebagai VARIABEL BEBAS dan VARIABEL TERIKAT secara berturut-turut adalah ....',
        opsi5: [
          'Jenis tanah dan volume penyiraman air',
          'Intensitas cahaya matahari dan pertumbuhan tinggi kecambah',
          'Pertumbuhan tinggi kecambah dan jenis biji kacang hijau',
          'Volume penyiraman air dan intensitas cahaya matahari',
          'Ukuran pot dan lama waktu pengamatan',
        ],
        kunci: 'B',
        pembahasan:
          'Variabel bebas adalah faktor yang sengaja diubah/divariasikan (intensitas cahaya matahari: terang, redup, gelap), sedangkan variabel terikat adalah hasil yang diukur akibat perlakuan tersebut (pertumbuhan tinggi kecambah) (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Variabel Metode Ilmiah)',
        indikatorSoal: 'Disajikan deskripsi eksperimen sains, peserta didik dapat menentukan variabel bebas dan variabel terikat dengan tepat.',
      },
      {
        stimulus: `Pada proses fotosintesis tumbuhan hijau, klorofil di dalam daun menangkap energi cahaya matahari untuk mengubah air (H₂O) dan gas karbon dioksida (CO₂) menjadi zat makanan dan gas yang dilepaskan ke udara.`,
        pertanyaan: 'Zat hasil utama dari proses fotosintesis yang sangat dibutuhkan oleh manusia dan hewan untuk bernapas (respirasi) adalah ....',
        opsi5: [
          'Gas Nitrogen (N₂) dan Uap Air',
          'Gas Karbon Monoksida (CO) dan Mineral',
          'Glukosa (C₆H₁₂O₆) dan Gas Oksigen (O₂)',
          'Asam Amino dan Gas Karbon Dioksida (CO₂)',
          'Klorofil dan Garam Mineral',
        ],
        kunci: 'C',
        pembahasan:
          'Reaksi fotosintesis menghasilkan karbohidrat/glukosa (C₆H₁₂O₆) sebagai cadangan makanan dan gas oksigen (O₂) yang dilepaskan melalui stomata untuk pernapasan makhluk hidup (Pilihan C).',
        levelKognitif: 'C3 (Mengidentifikasi Hasil Proses Biologi/Kimia)',
        indikatorSoal: 'Disajikan deskripsi proses fotosintesis, peserta didik dapat menentukan produk hasil reaksinya.',
      },
      {
        stimulus: `Sebuah lampu belajar LED memiliki spesifikasi daya listrik 10 Watt. Lampu tersebut dinyalakan secara rutin selama 5 jam setiap malam untuk belajar.`,
        pertanyaan: 'Besarnya energi listrik yang digunakan oleh lampu tersebut selama 30 hari (1 bulan) dalam satuan Watt-jam (Wh) atau kiloWatt-jam (kWh) adalah ....',
        opsi5: [
          '50 Wh (0,05 kWh)',
          '300 Wh (0,30 kWh)',
          '1.500 Wh (1,50 kWh)',
          '3.000 Wh (3,00 kWh)',
          '5.000 Wh (5,00 kWh)',
        ],
        kunci: 'C',
        pembahasan:
          'Energi listrik W = P × t = 10 Watt × (5 jam/hari × 30 hari) = 10 Watt × 150 jam = 1.500 Wh = 1,50 kWh (Pilihan C).',
        levelKognitif: 'C3 (Menghitung Konsumsi Energi Listrik)',
        indikatorSoal: 'Disajikan daya alat listrik dan durasi pemakaian harian, peserta didik dapat menghitung total energi listrik bulanan.',
      },
      {
        stimulus: `Perhatikan peristiwa perubahan wujud dan sifat zat dalam kehidupan sehari-hari berikut!
(1) Es batu yang diletakkan di ruang terbuka mencair menjadi air.
(2) Kayu kering yang dibakar di perapian berubah menjadi arang, abu, dan asap.
(3) Singkong rebus yang diberi ragi berubah menjadi tapai yang manis dan beraroma khas.
(4) Lilin yang meleleh ketika sumbunya dinyalakan.`,
        pertanyaan: 'Peristiwa yang termasuk PERUBAHAN KIMIA (menghasilkan zat jenis baru) ditunjukkan oleh nomor ....',
        opsi5: [
          '(1) dan (2)',
          '(1) dan (4)',
          '(2) dan (3)',
          '(2) dan (4)',
          '(3) dan (4)',
        ],
        kunci: 'C',
        pembahasan:
          'Perubahan kimia menghasilkan zat baru yang sifatnya berbeda dari zat asal dan bersifat permanen, yaitu pembakaran kayu menjadi abu (2) dan fermentasi singkong menjadi tapai (3). Sedangkan es mencair (1) dan lilin meleleh (4) hanya perubahan wujud/fisika (Pilihan C).',
        levelKognitif: 'C4 (Mengklasifikasikan Perubahan Fisika & Kimia)',
        indikatorSoal: 'Disajikan beberapa fenomena perubahan materi, peserta didik dapat mengidentifikasi contoh perubahan kimia.',
      },
      {
        stimulus: `Buah kelapa bermassa 2 kg jatuh bebas dari tangkainya yang berada pada ketinggian 10 meter di atas permukaan tanah (percepatan gravitasi bumi g = 10 m/s²).`,
        pertanyaan: 'Besarnya Energi Potensial gravitasi yang dimiliki buah kelapa saat masih berada di tangkainya adalah ....',
        opsi5: ['20 Joule', '50 Joule', '100 Joule', '200 Joule', '400 Joule'],
        kunci: 'D',
        pembahasan:
          'Rumus Energi Potensial gravitasi: Ep = m × g × h = 2 kg × 10 m/s² × 10 m = 200 Joule (Pilihan D).',
        levelKognitif: 'C3 (Menghitung Energi Potensial Gravitasi)',
        indikatorSoal: 'Disajikan massa benda, ketinggian, dan percepatan gravitasi, peserta didik dapat menghitung energi potensial benda.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Tabel Analisis Konsep Sains: "${req.materiPokok}" (${req.mataPelajaran})
Dalam penyelidikan ilmiah, pemahaman terhadap karakteristik zat, konversi energi, dan keseimbangan lingkungan sangat penting untuk menjaga keberlanjutan hidup.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan ilmiah di bawah ini!',
        pernyataan: [
          { teks: 'Tumbuhan hijau berperan sebagai produsen karena mampu mengubah energi cahaya menjadi energi kimia melalui fotosintesis.', isBenar: true },
          { teks: 'Energi dapat diciptakan dari ketiadaan dan dapat dimusnahkan sepenuhnya tanpa berubah bentuk.', isBenar: false },
          { teks: 'Penggunaan energi terbarukan seperti panel surya membantu mengurangi emisi gas rumah kaca di atmosfer.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena menurut Hukum Kekekalan Energi, energi tidak dapat diciptakan dan tidak dapat dimusnahkan, melainkan hanya berubah dari satu bentuk ke bentuk lainnya.',
        levelKognitif: 'C4 (Evaluasi Konsep Sains AKM)',
        indikatorSoal: 'Peserta didik dapat memvalidasi pernyataan terkait aliran energi, produsen ekosistem, dan lingkungan.',
      },
      {
        stimulus: `Eksperimen Pengukuran Suhu dan Kalor:
Air sebanyak 500 gram dipanaskan di atas pembakar spiritus hingga suhunya naik dari 25°C menjadi 100°C dan mulai mendidih pada tekanan udara standar (1 atm).`,
        pertanyaan: 'Berdasarkan konsep suhu dan kalor, tentukan Benar atau Salah untuk setiap pernyataan berikut!',
        pernyataan: [
          { teks: 'Kenaikan suhu (ΔT) yang dialami air tersebut adalah sebesar 75°C.', isBenar: true },
          { teks: 'Saat air sedang mendidih berubah menjadi uap, kalor yang diberikan digunakan untuk mengubah wujud zat.', isBenar: true },
          { teks: 'Perpindahan panas pada air yang mendidih terjadi secara radiasi tanpa zat perantara.', isBenar: false },
        ],
        pembahasan:
          'ΔT = 100°C - 25°C = 75°C (Pernyataan 1 BENAR). Saat mendidih, kalor laten digunakan untuk mengubah wujud cair menjadi gas (Pernyataan 2 BENAR). Perpindahan panas pada zat cair yang disertai aliran partikel terjadi secara konveksi, bukan radiasi (Pernyataan 3 SALAH).',
        levelKognitif: 'C4 (Evaluasi Fenomena Kalor & Perpindahan Panas)',
        indikatorSoal: 'Disajikan data pemanasan air, peserta didik dapat memvalidasi perubahan suhu, wujud, dan cara perpindahan kalor.',
      },
      {
        stimulus: `Keselamatan Kerja di Laboratorium Sains:
Setiap siswa wajib mematuhi prosedur keselamatan saat melakukan praktikum menggunakan bahan kimia maupun peralatan kaca.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap tindakan keselamatan laboratorium berikut!',
        pernyataan: [
          { teks: 'Menggunakan jas laboratorium, sarung tangan, dan kacamata pelindung (goggles) saat mereaksikan larutan asam.', isBenar: true },
          { teks: 'Mencicipi langsung bahan kimia di tabung reaksi menggunakan lidah untuk mengetahui sifat asam atau basanya.', isBenar: false },
          { teks: 'Membaca label simbol bahaya pada botol bahan kimia sebelum menuangkannya.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR sesuai standar K3 laboratorium. Pernyataan 2 SALAH dan sangat berbahaya; pengujian asam-basa harus menggunakan kertas lakmus atau indikator pH, bukan dicicipi.',
        levelKognitif: 'C3 (Menerapkan Prosedur Keselamatan Laboratorium)',
        indikatorSoal: 'Peserta didik dapat mengevaluasi tindakan keselamatan kerja di laboratorium IPA/Kimia.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Studi Kasus Pemecahan Masalah Sains (${req.materiPokok}):
Sebuah sekolah ingin mengurangi tagihan listrik bulanan sekaligus mengelola sampah daun kering dan sisa makanan kantin yang menumpuk setiap hari.`,
        pertanyaan: `Berdasarkan prinsip sains pada mata pelajaran ${req.mataPelajaran}:
a) Jelaskan 2 langkah ilmiah yang dapat diterapkan sekolah untuk menghemat energi listrik!
b) Jelaskan bagaimana proses biologi/kimia pengolahan sampah organik daun kering dan sisa makanan menjadi pupuk kompos yang bermanfaat!`,
        pedomanPenskoran: `Skor 20: Menjelaskan 2 solusi penghematan energi secara ilmiah (10 poin) dan menjelaskan mekanisme dekomposisi/fermentasi kompos oleh mikroorganisme pengurai dengan tepat (10 poin).`,
        contohJawaban: `a) Dua langkah penghematan energi listrik:
1. Mengganti lampu pijar/neon lama dengan lampu LED hemat daya yang memiliki efisiensi luminansi tinggi.
2. Memaksimalkan ventilasi udara dan pencahayaan alami matahari pada siang hari serta mematikan perangkat elektronik saat ruang kelas tidak digunakan.

b) Proses pengolahan kompos: Sampah organik daun kering (sumber karbon) dan sisa sayuran (sumber nitrogen) dicacah lalu diuraikan oleh mikroorganisme dekomposer (bakteri dan jamur) dengan bantuan bioaktivator menjadi unsur hara humus yang subur bagi tanaman.`,
        levelKognitif: 'C5 (Merumuskan Solusi Ilmiah Lingkungan)',
        indikatorSoal: 'Peserta didik mampu merumuskan solusi berbasis sains untuk efisiensi energi dan pengelolaan limbah organik.',
      },
      {
        stimulus: `Analisis Perhitungan Sains Kontekstual:
Sebuah mobil listrik bergerak lurus dengan kecepatan tetap 20 m/s selama 10 sekon, kemudian pengemudi menginjak pedal gas sehingga mobil mengalami percepatan tetap 2 m/s² selama 5 sekon berikutnya.`,
        pertanyaan: `Hitunglah secara sistematis:
a) Jarak yang ditempuh mobil selama 10 sekon pertama (Gerak Lurus Beraturan)!
b) Kecepatan akhir mobil setelah dipercepat selama 5 sekon berikutnya!`,
        pedomanPenskoran: `Skor 20: Menghitung jarak GLB s = v × t = 200 meter (10 poin) dan kecepatan akhir GLBB vt = v0 + a×t = 30 m/s (10 poin).`,
        contohJawaban: `a) Jarak tempuh pada 10 sekon pertama (GLB):
   s = v × t = 20 m/s × 10 s = 200 meter.
b) Kecepatan akhir setelah dipercepat 5 sekon (GLBB):
   vₜ = v₀ + (a × t) = 20 m/s + (2 m/s² × 5 s) = 20 + 10 = 30 m/s.`,
        levelKognitif: 'C4 (Menghitung Besaran Gerak Fisika)',
        indikatorSoal: 'Peserta didik dapat menghitung jarak tempuh dan kecepatan akhir benda yang bergerak.',
      },
      {
        stimulus: `Rancangan Eksperimen Metode Ilmiah (${req.materiPokok}):
Kamu diminta merancang sebuah percobaan sederhana untuk membuktikan faktor yang memengaruhi kecepatan proses pada materi "${req.materiPokok}".`,
        pertanyaan: `Tuliskan rancangan singkat percobaanmu yang memuat:
a) Rumusan Masalah dan Hipotesis (dugaan sementara)!
b) Variabel Bebas, Variabel Terikat, dan Variabel Kontrol!`,
        pedomanPenskoran: `Skor 20: Merumuskan masalah dan hipotesis yang logis (10 poin) serta menentukan ketiga variabel eksperimen dengan tepat (10 poin).`,
        contohJawaban: `a) • Rumusan Masalah: Apakah suhu air memengaruhi kecepatan larutnya gula pasir?
   • Hipotesis: Semakin tinggi suhu air, semakin cepat gula pasir melarut karena energi kinetik partikel air meningkat.
b) • Variabel Bebas: Suhu air (air dingin, air suhu ruang, air panas).
   • Variabel Terikat: Waktu yang diperlukan hingga gula larut sempurna (detik).
   • Variabel Kontrol: Volume air (200 ml), massa gula (1 sendok makan), dan kecepatan pengadukan.`,
        levelKognitif: 'C6 (Merancang Eksperimen Ilmiah)',
        indikatorSoal: 'Peserta didik mampu menyusun rumusan masalah, hipotesis, dan variabel-variabel dalam rancangan percobaan ilmiah.',
      },
    ],
  };
}
