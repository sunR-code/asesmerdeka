import type { RangkumanRequest, RangkumanDokumen } from '../../types/summary';
import { getJenjangLabel } from './helpers';

// ============================================================================
// 3. ENGINE KHUSUS BAHASA INDONESIA
// ============================================================================
export function buildIndonesianTopicRangkuman(
  req: RangkumanRequest,
  rawTopik: string,
  lowerTopik: string,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const jenjangLabel = getJenjangLabel(req);
  const isLHO = lowerTopik.includes('observasi') || lowerTopik.includes('lho');
  const isProsedur = lowerTopik.includes('prosedur');
  const isIdePokok = lowerTopik.includes('ide pokok') || lowerTopik.includes('gagasan');

  return {
    id,
    createdAt,
    judul: `🇮🇩 Rangkuman Bahasa Indonesia: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: rawTopik,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat: `Panduan lengkap memahami tujuan komunikasi, struktur teks, kaidah kebahasaan EYD V, dan contoh analisis teks pada materi "${rawTopik}".`,
    petaKonsep: [
      '1. Pengertian & Tujuan Komunikatif',
      '2. Struktur Teks Baku',
      '3. Kaidah Kebahasaan & EYD V',
      '4. Contoh Teks Model & Bedah Analisis',
    ],
    rumusAtauPola: [
      {
        label: 'Struktur Utama Teks',
        isi: isLHO
          ? '1) Pernyataan Umum / Klasifikasi → 2) Deskripsi Bagian (rincian ilmiah) → 3) Deskripsi Manfaat / Simpulan.'
          : isProsedur
          ? '1) Tujuan → 2) Alat dan Bahan → 3) Langkah-Langkah Kronologis → 4) Penutup/Penegasan Ulang.'
          : isIdePokok
          ? 'Paragraf Deduktif (Kalimat utama di awal paragraf) | Paragraf Induktif (Kalimat utama di akhir paragraf, ditandai kata "Jadi, Oleh karena itu").'
          : '1) Pembuka / Pengenalan Isu → 2) Rangkaian Isi / Argumen / Peristiwa → 3) Penutup / Simpulan.',
      },
      {
        label: 'Kaidah Kebahasaan Inti (EYD Edisi V)',
        isi: 'Penggunaan kata baku sesuai KBBI (aktivitas, praktik, analisis), kalimat efektif (minimal Subjek + Predikat), serta konjungsi yang padu.',
      },
    ],
    poinUtama: [
      {
        judul: `1. Hakikat & Tujuan Komunikatif (${rawTopik})`,
        penjelasan: `Materi ${rawTopik} melatih keterampilan literasi membaca dan menulis agar peserta didik mampu menangkap gagasan pokok secara kritis serta menyampaikan informasi secara runtut.`,
        analogi:
          'Struktur teks itu seperti fondasi, tiang, dan atap rumah—jika urutannya tepat, pesan yang disampaikan menjadi kokoh dan mudah dipahami pembaca.',
        poinKunci: [
          'Membedakan kalimat fakta (data terukur yang dapat diverifikasi) dan kalimat opini (pendapat/penilaian subjektif).',
          'Menemukan gagasan utama (ide pokok) pada setiap paragraf melalui kalimat utama.',
        ],
      },
      {
        judul: '2. Analisis Struktur Teks Secara Sistematis',
        penjelasan:
          'Setiap bagian paragraf dalam teks Bahasa Indonesia memiliki fungsi spesifik yang saling mendukung dari awal hingga akhir (koheren).',
        poinKunci: [
          'Bagian Awal: Memperkenalkan objek, definisi umum, atau latar belakang topik yang dibahas.',
          'Bagian Inti: Menguraikan rincian bagian, bukti pendukung, atau tahapan peristiwa secara terperinci.',
          'Bagian Penutup: Merangkum intisari pembahasan, manfaat, atau pesan simpulan.',
        ],
      },
      {
        judul: '3. Kaidah Kebahasaan & Ketepatan Ejaan (EYD V)',
        penjelasan:
          'Teks yang baik wajib mematuhi kaidah ejaan Bahasa Indonesia yang disempurnakan (EYD Edisi V) dan pemilihan kosakata baku.',
        poinKunci: [
          'Kata depan "di", "ke", "dari" ditulis TERPISAH jika menunjukkan tempat (misal: di sekolah, ke perpustakaan), dan ditulis SERANGKAI jika merupakan imbuhan pasif (misal: ditulis, dibaca).',
          'Gunakan kosakata baku KBBI: "aktivitas" (bukan aktifitas), "praktik" (bukan praktek), "apotek" (bukan apotik), "risiko" (bukan resiko).',
        ],
      },
    ],
    contohKonkret: {
      judulContoh: `Contoh Kutipan Teks "${rawTopik}" & Bedah Analisis`,
      teksContoh: `[Paragraf 1 — Bagian Pembuka / Pernyataan Umum]\nHutan mangrove atau hutan bakau merupakan ekosistem pesisir tropis yang tumbuh di kawasan pasang surut air laut. Tanaman mangrove memiliki ciri khas berupa akar tunjang yang rapat dan kokoh untuk menahan gempuran ombak.\n\n[Paragraf 2 — Bagian Rincian / Deskripsi Manfaat]\nKeberadaan hutan mangrove memberikan manfaat ekologis dan ekonomis yang sangat besar bagi masyarakat pesisir. Selain mencegah abrasi pantai dan menyerap emisi karbon hingga lima kali lebih banyak dibanding hutan daratan, perairan di sela-sela akar bakau juga menjadi tempat berkembang biak berbagai jenis ikan, udang, dan kepiting.`,
      bedahAnalisis: [
        '✅ Ide Pokok Paragraf 1: Pengertian dan ciri khas ekosistem hutan mangrove di kawasan pesisir (Paragraf Deduktif).',
        '✅ Ide Pokok Paragraf 2: Manfaat ekologis dan ekonomis hutan mangrove bagi lingkungan dan masyarakat.',
        '✅ Kaidah Bahasa: Menggunakan kalimat definisi ("merupakan"), konjungsi penambahan ("selain"), dan ejaan kata baku yang tepat.',
      ],
    },
    tipsUjian: [
      '🎯 Cara Cepat Cari Ide Pokok (3 Detik): Baca kalimat pertama dan kalimat terakhir paragraf! Jika kalimat terakhir diawali kata "Jadi / Oleh karena itu / Dengan demikian", ide pokoknya ada di akhir (Induktif). Jika tidak, ide pokoknya ada di kalimat pertama (Deduktif)!',
      '🎯 Bedakan Fakta vs Opini: Kalimat yang memuat angka pasti, tanggal, atau lokasi nyata adalah FAKTA. Kalimat yang memuat kata sifat subjektif (sangat indah, paling lezat, sebaiknya, mungkin) adalah OPINI.',
    ],
    faktaMenarik: [
      'Tahukah Kamu? Bahasa Indonesia telah ditetapkan sebagai salah satu bahasa resmi Sidang Umum UNESCO sejak November 2023 dan dipelajari di lebih dari 50 negara di dunia!',
    ],
    glosarium: [
      { istilah: 'Gagasan Pokok (Ide Pokok)', makna: 'Inti pembahasan utama yang menjiwai seluruh isi sebuah paragraf.' },
      { istilah: 'Koherensi', makna: 'Kepaduan hubungan makna antar-kalimat sehingga paragraf mengalir logis.' },
      { istilah: 'Kata Baku', makna: 'Kata yang cara penulisan dan pengucapannya sesuai standar Kamus Besar Bahasa Indonesia (KBBI).' },
    ],
    kuisKilat: [
      {
        nomor: 1,
        pertanyaan: 'Bagaimana cara membedakan penulisan "di" yang dipisah dan "di" yang digabung?',
        jawaban: '"di" dipisah jika menunjukkan nama tempat/lokasi (di kelas, di rumah), dan digabung jika merupakan imbuhan kata kerja pasif (dibuat, dipelajari).',
      },
      {
        nomor: 2,
        pertanyaan: 'Manakah bentuk kata baku yang benar: (praktek / praktik) dan (aktifitas / aktivitas)?',
        jawaban: 'Bentuk baku sesuai KBBI adalah "praktik" dan "aktivitas".',
      },
    ],
    pesanInspirasi:
      'Kemampuan berbahasa yang jernih dan santun adalah cerminan pikiran yang cerdas. Bangga berbahasa Indonesia! 🇮🇩✨',
  };
}
