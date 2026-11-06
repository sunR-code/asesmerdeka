import type {
  RangkumanRequest,
  RangkumanDokumen,
  RumusAtauPolaItem,
  ContohKonkretRangkuman,
} from '../../types/summary';
import { getJenjangLabel } from './helpers';

// ============================================================================
// 2. ENGINE KHUSUS MATEMATIKA (SD vs SMP vs SMA/SMK dengan Contoh Terhitung Nyata)
// ============================================================================
export function buildMathTopicRangkuman(
  req: RangkumanRequest,
  rawTopik: string,
  lowerTopik: string,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const jenjangLabel = getJenjangLabel(req);
  const isSPLDV = lowerTopik.includes('spldv') || lowerTopik.includes('persamaan linear');
  const isPecahan = lowerTopik.includes('pecahan') || lowerTopik.includes('desimal') || lowerTopik.includes('persen');
  const isBangunDatar = lowerTopik.includes('bangun datar') || lowerTopik.includes('keliling') || lowerTopik.includes('luas');
  const isPythagoras = lowerTopik.includes('pythagoras') || lowerTopik.includes('segitiga');
  const isTrigonometri = lowerTopik.includes('trigonometri') || lowerTopik.includes('sinus') || lowerTopik.includes('cosinus');
  const isBarisan = lowerTopik.includes('barisan') || lowerTopik.includes('deret') || lowerTopik.includes('aritmetika') || lowerTopik.includes('geometri');
  const isMatriks = lowerTopik.includes('matriks') || lowerTopik.includes('determinan');
  const isStatistika = lowerTopik.includes('statistika') || lowerTopik.includes('peluang') || lowerTopik.includes('rata-rata') || lowerTopik.includes('data');

  let rumusList: RumusAtauPolaItem[] = [];
  let contohKonkret: ContohKonkretRangkuman;

  if (isSPLDV) {
    rumusList = [
      {
        label: 'Bentuk Umum SPLDV',
        isi: 'Persamaan (1): a₁x + b₁y = c₁  dan  Persamaan (2): a₂x + b₂y = c₂ (dengan x, y adalah variabel pangkat satu).',
      },
      {
        label: 'Metode Eliminasi (Menghilangkan 1 Variabel)',
        isi: 'Samakan koefisien salah satu variabel (misal x), lalu jumlahkan atau kurangkan kedua persamaan untuk mendapatkan nilai variabel y.',
      },
      {
        label: 'Metode Substitusi (Mengganti Variabel)',
        isi: 'Masukkan nilai variabel yang sudah ditemukan ke salah satu persamaan awal untuk menghitung nilai variabel pasangannya.',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Cerita SPLDV & Penyelesaian Tuntas',
      teksContoh: `Soal: Di koperasi sekolah, harga 2 buku tulis dan 3 pensil adalah Rp17.000,00. Sedangkan harga 1 buku tulis dan 2 pensil adalah Rp10.000,00. Berapakah total harga yang harus dibayar jika Rina membeli 3 buku tulis dan 2 pensil?\n\nPenyelesaian:\n1) Pemisalan: Misal x = harga 1 buku tulis, dan y = harga 1 pensil.\n2) Model Matematika:\n   2x + 3y = 17.000  ...(Persamaan 1)\n    x + 2y = 10.000  ...(Persamaan 2)\n3) Eliminasi variabel x (kalikan Persamaan 2 dengan 2):\n   2x + 4y = 20.000\n   2x + 3y = 17.000  (-)\n   -----------------\n         y = 3.000 (Harga 1 pensil = Rp3.000)\n4) Substitusi y = 3.000 ke Persamaan 2:\n   x + 2(3.000) = 10.000  →  x = 10.000 - 6.000 = 4.000 (Harga 1 buku = Rp4.000)\n5) Hitung pertanyaan soal (3 buku + 2 pensil):\n   3x + 2y = 3(4.000) + 2(3.000) = 12.000 + 6.000 = Rp18.000,00.`,
      bedahAnalisis: [
        '✅ Pemisalan Jelas: Mengubah kalimat cerita menjadi simbol aljabar x dan y.',
        '✅ Metode Gabungan: Mengeliminasi x terlebih dahulu karena koefisiennya paling mudah disamakan.',
        '✅ Verifikasi Hasil: 2(4.000) + 3(3.000) = 8.000 + 9.000 = 17.000 (Terbukti 100% akurat!).',
      ],
    };
  } else if (isPecahan) {
    rumusList = [
      {
        label: 'Penjumlahan & Pengurangan Pecahan',
        isi: 'Samakan penyebutnya terlebih dahulu dengan KPK: a/b + c/d = (a×d + b×c) / (b×d).',
      },
      {
        label: 'Perkalian & Pembagian Pecahan',
        isi: 'Perkalian: (a/b) × (c/d) = (a×c)/(b×d) | Pembagian (balik pecahan pembagi): (a/b) ÷ (c/d) = (a/b) × (d/c).',
      },
      {
        label: 'Konversi Pecahan ke Persen & Desimal',
        isi: 'Persen artinya per seratus: a/b × 100%. Contoh: 3/4 = 0,75 = 75% | 1/2 = 0,5 = 50% | 1/5 = 0,2 = 20%.',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Cerita Pecahan, Desimal & Persen (Langkah Demi Langkah)',
      teksContoh: `Soal: Ibu membeli 2 1/2 kg tepung terigu. Sebanyak 1,25 kg tepung digunakan untuk membuat kue bolu, kemudian Ibu membeli lagi 3/4 kg tepung di warung. Berapa kg total tepung terigu Ibu sekarang?\n\nPenyelesaian:\n1) Ubah semua bilangan ke bentuk pecahan biasa atau desimal yang seragam:\n   • 2 1/2 kg = 5/2 kg = 2,50 kg\n   • Digunakan = 1,25 kg (dikurangi)\n   • Membeli lagi 3/4 kg = 0,75 kg (ditambah)\n2) Lakukan operasi hitung berurutan:\n   Total Tepung = 2,50 - 1,25 + 0,75\n   Total Tepung = 1,25 + 0,75 = 2,00 kg (atau 2 kg).\n3) Cara Pecahan Biasa (KPK penyebut 2 dan 4 adalah 4):\n   5/2 - 5/4 + 3/4 = 10/4 - 5/4 + 3/4 = 8/4 = 2 kg.`,
      bedahAnalisis: [
        '✅ Penyetaraan Bentuk: Mengubah pecahan campuran (2 1/2), desimal (1,25), dan pecahan biasa (3/4) ke bentuk yang sama memudahkan perhitungan.',
        '✅ Tanda Operasi Tepat: Kata "digunakan" berarti dikurang (-), sedangkan "membeli lagi" berarti ditambah (+).',
      ],
    };
  } else if (isBangunDatar) {
    rumusList = [
      {
        label: 'Persegi & Persegi Panjang',
        isi: 'Persegi: Luas = s × s, Keliling = 4 × s | Persegi Panjang: Luas = p × l, Keliling = 2 × (p + l).',
      },
      {
        label: 'Segitiga & Jajargenjang',
        isi: 'Segitiga: Luas = ½ × alas × tinggi, Keliling = jumlah ketiga sisi | Jajargenjang: Luas = alas × tinggi.',
      },
      {
        label: 'Trapesium & Lingkaran',
        isi: 'Trapesium: Luas = ½ × (jumlah sisi sejajar) × tinggi | Lingkaran: Luas = π × r², Keliling = 2 × π × r.',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Kontekstual Keliling & Luas Bangun Datar',
      teksContoh: `Soal: Pak Ahmad memiliki taman berbentuk persegi panjang dengan ukuran panjang 15 meter dan lebar 8 meter. Di sekeliling tepi taman akan dipasang pagar kawat, dan seluruh permukaan taman akan ditanami rumput dengan biaya Rp20.000,00 per m². Hitunglah panjang pagar kawat dan total biaya rumput!\n\nPenyelesaian:\n1) Diketahui: panjang (p) = 15 m, lebar (l) = 8 m.\n2) Panjang pagar kawat = Keliling Persegi Panjang:\n   K = 2 × (p + l) = 2 × (15 + 8) = 2 × 23 = 46 meter.\n3) Luas taman yang ditanami rumput:\n   L = p × l = 15 m × 8 m = 120 m².\n4) Total biaya rumput:\n   Biaya = 120 m² × Rp20.000,00 = Rp2.400.000,00.`,
      bedahAnalisis: [
        '✅ Membedakan Keliling vs Luas: "Di sekeliling tepi" menggunakan rumus Keliling (m), sedangkan "seluruh permukaan" menggunakan rumus Luas (m²).',
        '✅ Satuan Tepat: Panjang pagar dalam meter (m) dan luas area dalam meter persegi (m²).',
      ],
    };
  } else if (isPythagoras) {
    rumusList = [
      {
        label: 'Rumus Teorema Pythagoras (Segitiga Siku-Siku)',
        isi: 'c² = a² + b²  →  c = √(a² + b²), di mana c adalah sisi miring (hipotenusa) di depan sudut siku-siku 90°.',
      },
      {
        label: 'Mencari Sisi Tegak atau Alas',
        isi: 'a = √(c² - b²)  dan  b = √(c² - a²).',
      },
      {
        label: 'Hafalan Tripel Pythagoras Populer',
        isi: '(3, 4, 5) dan kelipatannya (6, 8, 10), (9, 12, 15) | (5, 12, 13) | (8, 15, 17) | (7, 24, 25).',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Cerita Teorema Pythagoras & Penyelesaian',
      teksContoh: `Soal: Sebuah tangga yang panjangnya 10 meter disandarkan pada tembok vertikal. Jarak ujung bawah tangga ke pangkal tembok di tanah adalah 6 meter. Berapakah tinggi tembok yang dicapai oleh ujung atas tangga tersebut?\n\nPenyelesaian:\n1) Identifikasi sisi segitiga siku-siku:\n   • Panjang tangga = sisi miring (c) = 10 m\n   • Jarak kaki tangga ke tembok = alas (a) = 6 m\n   • Tinggi tembok = sisi tegak (b) = ?\n2) Gunakan rumus Pythagoras:\n   b² = c² - a²\n   b² = 10² - 6² = 100 - 36 = 64\n   b  = √64 = 8 meter.\nJadi, tinggi tembok yang dicapai ujung atas tangga adalah 8 meter (Tripel Pythagoras 6 - 8 - 10).`,
      bedahAnalisis: [
        '✅ Visualisasi Segitiga Siku-Siku: Tangga selalu menjadi sisi miring (hipotenusa), sedangkan tembok dan lantai membentuk sudut siku-siku 90°.',
        '✅ Cek Cepat dengan Tripel Pythagoras: Pasangan (6, 8, 10) adalah kelipatan 2 dari tripel dasar (3, 4, 5).',
      ],
    };
  } else if (isTrigonometri) {
    rumusList = [
      {
        label: 'Perbandingan Trigonometri Segitiga Siku-Siku',
        isi: 'sin α = Depan / Miring (DeMi) | cos α = Samping / Miring (SaMi) | tan α = Depan / Samping (DeSa).',
      },
      {
        label: 'Nilai Sudut Istimewa (0°, 30°, 45°, 60°, 90°)',
        isi: 'sin 30° = ½, cos 30° = ½√3, tan 30° = ⅓√3 | sin 45° = ½√2, tan 45° = 1 | sin 60° = ½√3, cos 60° = ½, tan 60° = √3.',
      },
      {
        label: 'Identitas Dasar & Aturan Segitiga',
        isi: 'sin²α + cos²α = 1 | Aturan Sinus: a/sin A = b/sin B = c/sin C.',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Klinometer / Sudut Elevasi Trigonometri',
      teksContoh: `Soal: Seorang siswa berdiri sejauh 20√3 meter dari kaki sebuah menara. Ia mengamati puncak menara dengan sudut elevasi 30°. Jika tinggi mata siswa dari permukaan tanah adalah 1,5 meter, berapakah tinggi total menara tersebut?\n\nPenyelesaian:\n1) Diketahui: Jarak samping (Sa) = 20√3 m, sudut elevasi α = 30°, tinggi pengamat (h₀) = 1,5 m.\n2) Cari tinggi menara di atas garis mata (sisi Depan / De) menggunakan rumus tan (DeSa):\n   tan 30° = Depan / Samping\n   ⅓√3 = De / (20√3)\n   De = 20√3 × ⅓√3 = 20 × (3/3) = 20 meter.\n3) Tinggi total menara dari tanah:\n   T = De + h₀ = 20 m + 1,5 m = 21,5 meter.`,
      bedahAnalisis: [
        '✅ Pemilihan Rasio Tepat: Karena diketahui sisi Samping dan ditanyakan sisi Depan, maka digunakan perbandingan Tangen (tan = De/Sa).',
        '✅ Ketelitian Kontekstual: Menambahkan tinggi mata pengamat (1,5 m) pada hasil akhir.',
      ],
    };
  } else if (isBarisan) {
    rumusList = [
      {
        label: 'Barisan & Deret Aritmetika (Selisih/Beda Tetap = b)',
        isi: 'Suku ke-n: Uₙ = a + (n - 1)b  |  Jumlah n suku pertama: Sₙ = (n/2) × (2a + (n - 1)b) = (n/2) × (a + Uₙ).',
      },
      {
        label: 'Barisan & Deret Geometri (Rasio Perkalian Tetap = r)',
        isi: 'Suku ke-n: Uₙ = a × rⁿ⁻¹  |  Jumlah n suku: Sₙ = a(rⁿ - 1)/(r - 1) untuk r > 1.',
      },
      {
        label: 'Deret Geometri Tak Hingga (Konvergen |r| < 1)',
        isi: 'S∞ = a / (1 - r)  (Ingat jembatan keledai: "AIR" → a dibagi 1 - r).',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Kontekstual Barisan & Deret Aritmetika',
      teksContoh: `Soal: Sebuah gedung pertunjukan menyusun kursi penonton sebanyak 10 baris. Baris paling depan (baris ke-1) terdiri dari 20 kursi, baris ke-2 terdiri dari 24 kursi, baris ke-3 terdiri dari 28 kursi, dan seterusnya selalu bertambah tetap. Berapakah banyaknya kursi pada baris ke-10 dan total seluruh kursi di gedung tersebut?\n\nPenyelesaian:\n1) Identifikasi parameter Barisan Aritmetika:\n   • Suku pertama (a) = 20 kursi\n   • Beda penambahan tiap baris (b) = 24 - 20 = 4 kursi\n   • Banyaknya baris (n) = 10\n2) Banyak kursi pada baris ke-10 (U₁₀):\n   U₁₀ = a + (10 - 1)b = 20 + 9(4) = 20 + 36 = 56 kursi.\n3) Kapasitas total seluruh kursi di gedung (S₁₀):\n   S₁₀ = (10/2) × (a + U₁₀) = 5 × (20 + 56) = 5 × 76 = 380 kursi.`,
      bedahAnalisis: [
        '✅ Membedakan Uₙ vs Sₙ: Banyak kursi pada baris tertentu menggunakan rumus suku ke-n (U₁₀), sedangkan kapasitas total seluruh baris menggunakan rumus deret (S₁₀).',
      ],
    };
  } else if (isMatriks) {
    rumusList = [
      {
        label: 'Penjumlahan, Pengurangan & Perkalian Matriks',
        isi: 'Elemen seletak dijumlahkan/dikurangkan: (A ± B)ᵢⱼ = aᵢⱼ ± bᵢⱼ | Perkalian matriks: Baris matriks pertama × Kolom matriks kedua.',
      },
      {
        label: 'Determinan Matriks Ordo 2×2',
        isi: 'Jika A = [a  b ; c  d], maka det(A) = |A| = (a × d) - (b × c). Matriks disebut singular jika det(A) = 0.',
      },
      {
        label: 'Invers Matriks Ordo 2×2',
        isi: 'A⁻¹ = (1 / (ad - bc)) × [d  -b ; -c  a] (Tukar posisi a dan d, lalu kalikan b dan c dengan negatif).',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Determinan & Persamaan Matriks Ordo 2×2',
      teksContoh: `Soal: Diketahui matriks A = [4  2 ; 5  3] dan matriks B = [1  -1 ; 0  2]. Tentukan matriks C = 2A - B serta nilai determinan dari matriks A!\n\nPenyelesaian:\n1) Hitung perkalian skalar 2A:\n   2A = 2 × [4  2 ; 5  3] = [8  4 ; 10  6]\n2) Kurangkan elemen seletak untuk matriks C = 2A - B:\n   C = [8-1   4-(-1) ; 10-0   6-2] = [7  5 ; 10  4]\n3) Hitung Determinan matriks A = [4  2 ; 5  3]:\n   det(A) = (a × d) - (b × c) = (4 × 3) - (2 × 5) = 12 - 10 = 2.`,
      bedahAnalisis: [
        '✅ Ketelitian Tanda Negatif: Pada elemen baris 1 kolom 2: 4 - (-1) berubah menjadi 4 + 1 = 5.',
        '✅ Rumus Determinan: Perkalian diagonal utama (4×3) dikurangi diagonal sekunder (2×5).',
      ],
    };
  } else if (isStatistika) {
    rumusList = [
      {
        label: 'Ukuran Pemusatan Data (Mean, Median, Modus)',
        isi: 'Mean (Rata-rata): x̄ = (Jumlah seluruh nilai data) / (Banyaknya data n) | Median: Nilai tengah setelah data diurutkan | Modus: Nilai yang paling sering muncul.',
      },
      {
        label: 'Ukuran Penyebaran Data (Jangkauan & Kuartil)',
        isi: 'Jangkauan (Range) = Nilai Maksimum - Nilai Minimum | Jangkauan Interkuartil (Hamparan) H = Q₃ - Q₁.',
      },
      {
        label: 'Rumus Peluang Kejadian (P(A))',
        isi: 'P(A) = n(A) / n(S), dengan Frekuensi Harapan Fₕ = P(A) × N (banyak percobaan).',
      },
    ];
    contohKonkret = {
      judulContoh: 'Contoh Soal Rata-Rata Gabungan & Peluang Kontekstual',
      teksContoh: `Soal: Rata-rata nilai ulangan Matematika dari 4 orang siswa adalah 78. Jika nilai seorang siswa baru bernama Andi digabungkan, rata-rata nilai kelima siswa tersebut meningkat menjadi 80. Berapakah nilai ulangan Andi?\n\nPenyelesaian:\n1) Hitung jumlah nilai awal 4 siswa:\n   Jumlah₄ = 4 × 78 = 312\n2) Hitung jumlah nilai setelah Andi bergabung (5 siswa dengan rata-rata 80):\n   Jumlah₅ = 5 × 80 = 400\n3) Nilai ulangan Andi adalah selisih kedua jumlah tersebut:\n   Nilai Andi = Jumlah₅ - Jumlah₄ = 400 - 312 = 88.`,
      bedahAnalisis: [
        '✅ Konsep Jumlah Data: Mengalikan rata-rata dengan banyaknya siswa (Σx = n × x̄) adalah cara tercepat menyelesaikan soal rata-rata gabungan.',
      ],
    };
  } else {
    rumusList = [
      {
        label: `Prinsip Pemodelan Matematika (${rawTopik})`,
        isi: 'Identifikasi besaran yang diketahui (variabel/konstanta) → Susun persamaan/rumus hubungan → Substitusikan angka dan hitung hasilnya.',
      },
      {
        label: 'Sifat Operasi Aljabar & Bilangan',
        isi: 'Distributif: a(b + c) = ab + ac | Urutan Operasi (KABATAKU): Kerjakan dalam kurung terlebih dahulu, lalu pangkat, kali/bagi, terakhir tambah/kurang.',
      },
    ];
    contohKonkret = {
      judulContoh: `Contoh Soal Kontekstual Terhitung: ${rawTopik}`,
      teksContoh: `Soal: Sebuah koperasi pelajar memproduksi paket alat tulis dengan biaya tetap persiapan Rp150.000,00 dan biaya bahan Rp15.000,00 per paket. Jika setiap paket dijual seharga Rp25.000,00, berapa minimal paket yang harus terjual agar koperasi mencapai titik impas (tidak rugi) dan berapa keuntungan jika terjual 30 paket?\n\nPenyelesaian:\n1) Misalkan banyaknya paket = x.\n   • Fungsi Biaya Total: B(x) = 15.000x + 150.000\n   • Fungsi Pendapatan: P(x) = 25.000x\n2) Titik Impas terjadi saat Pendapatan = Biaya Total:\n   25.000x = 15.000x + 150.000\n   10.000x = 150.000  →  x = 15 paket.\n3) Keuntungan saat terjual 30 paket:\n   Untung = P(30) - B(30) = 25.000(30) - (15.000(30) + 150.000)\n   Untung = 750.000 - 600.000 = Rp150.000,00.`,
      bedahAnalisis: [
        '✅ Pemodelan Linier Nyata: Memisahkan komponen variabel (per unit) dan konstanta tetap.',
        '✅ Perhitungan Tuntas: Setiap langkah diturunkan secara sistematis hingga memperoleh angka akhir.',
      ],
    };
  }

  return {
    id,
    createdAt,
    judul: `📐 Rangkuman Pintar Matematika: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: rawTopik,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat: `Kuasai konsep dasar, rumus inti, dan langkah sistematis penyelesaian soal kontekstual pada materi "${rawTopik}" tanpa sekadar menghafal!`,
    petaKonsep: [
      '1. Konsep Dasar & Definisi Variabel',
      '2. Rumus Inti & Sifat Operasi',
      '3. Langkah Pemodelan Soal Cerita',
      '4. Bedah Contoh Soal & Evaluasi Hasil',
    ],
    rumusAtauPola: rumusList,
    poinUtama: [
      {
        judul: `1. Konsep Dasar & Pemodelan Matematika (${rawTopik})`,
        penjelasan: `Langkah terpenting dalam menyelesaikan soal Matematika pada materi ${rawTopik} adalah menerjemahkan informasi soal cerita atau gambar ke dalam model simbol matematika yang tepat.`,
        analogi:
          'Memodelkan soal cerita ke rumus matematika itu seperti menerjemahkan kalimat panjang menjadi kode rahasia yang ringkas dan mudah dihitung!',
        poinKunci: [
          'Tuliskan dengan rapi semua besaran yang "Diketahui" beserta satuannya (cm, m, kg, rupiah, atau derajat).',
          'Pastikan seluruh satuan sudah setara sebelum dimasukkan ke dalam rumus.',
          'Tentukan dengan tepat apa yang "Ditanyakan" pada kalimat akhir soal.',
        ],
      },
      {
        judul: '2. Strategi Perhitungan Sistematis & Sifat Operasi',
        penjelasan:
          'Setelah model matematika terbentuk, pilih metode penyelesaian yang paling efisien agar terhindar dari kesalahan hitung angka besar.',
        poinKunci: [
          'Sederhanakan pecahan atau bagi kedua ruas persamaan dengan faktor persekutuan sebelum mengalikan angka besar.',
          'Perhatikan perubahan tanda positif (+) dan negatif (-) saat memindahkan suku melewati tanda sama dengan (=).',
        ],
      },
      {
        judul: '3. Verifikasi & Penafsiran Jawaban Kontekstual',
        penjelasan:
          'Dalam soal AKM Numerasi dan Kurikulum Merdeka, hasil perhitungan angka wajib dikembalikan ke konteks pertanyaan awal untuk memastikan kelogisannya.',
        poinKunci: [
          'Substitusikan kembali hasil yang diperoleh ke persamaan awal untuk mengecek kebenarannya.',
          'Periksa apakah soal menanyakan nilai variabel awal atau kombinasi baru (misal: uang kembalian, selisih, atau total biaya).',
        ],
      },
    ],
    contohKonkret,
    tipsUjian: [
      '🎯 Hati-hati tanda minus (-)! Saat mengurangkan bentuk aljabar dalam kurung, kalikan tanda minus ke semua suku di dalam kurung.',
      '🎯 Jangan berhenti di nilai x atau y saja—baca ulang kalimat pertanyaan terakhir apakah yang diminta adalah selisih, jumlah total, atau kembalian!',
    ],
    faktaMenarik: [
      `Tahukah Kamu? Konsep matematika pada materi ${rawTopik} digunakan setiap hari oleh insinyur, arsitek, dan analis data untuk mengoptimalkan biaya serta merancang bangunan yang presisi!`,
    ],
    glosarium: [
      { istilah: 'Variabel (Peubah)', makna: 'Lambang huruf (seperti x, y, n) yang mewakili nilai bilangan yang belum diketahui.' },
      { istilah: 'Koefisien', makna: 'Bilangan yang berada tepat di depan variabel (misal angka 3 pada 3x).' },
      { istilah: 'Konstanta', makna: 'Suku bilangan tetap yang tidak memuat variabel.' },
    ],
    kuisKilat: [
      {
        nomor: 1,
        pertanyaan: 'Mengapa kita harus menyamakan satuan sebelum memasukkan angka ke dalam rumus matematika?',
        jawaban: 'Karena operasi perhitungan hanya valid jika seluruh besaran berada dalam satuan yang setara (misal sama-sama meter atau sama-sama cm).',
      },
      {
        nomor: 2,
        pertanyaan: 'Bagaimana cara paling cepat memeriksa apakah hasil hitungan persamaan kita sudah benar?',
        jawaban: 'Dengan mensubstitusikan (memasukkan) kembali nilai jawaban ke persamaan di soal dan mengecek apakah ruas kiri sama dengan ruas kanan.',
      },
    ],
    pesanInspirasi:
      'Matematika bukan tentang menghafal rumus, melainkan seni melatih logika berpikir yang runtut dan pantang menyerah! 📐✨',
  };
}
