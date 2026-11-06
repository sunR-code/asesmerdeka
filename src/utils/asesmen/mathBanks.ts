import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 4. BANK SOAL MATEMATIKA (SPLDV & Topik Matematika Kontekstual — Min 6 PG, 3 PGK, 3 Uraian)
// ============================================================================
export function buildMathQuestionBank(req: GenerationRequest, lowerMateri: string): QuestionBank {
  const isSPLDV = lowerMateri.includes('spldv') || lowerMateri.includes('persamaan linear');
  const isPecahan = lowerMateri.includes('pecahan') || lowerMateri.includes('desimal') || lowerMateri.includes('persen');

  if (isSPLDV) {
    return {
      capaianPembelajaran:
        'Peserta didik dapat menyelesaikan sistem persamaan linear dua variabel (SPLDV) melalui beberapa cara untuk penyelesaian masalah kontekstual.',
      tujuanPembelajaranDefault:
        'Peserta didik mampu memodelkan masalah sehari-hari ke dalam bentuk SPLDV dan menentukan himpunan penyelesaiannya dengan metode eliminasi-substitusi.',
      pgPool: [
        {
          stimulus: `Perhatikan daftar transaksi belanja di Koperasi Sekolah berikut!
Pada hari Senin, Dinda membeli 2 buku tulis dan 3 pensil seharga Rp17.000,00. Pada hari Selasa, Rafa membeli 1 buku tulis dan 2 pensil dengan jenis yang sama di koperasi tersebut seharga Rp10.000,00.`,
          pertanyaan:
            'Jika x menyatakan harga 1 buku tulis dan y menyatakan harga 1 pensil, maka model matematika Sistem Persamaan Linear Dua Variabel (SPLDV) yang tepat adalah ....',
          opsi5: [
            '2x + 3y = 17.000 dan x + 2y = 10.000',
            '3x + 2y = 17.000 dan 2x + y = 10.000',
            '2x + y = 17.000 dan 3x + 2y = 10.000',
            '2x - 3y = 17.000 dan x - 2y = 10.000',
            'x + y = 17.000 dan 2x + 3y = 10.000',
          ],
          kunci: 'A',
          pembahasan:
            '2 buku tulis dan 3 pensil seharga Rp17.000 → 2x + 3y = 17.000. 1 buku tulis dan 2 pensil seharga Rp10.000 → x + 2y = 10.000. Maka jawaban yang tepat adalah A (Pilihan A).',
          levelKognitif: 'C3 (Memodelkan Masalah ke SPLDV)',
          indikatorSoal: 'Disajikan ilustrasi transaksi belanja, peserta didik dapat menyusun model matematika SPLDV dengan tepat.',
        },
        {
          stimulus: `Gunakan data koperasi sekolah sebelumnya:
Persamaan (1): 2x + 3y = 17.000
Persamaan (2): x + 2y = 10.000`,
          pertanyaan:
            'Jika Budi ingin membeli 4 buku tulis dan 5 pensil di koperasi tersebut, berapakah total uang yang harus dibayarkan Budi?',
          opsi5: [
            'Rp27.000,00',
            'Rp29.000,00',
            'Rp31.000,00',
            'Rp33.000,00',
            'Rp35.000,00',
          ],
          kunci: 'C',
          pembahasan:
            'Eliminasi x: Kalikan persamaan (2) dengan 2 menjadi 2x + 4y = 20.000. Kurangkan dengan (2x + 3y = 17.000) sehingga diperoleh y = 3.000 (harga 1 pensil). Substitusikan y = 3.000 ke x + 2(3.000) = 10.000 → x = 4.000 (harga 1 buku). Maka harga 4 buku + 5 pensil = 4(4.000) + 5(3.000) = 16.000 + 15.000 = Rp31.000,00 (Pilihan C).',
          levelKognitif: 'C4 (Menganalisis & Memecahkan Masalah SPLDV)',
          indikatorSoal: 'Disajikan sistem persamaan linear dua variabel, peserta didik dapat menentukan nilai kombinasi variabel baru.',
        },
        {
          stimulus: `Sebuah tempat parkir menampung total 40 kendaraan yang terdiri atas sepeda motor (roda 2) dan mobil pribadi (roda 4). Jumlah seluruh roda kendaraan yang ada di tempat parkir tersebut adalah 110 roda.`,
          pertanyaan:
            'Jika tarif parkir sepeda motor Rp2.000,00 dan mobil Rp5.000,00, berapakah total pendapatan parkir pada saat itu?',
          opsi5: [
            'Rp110.000,00',
            'Rp115.000,00',
            'Rp125.000,00',
            'Rp130.000,00',
            'Rp145.000,00',
          ],
          kunci: 'C',
          pembahasan:
            'Misal motor = m dan mobil = b. Maka m + b = 40 (kali 2 → 2m + 2b = 80) dan 2m + 4b = 110. Kurangkan kedua persamaan: 2b = 30 → b = 15 mobil, sehingga m = 40 - 15 = 25 motor. Total pendapatan = 25(2.000) + 15(5.000) = 50.000 + 75.000 = Rp125.000,00 (Pilihan C).',
          levelKognitif: 'C4 (Penalaran Numerasi Kontekstual)',
          indikatorSoal: 'Disajikan masalah kontekstual jumlah kendaraan dan roda, peserta didik dapat menghitung pendapatan parkir menggunakan SPLDV.',
        },
        {
          stimulus: `Diketahui sistem persamaan linear dua variabel berikut:
3x + 2y = 16
2x - y = 6`,
          pertanyaan: 'Nilai dari (x + y) yang memenuhi sistem persamaan di atas adalah ....',
          opsi5: ['4', '5', '6', '7', '8'],
          kunci: 'C',
          pembahasan:
            'Dari persamaan kedua: y = 2x - 6. Substitusikan ke persamaan pertama: 3x + 2(2x - 6) = 16 → 3x + 4x - 12 = 16 → 7x = 28 → x = 4. Maka y = 2(4) - 6 = 2. Nilai x + y = 4 + 2 = 6 (Pilihan C).',
          levelKognitif: 'C3 (Menentukan Penyelesaian Aljabar SPLDV)',
          indikatorSoal: 'Disajikan dua persamaan linear, peserta didik dapat menghitung nilai penjumlahan kedua variabel penyelesaiannya.',
        },
        {
          stimulus: `Selisih umur seorang ayah dan anaknya saat ini adalah 26 tahun. Sedangkan jumlah umur mereka berdua adalah 46 tahun.`,
          pertanyaan: 'Berapakah umur ayah dan umur anak tersebut 3 tahun yang akan datang?',
          opsi5: [
            'Ayah 36 tahun dan Anak 10 tahun',
            'Ayah 39 tahun dan Anak 13 tahun',
            'Ayah 40 tahun dan Anak 14 tahun',
            'Ayah 38 tahun dan Anak 12 tahun',
            'Ayah 42 tahun dan Anak 16 tahun',
          ],
          kunci: 'B',
          pembahasan:
            'Misal umur ayah sekarang = A dan anak = B. Maka A - B = 26 dan A + B = 46. Jumlahkan kedua persamaan: 2A = 72 → A = 36 tahun, dan B = 46 - 36 = 10 tahun. Tiga tahun yang akan datang: umur Ayah = 36 + 3 = 39 tahun, dan umur Anak = 10 + 3 = 13 tahun (Pilihan B).',
          levelKognitif: 'C4 (Menganalisis Masalah Umur dengan SPLDV)',
          indikatorSoal: 'Disajikan masalah perbandingan/selisih umur, peserta didik dapat menentukan umur tokoh pada beberapa tahun mendatang.',
        },
        {
          stimulus: `Sebuah toko buah menjual Paket Hemat 1 berisi 2 kg apel dan 1 kg jeruk seharga Rp65.000,00. Paket Hemat 2 berisi 1 kg apel dan 2 kg jeruk seharga Rp55.000,00.`,
          pertanyaan: 'Harga 1 kg apel di toko buah tersebut adalah ....',
          opsi5: [
            'Rp15.000,00',
            'Rp20.000,00',
            'Rp25.000,00',
            'Rp30.000,00',
            'Rp35.000,00',
          ],
          kunci: 'C',
          pembahasan:
            'Misal apel = a dan jeruk = j. Persamaan (1): 2a + j = 65.000 (kali 2 → 4a + 2j = 130.000). Kurangkan dengan Persamaan (2) (a + 2j = 55.000): diperoleh 3a = 75.000 → a = Rp25.000,00 (Pilihan C).',
          levelKognitif: 'C3 (Menerapkan Eliminasi SPLDV)',
          indikatorSoal: 'Disajikan harga dua paket buah, peserta didik dapat menentukan harga satuan per kilogram salah satu jenis buah.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Paket Wisata Edukasi Museum:
Sebuah agen perjalanan menawarkan dua paket tiket masuk museum sains untuk rombongan:
• Paket A (3 Tiket Dewasa + 2 Tiket Pelajar) = Rp190.000,00
• Paket B (2 Tiket Dewasa + 2 Tiket Pelajar) = Rp140.000,00`,
          pertanyaan: 'Berdasarkan data di atas, tentukan Benar atau Salah untuk setiap pernyataan berikut!',
          pernyataan: [
            { teks: 'Harga 1 Tiket Dewasa ditambah 1 Tiket Pelajar adalah Rp70.000,00.', isBenar: true },
            { teks: 'Harga 1 Tiket Dewasa adalah Rp50.000,00 dan harga 1 Tiket Pelajar adalah Rp20.000,00.', isBenar: true },
            { teks: 'Selisih harga antara 1 Tiket Dewasa dan 1 Tiket Pelajar adalah Rp10.000,00.', isBenar: false },
          ],
          pembahasan:
            'Dari Paket B: 2D + 2P = 140.000 → D + P = 70.000 (Pernyataan 1 BENAR). Kurangkan Paket A (3D + 2P = 190.000) dengan Paket B (2D + 2P = 140.000) diperoleh D = Rp50.000,00 dan P = 70.000 - 50.000 = Rp20.000,00 (Pernyataan 2 BENAR). Selisih harga Dewasa dan Pelajar adalah Rp50.000 - Rp20.000 = Rp30.000,00, bukan Rp10.000,00 (Pernyataan 3 SALAH).',
          levelKognitif: 'C4 (Evaluasi Numerasi AKM)',
          indikatorSoal: 'Peserta didik dapat memvalidasi pernyataan numerasi berdasarkan sistem persamaan linear.',
        },
        {
          stimulus: `Geometri & Aljabar (Keliling Persegi Panjang):
Sebuah kebun percobaan biologi berbentuk persegi panjang memiliki keliling 44 meter. Selisih antara ukuran panjang (p) dan lebarnya (l) adalah 6 meter (p - l = 6).`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan berikut!',
          pernyataan: [
            { teks: 'Persamaan jumlah panjang dan lebar kebun tersebut adalah p + l = 22 meter.', isBenar: true },
            { teks: 'Ukuran panjang kebun adalah 14 meter dan lebarnya adalah 8 meter.', isBenar: true },
            { teks: 'Luas seluruh kebun percobaan tersebut adalah 96 m².', isBenar: false },
          ],
          pembahasan:
            'Keliling = 2(p + l) = 44 → p + l = 22 (Pernyataan 1 BENAR). Dari p + l = 22 dan p - l = 6, dijumlahkan menjadi 2p = 28 → p = 14 m dan l = 8 m (Pernyataan 2 BENAR). Luas kebun = 14 × 8 = 112 m², bukan 96 m² (Pernyataan 3 SALAH).',
          levelKognitif: 'C4 (Analisis Geometri dengan SPLDV)',
          indikatorSoal: 'Disajikan masalah keliling dan selisih sisi persegi panjang, peserta didik dapat mengevaluasi ukuran sisi dan luasnya.',
        },
        {
          stimulus: `Kedai Jus Buah Sehat:
Harga 2 gelas jus alpukat dan 1 gelas jus mangga adalah Rp32.000,00. Sedangkan harga 1 gelas jus alpukat dan 1 gelas jus mangga adalah Rp20.000,00.`,
          pertanyaan: 'Berdasarkan informasi tersebut, tentukan Benar atau Salah untuk setiap pernyataan di bawah ini!',
          pernyataan: [
            { teks: 'Harga 1 gelas jus alpukat adalah Rp12.000,00.', isBenar: true },
            { teks: 'Harga 1 gelas jus mangga lebih mahal daripada 1 gelas jus alpukat.', isBenar: false },
            { teks: 'Jika membeli 3 gelas jus mangga, total yang harus dibayar adalah Rp24.000,00.', isBenar: true },
          ],
          pembahasan:
            'Kurangkan (2A + M = 32.000) dengan (A + M = 20.000) diperoleh A = Rp12.000,00 (Pernyataan 1 BENAR) dan M = 20.000 - 12.000 = Rp8.000,00. Karena Rp8.000 < Rp12.000, maka Pernyataan 2 SALAH. Harga 3 jus mangga = 3 × Rp8.000 = Rp24.000,00 (Pernyataan 3 BENAR).',
          levelKognitif: 'C4 (Evaluasi Transaksi SPLDV)',
          indikatorSoal: 'Peserta didik dapat memvalidasi perbandingan harga satuan dan total belanja dari model SPLDV.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Tantangan Wirausaha Sekolah:
Panitia bazar sekolah menjual dua jenis paket minuman sehat. Paket Sehat 1 berisi 2 botol jus jeruk dan 1 botol susu kedelai dengan harga Rp23.000,00. Paket Sehat 2 berisi 1 botol jus jeruk dan 2 botol susu kedelai dengan harga Rp22.000,00.`,
          pertanyaan: `Selesaikan permasalahan berikut secara runtut:
a) Buatlah pemisalan variabel dan model matematika SPLDV dari permasalahan di atas!
b) Tentukan harga satuan 1 botol jus jeruk dan 1 botol susu kedelai menggunakan metode gabungan (eliminasi-substitusi)!
c) Jika Ibu Guru membeli 5 botol jus jeruk dan 5 botol susu kedelai dengan membayar uang Rp100.000,00, berapakah uang kembalian yang diterima Ibu Guru?`,
          pedomanPenskoran: `Skor 20: Model matematika tepat (5 poin), langkah eliminasi-substitusi benar menemukan x = Rp8.000 dan y = Rp7.000 (10 poin), dan menghitung uang kembalian Rp25.000 dengan tepat (5 poin).`,
          contohJawaban: `a) Misal x = harga 1 botol jus jeruk, y = harga 1 botol susu kedelai.
Model SPLDV:
2x + y = 23.000 ... (1)
x + 2y = 22.000 ... (2)

b) Kalikan persamaan (1) dengan 2: 4x + 2y = 46.000.
Kurangkan dengan (x + 2y = 22.000):
3x = 24.000 → x = Rp8.000,00 (Jus Jeruk).
Substitusi x = 8.000 ke (1): 2(8.000) + y = 23.000 → y = Rp7.000,00 (Susu Kedelai).

c) Total belanja 5 jus + 5 susu = 5(8.000) + 5(7.000) = 40.000 + 35.000 = Rp75.000,00.
Uang kembalian = Rp100.000 - Rp75.000 = Rp25.000,00.`,
          levelKognitif: 'C5 (Memecahkan Masalah Kontekstual HOTS)',
          indikatorSoal: 'Peserta didik dapat memodelkan dan menyelesaikan masalah transaksi bertingkat menggunakan SPLDV.',
        },
        {
          stimulus: `Pemesanan Kamar Asrama Diklat:
Sebuah gedung diklat memiliki kamar berkapasitas 2 orang (Tipe Standar) dan kamar berkapasitas 3 orang (Tipe Keluarga). Saat kegiatan berlangsung, terdapat 25 kamar yang terisi penuh oleh total 60 orang peserta.`,
          pertanyaan: `Hitunglah secara sistematis:
a) Model matematika SPLDV dari jumlah kamar dan jumlah peserta!
b) Banyaknya kamar Tipe Standar (2 orang) dan kamar Tipe Keluarga (3 orang) yang terisi!`,
          pedomanPenskoran: `Skor 20: Menyusun persamaan x + y = 25 dan 2x + 3y = 60 dengan tepat (8 poin), serta menghitung x = 15 kamar dan y = 10 kamar dengan benar (12 poin).`,
          contohJawaban: `a) Misal x = banyak kamar Tipe Standar (2 orang), dan y = banyak kamar Tipe Keluarga (3 orang).
Persamaan (1): x + y = 25
Persamaan (2): 2x + 3y = 60

b) Kalikan Persamaan (1) dengan 2: 2x + 2y = 50.
Kurangkan Persamaan (2) dengan hasil tersebut:
(2x + 3y) - (2x + 2y) = 60 - 50 → y = 10 kamar Tipe Keluarga.
Substitusikan y = 10 ke x + 10 = 25 → x = 15 kamar Tipe Standar.`,
          levelKognitif: 'C4 (Pemecahan Masalah Kapasitas dengan SPLDV)',
          indikatorSoal: 'Peserta didik mampu menentukan banyaknya masing-masing jenis objek dari permasalahan kapasitas total.',
        },
        {
          stimulus: `Kompetisi Olimpiade Sains:
Dalam sebuah babak penyisihan olimpiade, seorang peserta menjawab 30 soal. Setiap jawaban benar diberi skor +4, dan setiap jawaban salah diberi skor -1. Peserta tersebut memperoleh total skor 85.`,
          pertanyaan: `Dengan memisalkan b = banyak jawaban benar dan s = banyak jawaban salah:
a) Tuliskan dua persamaan linear yang menggambarkan situasi di atas!
b) Berapakah banyaknya soal yang dijawab benar oleh peserta tersebut?`,
          pedomanPenskoran: `Skor 20: Menyusun persamaan b + s = 30 dan 4b - s = 85 (8 poin), serta menemukan b = 23 soal benar dan s = 7 soal salah (12 poin).`,
          contohJawaban: `a) Model SPLDV:
b + s = 30  ...(1)
4b - s = 85 ...(2)

b) Jumlahkan kedua persamaan untuk mengeliminasi s:
(b + 4b) + (s - s) = 30 + 85
5b = 115 → b = 115 / 5 = 23 soal dijawab benar (dan s = 30 - 23 = 7 soal salah).`,
          levelKognitif: 'C4 (Menerapkan SPLDV pada Sistem Penskoran)',
          indikatorSoal: 'Peserta didik dapat menghitung jumlah jawaban benar pada sistem skor kompetisi menggunakan SPLDV.',
        },
      ],
    };
  }

  if (isPecahan) {
    return {
      capaianPembelajaran:
        'Peserta didik dapat melakukan operasi hitung pecahan biasa, pecahan campuran, desimal, dan persen serta menyelesaikan masalah kontekstual sehari-hari.',
      tujuanPembelajaranDefault:
        'Peserta didik mampu mengubah berbagai bentuk pecahan dan menghitung hasil penjumlahan, pengurangan, perkalian, serta pembagian pecahan dalam soal cerita.',
      pgPool: [
        {
          stimulus: `Ibu membeli 2 1/2 kg gula pasir di warung. Sebanyak 1,25 kg gula pasir digunakan untuk membuat sirup buah, kemudian Ibu membeli lagi 3/4 kg gula pasir.`,
          pertanyaan: 'Berapa kilogram persediaan gula pasir Ibu sekarang?',
          opsi5: ['1,50 kg', '1,75 kg', '2,00 kg', '2,25 kg', '2,50 kg'],
          kunci: 'C',
          pembahasan:
            'Ubah ke desimal: 2 1/2 kg = 2,50 kg; digunakan 1,25 kg; ditambah 3/4 kg = 0,75 kg. Maka sisa gula = 2,50 - 1,25 + 0,75 = 1,25 + 0,75 = 2,00 kg (Pilihan C).',
          levelKognitif: 'C3 (Operasi Hitung Campuran Pecahan & Desimal)',
          indikatorSoal: 'Disajikan soal cerita persediaan bahan makanan, peserta didik dapat menghitung operasi campuran pecahan dan desimal.',
        },
        {
          stimulus: `Di sebuah kelas yang terdiri atas 40 siswa, sebanyak 60% siswa mengikuti ekstrakurikuler Pramuka, 1/4 bagian mengikuti Klub Sains, dan sisanya mengikuti Seni Lukis.`,
          pertanyaan: 'Berapa banyak siswa yang mengikuti ekstrakurikuler Seni Lukis?',
          opsi5: ['4 siswa', '6 siswa', '8 siswa', '10 siswa', '12 siswa'],
          kunci: 'B',
          pembahasan:
            'Pramuka = 60% × 40 = 24 siswa. Klub Sains = 1/4 × 40 = 10 siswa. Maka siswa yang mengikuti Seni Lukis = 40 - (24 + 10) = 40 - 34 = 6 siswa (Pilihan B).',
          levelKognitif: 'C4 (Menganalisis Proporsi Persen & Pecahan)',
          indikatorSoal: 'Disajikan data persentase dan pecahan jumlah siswa, peserta didik dapat menentukan jumlah siswa pada kelompok sisa.',
        },
        {
          stimulus: `Perhatikan empat bilangan berikut:
3/4 ; 0,65 ; 70% ; 4/5`,
          pertanyaan: 'Urutan bilangan-bilangan tersebut dari yang TERKECIL ke yang TERBESAR adalah ....',
          opsi5: [
            '0,65 ; 70% ; 3/4 ; 4/5',
            '70% ; 0,65 ; 3/4 ; 4/5',
            '3/4 ; 4/5 ; 70% ; 0,65',
            '0,65 ; 3/4 ; 70% ; 4/5',
            '4/5 ; 3/4 ; 70% ; 0,65',
          ],
          kunci: 'A',
          pembahasan:
            'Ubah semua ke bentuk desimal 2 angka di belakang koma: 3/4 = 0,75 ; 0,65 = 0,65 ; 70% = 0,70 ; 4/5 = 0,80. Urutan dari terkecil ke terbesar adalah 0,65 ; 70% (0,70) ; 3/4 (0,75) ; 4/5 (0,80) (Pilihan A).',
          levelKognitif: 'C3 (Mengurutkan Berbagai Bentuk Pecahan)',
          indikatorSoal: 'Disajikan empat pecahan berbeda bentuk, peserta didik dapat mengurutkannya dari nilai terkecil ke terbesar.',
        },
        {
          stimulus: `Sebuah pita hias sepanjang 6 meter akan dipotong-potong menjadi beberapa bagian yang sama panjang. Setiap potongan pita memiliki panjang 3/4 meter.`,
          pertanyaan: 'Berapa banyak potongan pita yang dihasilkan seluruhnya?',
          opsi5: ['6 potong', '7 potong', '8 potong', '9 potong', '10 potong'],
          kunci: 'C',
          pembahasan:
            'Banyak potongan pita = 6 ÷ (3/4) = 6 × (4/3) = 24 / 3 = 8 potong pita (Pilihan C).',
          levelKognitif: 'C3 (Pembagian Bilangan Bulat dengan Pecahan)',
          indikatorSoal: 'Disajikan masalah pembagian panjang benda dengan ukuran pecahan, peserta didik dapat menentukan banyak potongan.',
        },
        {
          stimulus: `Sebuah toko buku memberikan diskon sebesar 20% untuk sebuah kamus Bahasa Inggris yang harga awalnya Rp120.000,00.`,
          pertanyaan: 'Berapakah harga yang harus dibayar pembeli setelah mendapat diskon tersebut?',
          opsi5: [
            'Rp84.000,00',
            'Rp90.000,00',
            'Rp96.000,00',
            'Rp100.000,00',
            'Rp104.000,00',
          ],
          kunci: 'C',
          pembahasan:
            'Besar potongan diskon = 20% × Rp120.000 = (20/100) × 120.000 = Rp24.000,00. Harga setelah diskon = Rp120.000 - Rp24.000 = Rp96.000,00 (Pilihan C).',
          levelKognitif: 'C3 (Menghitung Persentase Diskon Kontekstual)',
          indikatorSoal: 'Disajikan harga barang dan persentase diskon, peserta didik dapat menghitung harga bersih yang harus dibayar.',
        },
        {
          stimulus: `Pak Budi memiliki lahan kebun seluas 360 m². Sebanyak 1/3 bagian ditanami cabai, 2/5 bagian ditanami tomat, dan sisanya dibuat kolam ikan.`,
          pertanyaan: 'Berapakah luas lahan yang digunakan untuk membuat kolam ikan?',
          opsi5: ['72 m²', '84 m²', '96 m²', '108 m²', '120 m²'],
          kunci: 'C',
          pembahasan:
            'Lahan cabai = 1/3 × 360 = 120 m². Lahan tomat = 2/5 × 360 = 144 m². Luas kolam ikan = 360 - (120 + 144) = 360 - 264 = 96 m² (Pilihan C).',
          levelKognitif: 'C4 (Memecahkan Masalah Bagian Lahan)',
          indikatorSoal: 'Disajikan luas lahan dan bagian-bagian pecahannya, peserta didik dapat menghitung luas bagian sisa.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Tabel Konversi Nilai Pecahan, Desimal, dan Persen:
Perhatikan kesetaraan nilai pecahan yang sering digunakan dalam perhitungan sehari-hari!`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kesetaraan pecahan di bawah ini!',
          pernyataan: [
            { teks: 'Pecahan 3/5 senilai dengan bentuk desimal 0,6 dan bentuk persen 60%.', isBenar: true },
            { teks: 'Hasil dari 1/2 + 1/4 adalah 2/6.', isBenar: false },
            { teks: 'Hasil perkalian 2,5 × 0,4 adalah sama dengan 1.', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 BENAR (3/5 = 6/10 = 0,6 = 60%). Pernyataan 2 SALAH karena penjumlahan pecahan harus menyamakan penyebut terlebih dahulu: 1/2 + 1/4 = 2/4 + 1/4 = 3/4 (bukan 2/6). Pernyataan 3 BENAR (2,5 × 0,4 = 1,00 = 1).',
          levelKognitif: 'C4 (Evaluasi Konsep Operasi Pecahan)',
          indikatorSoal: 'Peserta didik dapat memvalidasi kebenaran konversi dan operasi hitung pecahan.',
        },
        {
          stimulus: `Resep Jus Buah Segar Koperasi Siswa:
Untuk membuat 1 teko besar jus buah campuran, diperlukan:
• 3/4 liter sari jeruk manis
• 0,5 liter air kelapa muda
• 1/4 liter sirup madu`,
          pertanyaan: 'Berdasarkan resep di atas, tentukan Benar atau Salah untuk setiap pernyataan berikut!',
          pernyataan: [
            { teks: 'Volume total 1 teko jus buah campuran tersebut adalah 1,5 liter.', isBenar: true },
            { teks: 'Volume sari jeruk manis lebih sedikit daripada volume air kelapa muda.', isBenar: false },
            { teks: 'Jika ingin membuat 2 teko besar jus, diperlukan 1,5 liter sari jeruk manis.', isBenar: true },
          ],
          pembahasan:
            'Total volume = 0,75 + 0,50 + 0,25 = 1,50 liter (Pernyataan 1 BENAR). Sari jeruk (0,75 L) lebih banyak daripada air kelapa (0,50 L), sehingga Pernyataan 2 SALAH. Untuk 2 teko dibutuhkan 2 × 0,75 L = 1,5 liter sari jeruk (Pernyataan 3 BENAR).',
          levelKognitif: 'C4 (Analisis Takaran Pecahan AKM)',
          indikatorSoal: 'Disajikan resep minuman dengan satuan pecahan dan desimal, peserta didik dapat mengevaluasi total volume dan perbandingannya.',
        },
        {
          stimulus: `Panen Buah Mangga Pak Rahmat:
Pak Rahmat memanen 80 kg buah mangga. Sebanyak 15% dibagikan kepada tetangga, dan sisanya dijual ke pasar dengan harga Rp15.000,00 per kg.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan berikut!',
          pernyataan: [
            { teks: 'Berat mangga yang dibagikan kepada tetangga adalah 12 kg.', isBenar: true },
            { teks: 'Berat mangga yang dijual ke pasar adalah 68 kg.', isBenar: true },
            { teks: 'Total uang hasil penjualan mangga di pasar adalah Rp900.000,00.', isBenar: false },
          ],
          pembahasan:
            'Dibagikan = 15% × 80 kg = 12 kg (Pernyataan 1 BENAR). Dijual = 80 - 12 = 68 kg (Pernyataan 2 BENAR). Hasil penjualan = 68 × Rp15.000 = Rp1.020.000,00, bukan Rp900.000,00 (Pernyataan 3 SALAH).',
          levelKognitif: 'C4 (Evaluasi Numerasi Persentase)',
          indikatorSoal: 'Peserta didik dapat memvalidasi perhitungan persentase hasil panen dan nilai penjualannya.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Pembagian Warisan Kebun & Donasi Sosial:
Seorang dermawan memanen 120 kg beras dari sawahnya. Sebanyak 1/4 bagian disimpan untuk konsumsi keluarga, 35% disumbangkan ke panti asuhan, dan sisanya dikemas ke dalam kantong-kantong kecil yang masing-masing berisi 1,5 kg beras.`,
          pertanyaan: `Hitunglah secara runtut:
a) Berapa kg beras yang disimpan untuk keluarga dan berapa kg yang disumbangkan ke panti asuhan?
b) Berapa kg sisa beras yang akan dikemas ke dalam kantong kecil?
c) Berapa banyak kantong kecil (ukuran 1,5 kg) yang berhasil dibuat?`,
          pedomanPenskoran: `Skor 20: Menghitung beras keluarga = 30 kg & panti = 42 kg (8 poin), sisa beras = 48 kg (6 poin), dan banyak kantong = 32 kantong (6 poin).`,
          contohJawaban: `a) Beras untuk keluarga = 1/4 × 120 kg = 30 kg.
   Beras untuk panti asuhan = 35% × 120 kg = (35/100) × 120 = 42 kg.
b) Sisa beras = 120 kg - (30 kg + 42 kg) = 120 - 72 = 48 kg.
c) Banyak kantong ukuran 1,5 kg = 48 ÷ 1,5 = 48 ÷ (3/2) = 48 × (2/3) = 32 kantong.`,
          levelKognitif: 'C5 (Memecahkan Masalah Operasi Pecahan Bertingkat)',
          indikatorSoal: 'Peserta didik mampu menyelesaikan soal cerita bertingkat yang melibatkan pecahan, persen, dan pembagian desimal.',
        },
        {
          stimulus: `Belanja Cerdas di Koperasi Sekolah:
Andi membawa uang Rp50.000,00 ke koperasi. Ia membeli 1 pak buku tulis seharga Rp28.000,00 yang sedang mendapat diskon 10%, dan membeli 2 buah pulpen dengan harga Rp6.500,00 per buah.`,
          pertanyaan: `a) Berapakah harga 1 pak buku tulis setelah dikurangi diskon 10%?
b) Berapakah total belanja Andi seluruhnya dan berapa uang kembaliannya?`,
          pedomanPenskoran: `Skor 20: Menghitung harga buku setelah diskon Rp25.200 (10 poin) serta total belanja Rp38.200 dan kembalian Rp11.800 (10 poin).`,
          contohJawaban: `a) Diskon buku = 10% × Rp28.000 = Rp2.800,00.
   Harga buku setelah diskon = Rp28.000 - Rp2.800 = Rp25.200,00.
b) Harga 2 pulpen = 2 × Rp6.500 = Rp13.000,00.
   Total belanja = Rp25.200 + Rp13.000 = Rp38.200,00.
   Uang kembalian = Rp50.000 - Rp38.200 = Rp11.800,00.`,
          levelKognitif: 'C4 (Menghitung Diskon & Kembalian)',
          indikatorSoal: 'Peserta didik dapat menerapkan perhitungan diskon persentase dalam transaksi belanja nyata.',
        },
        {
          stimulus: `Operasi Campuran Pecahan:
Perhatikan ekspresi matematika berikut:
(2 1/4 + 1 1/2) ÷ 3/4`,
          pertanyaan: `Hitunglah hasil akhir dari operasi pecahan di atas dengan menuliskan langkah penyamaan penyebut dan perkalian kebalikannya secara jelas!`,
          pedomanPenskoran: `Skor 20: Mengubah ke pecahan biasa 9/4 + 3/2 = 15/4 (10 poin), lalu membagi dengan 3/4 menghasilkan 5 (10 poin).`,
          contohJawaban: `1) Kerjakan penjumlahan di dalam kurung terlebih dahulu:
   2 1/4 + 1 1/2 = 9/4 + 3/2 = 9/4 + 6/4 = 15/4.
2) Lakukan operasi pembagian dengan membalik pecahan pembagi:
   15/4 ÷ 3/4 = 15/4 × 4/3 = 15/3 = 5.`,
          levelKognitif: 'C3 (Operasi Hitung Pecahan Campuran)',
          indikatorSoal: 'Peserta didik dapat menyelesaikan operasi hitung campuran penjumlahan dan pembagian pecahan.',
        },
      ],
    };
  }

  // Fallback Matematika Kontekstual Lengkap (Bangun Datar, Pythagoras, Barisan/Deret, Trigonometri, Matriks, Statistika — 6 PG, 3 PGK, 3 Uraian)
  return {
    capaianPembelajaran: `Peserta didik mampu memahami konsep, melakukan operasi hitung aljabar/geometri/numerasi, dan menyelesaikan masalah kontekstual pada materi ${req.materiPokok}.`,
    tujuanPembelajaranDefault: `Peserta didik dapat menerapkan rumus dan penalaran matematis untuk menyelesaikan soal-soal ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: `Sebuah taman sekolah berbentuk persegi panjang memiliki ukuran panjang (2x + 4) meter dan lebar (x + 1) meter. Diketahui keliling taman tersebut adalah 34 meter.`,
        pertanyaan: `Berdasarkan informasi di atas, berapakah luas taman sekolah tersebut dalam satuan m²?`,
        opsi5: ['48 m²', '60 m²', '66 m²', '72 m²', '84 m²'],
        kunci: 'B',
        pembahasan:
          'Keliling = 2(p + l) = 34 → p + l = 17 → (2x + 4) + (x + 1) = 17 → 3x + 5 = 17 → 3x = 12 → x = 4. Maka panjang p = 2(4) + 4 = 12 m, dan lebar l = 4 + 1 = 5 m. Luas taman = p × l = 12 × 5 = 60 m² (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Model Geometri & Aljabar)',
        indikatorSoal: `Disajikan masalah geometri/aljabar kontekstual terkait ${req.materiPokok}, peserta didik dapat menghitung luas area dengan tepat.`,
      },
      {
        stimulus: `Dalam suatu pengamatan pola bilangan pada materi ${req.materiPokok}, seorang siswa mencatat barisan nilai terukur pada 4 tahap pertama berturut-turut adalah: 7, 11, 15, 19, ....`,
        pertanyaan: 'Jika pola tersebut terus berlanjut secara konsisten, berapakah nilai pada tahap ke-12?',
        opsi5: ['47', '51', '55', '59', '63'],
        kunci: 'B',
        pembahasan:
          'Barisan memiliki suku pertama a = 7 dan selisih tetap b = 4. Rumus suku ke-n: Un = a + (n - 1)b. Maka U12 = 7 + (11 × 4) = 7 + 44 = 51 (Pilihan B).',
        levelKognitif: 'C3 (Menerapkan Pola Barisan & Rumus)',
        indikatorSoal: 'Peserta didik dapat menentukan nilai suku ke-n dari suatu pola bilangan kontekstual.',
      },
      {
        stimulus: `Sebuah tangga yang panjangnya 13 meter disandarkan pada dinding gedung vertikal. Jarak ujung bawah tangga di tanah terhadap pangkal dinding adalah 5 meter.`,
        pertanyaan: 'Tinggi dinding yang dicapai oleh ujung atas tangga tersebut adalah ....',
        opsi5: ['8 meter', '10 meter', '11 meter', '12 meter', '15 meter'],
        kunci: 'D',
        pembahasan:
          'Berdasarkan Teorema Pythagoras pada segitiga siku-siku: tinggi² = miring² - alas² = 13² - 5² = 169 - 25 = 144. Maka tinggi dinding = √144 = 12 meter (Pilihan D).',
        levelKognitif: 'C3 (Menerapkan Teorema Pythagoras)',
        indikatorSoal: 'Disajikan masalah kontekstual tangga bersandar pada dinding, peserta didik dapat menghitung tinggi dinding dengan tepat.',
      },
      {
        stimulus: `Rata-rata nilai ujian Matematika dari 8 orang siswa dalam kelompok belajar adalah 75. Ketika nilai 2 orang siswa baru digabungkan ke dalam kelompok tersebut, rata-rata nilainya menjadi 77.`,
        pertanyaan: 'Berapakah rata-rata nilai dari 2 orang siswa baru tersebut?',
        opsi5: ['80', '82', '85', '87', '90'],
        kunci: 'C',
        pembahasan:
          'Jumlah nilai 8 siswa awal = 8 × 75 = 600. Jumlah nilai 10 siswa setelah digabung = 10 × 77 = 770. Jumlah nilai 2 siswa baru = 770 - 600 = 170. Maka rata-rata nilai 2 siswa baru tersebut = 170 / 2 = 85 (Pilihan C).',
        levelKognitif: 'C4 (Menganalisis Rata-Rata Gabungan)',
        indikatorSoal: 'Disajikan data perubahan nilai rata-rata kelompok, peserta didik dapat menentukan rata-rata nilai anggota yang baru bergabung.',
      },
      {
        stimulus: `Di dalam sebuah kotak terdapat 5 bola merah, 4 bola biru, dan 3 bola kuning yang berukuran identik. Jika diambil 1 bola secara acak dari dalam kotak tersebut, berapakah peluang terambilnya bola berwarna biru?`,
        pertanyaan: 'Nilai peluang terambilnya bola berwarna biru adalah ....',
        opsi5: ['1/4', '1/3', '5/12', '1/2', '2/3'],
        kunci: 'B',
        pembahasan:
          'Banyaknya seluruh bola n(S) = 5 + 4 + 3 = 12 bola. Banyaknya bola biru n(A) = 4 bola. Maka peluang P(Biru) = n(A) / n(S) = 4 / 12 = 1/3 (Pilihan B).',
        levelKognitif: 'C3 (Menghitung Peluang Kejadian)',
        indikatorSoal: 'Disajikan komposisi objek dalam wadah, peserta didik dapat menentukan peluang teoretik suatu kejadian.',
      },
      {
        stimulus: `Sebuah aula pertemuan menyusun kursi dalam 8 baris. Baris pertama berisi 15 kursi, baris kedua 18 kursi, baris ketiga 21 kursi, dan seterusnya selalu bertambah 3 kursi pada baris berikutnya.`,
        pertanyaan: 'Jumlah seluruh kursi yang ada di dalam aula pertemuan tersebut adalah ....',
        opsi5: ['180 kursi', '196 kursi', '204 kursi', '216 kursi', '228 kursi'],
        kunci: 'C',
        pembahasan:
          'Deret aritmetika dengan a = 15, b = 3, dan n = 8. Gunakan rumus Sn = (n/2) × (2a + (n - 1)b) → S8 = (8/2) × (2(15) + 7(3)) = 4 × (30 + 21) = 4 × 51 = 204 kursi (Pilihan C).',
        levelKognitif: 'C4 (Menghitung Jumlah Deret Kontekstual)',
        indikatorSoal: 'Disajikan susunan baris kursi yang membentuk deret aritmetika, peserta didik dapat menghitung kapasitas total kursi.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Data Nilai Ujian Matematika Kelas ${req.kelas}:
Rata-rata nilai dari 5 orang siswa dalam satu kelompok belajar adalah 80. Empat siswa pertama memperoleh nilai berturut-turut: 75, 80, 85, dan 70.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan analisis berikut!',
        pernyataan: [
          { teks: 'Jumlah seluruh nilai dari kelima siswa tersebut adalah 400.', isBenar: true },
          { teks: 'Nilai siswa kelima adalah 90.', isBenar: true },
          { teks: 'Selisih nilai tertinggi dan terendah dalam kelompok tersebut adalah 10.', isBenar: false },
        ],
        pembahasan:
          'Total 5 nilai = 5 × 80 = 400 (Pernyataan 1 BENAR). Nilai siswa ke-5 = 400 - (75+80+85+70) = 400 - 310 = 90 (Pernyataan 2 BENAR). Nilai tertinggi 90 dan terendah 70, sehingga selisihnya 20, bukan 10 (Pernyataan 3 SALAH).',
        levelKognitif: 'C4 (Evaluasi Data Numerasi AKM)',
        indikatorSoal: 'Peserta didik dapat memvalidasi pernyataan berdasarkan pengolahan data numerasi.',
      },
      {
        stimulus: `Taman Segitiga Siku-Siku:
Sebuah taman bunga berbentuk segitiga siku-siku memiliki panjang sisi siku-siku masing-masing 6 meter dan 8 meter.`,
        pertanyaan: 'Berdasarkan ukuran taman di atas, tentukan Benar atau Salah untuk setiap pernyataan berikut!',
        pernyataan: [
          { teks: 'Panjang sisi miring (hipotenusa) taman tersebut adalah 10 meter.', isBenar: true },
          { teks: 'Keliling seluruh tepi taman segitiga tersebut adalah 24 meter.', isBenar: true },
          { teks: 'Luas permukaan taman segitiga tersebut adalah 48 m².', isBenar: false },
        ],
        pembahasan:
          'Sisi miring c = √(6² + 8²) = √(36 + 64) = √100 = 10 m (Pernyataan 1 BENAR). Keliling = 6 + 8 + 10 = 24 m (Pernyataan 2 BENAR). Luas segitiga = ½ × alas × tinggi = ½ × 6 × 8 = 24 m², bukan 48 m² (Pernyataan 3 SALAH).',
        levelKognitif: 'C4 (Evaluasi Geometri Segitiga)',
        indikatorSoal: 'Disajikan ukuran sisi segitiga siku-siku, peserta didik dapat mengevaluasi panjang sisi miring, keliling, dan luasnya.',
      },
      {
        stimulus: `Tabungan Pelajar Berpola Aritmetika:
Siti menabung secara rutin setiap minggu. Pada minggu ke-1 ia menabung Rp10.000,00, minggu ke-2 Rp15.000,00, minggu ke-3 Rp20.000,00, dan selalu bertambah Rp5.000,00 setiap minggunya.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan berikut!',
        pernyataan: [
          { teks: 'Besar uang yang ditabung Siti pada minggu ke-6 adalah Rp35.000,00.', isBenar: true },
          { teks: 'Selisih tetap (beda) tabungan Siti antar-minggu adalah Rp10.000,00.', isBenar: false },
          { teks: 'Total seluruh tabungan Siti setelah 4 minggu pertama adalah Rp70.000,00.', isBenar: true },
        ],
        pembahasan:
          'U6 = 10.000 + 5(5.000) = Rp35.000,00 (Pernyataan 1 BENAR). Beda tetap (b) adalah Rp5.000,00, bukan Rp10.000,00 (Pernyataan 2 SALAH). Total 4 minggu = 10.000 + 15.000 + 20.000 + 25.000 = Rp70.000,00 (Pernyataan 3 BENAR).',
        levelKognitif: 'C4 (Evaluasi Pola Bilangan Kontekstual)',
        indikatorSoal: 'Peserta didik dapat memvalidasi nilai suku tertentu dan jumlah total pada barisan tabungan.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Penerapan Kontekstual Matematika (${req.materiPokok}):
Sebuah lahan berbentuk persegi panjang memiliki keliling 40 meter dan selisih panjang terhadap lebarnya adalah 4 meter.`,
        pertanyaan: `Hitunglah secara sistematis:
a) Ukuran panjang dan lebar lahan persegi panjang tersebut!
b) Luas permukaan lahan dan biaya pemasangan pagar di sekelilingnya jika harga pagar Rp50.000,00 per meter!`,
        pedomanPenskoran: `Skor 20: Menemukan p = 12 m dan l = 8 m dengan langkah sistematis (10 poin), serta menghitung luas = 96 m² dan biaya pagar = Rp2.000.000,00 (10 poin).`,
        contohJawaban: `a) Keliling = 2(p + l) = 40 → p + l = 20. Diketahui p - l = 4. Jumlahkan keduanya: 2p = 24 → p = 12 meter, sehingga l = 8 meter.\nb) Luas lahan = 12 m × 8 m = 96 m². Biaya pemasangan pagar = Keliling × Rp50.000 = 40 m × Rp50.000 = Rp2.000.000,00.`,
        levelKognitif: 'C4-C5 (Pemecahan Masalah Geometri & Biaya)',
        indikatorSoal: `Peserta didik dapat menyelesaikan permasalahan matematis ukuran lahan dan estimasi biaya secara akurat.`,
      },
      {
        stimulus: `Analisis Data & Statistika Kelas:
Hasil nilai kuis Matematika dari 7 orang siswa adalah sebagai berikut:
70, 85, 80, 90, 75, 80, 80.`,
        pertanyaan: `Berdasarkan data nilai di atas, tentukan:
a) Urutan data dari nilai terkecil ke terbesar!
b) Nilai Rata-rata (Mean), Nilai Tengah (Median), dan Nilai yang Paling Sering Muncul (Modus)!`,
        pedomanPenskoran: `Skor 20: Mengurutkan data dengan benar (5 poin) serta menghitung Mean = 80, Median = 80, dan Modus = 80 (15 poin).`,
        contohJawaban: `a) Urutan data dari terkecil: 70, 75, 80, 80, 80, 85, 90.
b) • Mean (Rata-rata) = (70 + 75 + 80 + 80 + 80 + 85 + 90) / 7 = 560 / 7 = 80.
   • Median (Data ke-4 dari 7 data terurut) = 80.
   • Modus (Nilai dengan frekuensi terbanyak, muncul 3 kali) = 80.`,
        levelKognitif: 'C3-C4 (Menghitung Mean, Median, Modus)',
        indikatorSoal: 'Peserta didik dapat mengolah data tunggal untuk menentukan ukuran pemusatan data.',
      },
      {
        stimulus: `Pola Pertumbuhan Produksi Kerajinan:
Sebuah usaha mikro kerajinan bambu memproduksi 50 unit keranjang pada bulan pertama. Karena permintaan meningkat, produksi ditingkatkan secara tetap sebanyak 15 unit setiap bulannya.`,
        pertanyaan: `Hitunglah dengan menggunakan rumus Barisan dan Deret Aritmetika:
a) Berapa unit keranjang yang diproduksi pada bulan ke-6?
b) Berapa total seluruh keranjang yang berhasil diproduksi selama 6 bulan pertama?`,
        pedomanPenskoran: `Skor 20: Menghitung U6 = 125 unit (10 poin) dan S6 = 525 unit (10 poin).`,
        contohJawaban: `Diketahui: suku pertama (a) = 50, beda (b) = 15.
a) Produksi bulan ke-6 (U₆):
   U₆ = a + (6 - 1)b = 50 + 5(15) = 50 + 75 = 125 unit.
b) Total produksi 6 bulan pertama (S₆):
   S₆ = (6/2) × (a + U₆) = 3 × (50 + 125) = 3 × 175 = 525 unit.`,
        levelKognitif: 'C4 (Menerapkan Barisan & Deret pada Produksi)',
        indikatorSoal: 'Peserta didik dapat menghitung jumlah produksi pada bulan ke-n dan akumulasi produksi menggunakan rumus aritmetika.',
      },
    ],
  };
}

