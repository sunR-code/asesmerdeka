import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import type { LKPDPresetType } from '../types/perangkatAjar';
import {
  resolveSubjectFamily,
  resolveJenjangPedagogicalProfile,
  cleanTopicHeading,
  adaptPresetExtras,
} from './lkpdSubjectBlueprints';
import type { CuratedLKPDContent } from './lkpdSubjectBlueprints';

export function buildExtendedSubjectFixture(
  tp: CustomTPItem,
  profile: SchoolProfile,
  preset: LKPDPresetType,
  _konteks?: string
): CuratedLKPDContent | null {
  const family = resolveSubjectFamily(profile.mataPelajaranUtama);
  const grade = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);
  const lowerMapel = profile.mataPelajaranUtama.toLowerCase();
  const lowerTopic = tp.materiPokok.toLowerCase();

  // =========================================================================
  // 1. BAHASA INDONESIA, BAHASA INGGRIS, BAHASA ARAB
  // =========================================================================
  if (family === 'bahasa') {
    if (lowerMapel.includes('arab')) {
      const stimulusText =
        'Bacalah daftar kosakata peralatan belajar di meja sekolah berikut beserta tanda jenis katanya: (1) قَلَمٌ (qalamun = pulpen), (2) مِسْطَرَةٌ (mistharatun = penggaris, berakhiran ta’ marbuthah ة), (3) كِتَابٌ (kitaabun = buku), (4) حَقِيبَةٌ (haqiibatun = tas sekolah, berakhiran ة). Gunakan kata tunjuk هَذَا (ini, untuk kata benda mudzakkar tanpa ة) atau هَذِهِ (ini, untuk muannats berakhiran ة) sesuai kaidah bahasa Arab dasar!';
      return {
        isCuratedFixture: true,
        subJudulTopik: cleanTopicHeading(tp.materiPokok),
        pendekatanKegiatan: 'Identifikasi Mufradat Berharakat & Penyusunan Kalimat Arab',
        modeKerja: 'Berpasangan',
        alokasiWaktu: '2 x 35 Menit',
        targetBelajarSiswa: [
          'Membedakan kata benda mudzakkar dan muannats dari akhiran huruf ta’ marbuthah (ة).',
          'Memasangkan kata tunjuk هَذَا dan هَذِهِ serta menyusun kalimat tanya jawab sederhana.',
        ],
        prasyaratMateri: ['Mengenal huruf hijaiyah sambung dan harakat tanwin'],
        petunjukPengerjaan: [
          'Periksa huruf terakhir setiap mufradat sebelum menentukan هَذَا atau هَذِهِ.',
          'Tuliskan kata Arab lengkap dengan harakat agar pelafalannya tepat.',
        ],
        stimulusKasus: {
          judul: 'Daftar Benda Kelas Berharakat (Al-Adawatul Madrasiyyah)',
          teks: stimulusText,
          pertanyaanAwal: 'Huruf akhiran apa yang membedakan kelompok kata benda هَذَا dari هَذِهِ?',
        },
        stimulusData: {
          jenisData: 'tabel',
          tabelData: {
            kolom: ['No', 'Mufradat Arab', 'Arti', 'Akhiran Ta’ Marbuthah (ة)?'],
            baris: [
              ['1', 'قَلَمٌ', 'Pulpen', 'Tidak ada (Mudzakkar)'],
              ['2', 'مِسْطَرَةٌ', 'Penggaris', 'Ada ـة (Muannats)'],
              ['3', 'كِتَابٌ', 'Buku', 'Tidak ada (Mudzakkar)'],
              ['4', 'حَقِيبَةٌ', 'Tas sekolah', 'Ada ـة (Muannats)'],
            ],
          },
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: 'Kelompokkan mufradat ke mudzakkar atau muannats',
            instruksi: 'Amati akhiran tiap kosakata di tabel lalu tandai pasangan هَذَا atau هَذِهِ.',
            ruangJawabanJenis: 'tabel',
          },
          {
            langkahKe: 2,
            judulLangkah: 'Lengkapi dialog tanya jawab pendek',
            instruksi: 'Susun kalimat tanya "مَا هَذَا؟" atau "مَا هَذِهِ؟" beserta jawabannya untuk 2 benda.',
            ruangJawabanJenis: 'uraian_singkat',
          },
        ],
        pemeriksaanHasil: [
          'Pastikan seluruh kata berakhiran ة memakai هَذِهِ, sedangkan kata tanpa tanda muannats memakai هَذَا.',
        ],
        pertanyaanAnalisis: [
          {
            id: 'q-arab-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Mengklasifikasikan kosakata berdasar ciri visual akhiran ta’ marbuthah (ة) dari stimulus.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Tuliskan dua kalimat lengkap "Ini buku" dan "Ini penggaris" memakai kata tunjuk yang tepat!',
            panduanJawabanSingkat: 'Ini buku = هَذَا كِتَابٌ ; Ini penggaris = هَذِهِ مِسْطَرَةٌ.',
          },
          {
            id: 'q-arab-2',
            nomor: 2,
            tingkatKognitif: 'Menengah',
            alasanTingkatKognitif: 'Menganalisis kesalahan pemasangan isim isyarah dan membenarkannya beserta kaidah alasannya.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Seorang siswa menulis "هَذَا حَقِيبَةٌ". Periksa apakah kalimat itu tepat, dan jelaskan alasan perbaikanmu!',
            panduanJawabanSingkat: 'Tidak tepat; حَقِيبَةٌ berakhiran ta’ marbuthah (muannats), seharusnya memakai هَذِهِ حَقِيبَةٌ.',
          },
        ],
        dukunganTambahan: 'Lihat akhiran kata: ada huruf (ة / ـة) gunakan هَذِهِ; tidak ada akhiran tersebut gunakan هَذَا.',
        pengayaan: {
          instruksi: 'Pengayaan lisan/tulis:',
          tugas: ['Tambahkan kata ganti kepemilikan "ku" (-ِي): قَلَمِيْ (pulpenku) dan حَقِيبَتِيْ (tasku) dalam satu kalimat perkenalan.'],
        },
        kesimpulanRefleksi: [
          'Kata tunjuk هَذَا digunakan untuk ...... sedangkan هَذِهِ untuk ......',
          'Kosakata atau aturan mana yang masih membingungkan: membedakan akhiran ة, menulis sambung, atau melafalkannya?',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: 'هَذَا كِتَابٌ dan هَذِهِ مِسْطَرَةٌ.', langkahPenyelesaian: ['كِتَابٌ tanpa ة -> هَذَا; مِسْطَرَةٌ dengan ة -> هَذِهِ.'] },
            { nomor: 2, jawabanInti: 'Keliru; seharusnya هَذِهِ حَقِيبَةٌ karena muannats bertanda ة.', langkahPenyelesaian: ['Tunjukkan akhiran ة pada حَقِيبَةٌ.'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: 'Mengira arti benda mati tidak punya jenis mudzakkar/muannats sehingga menyamakan semuanya dengan هَذَا.',
              caraMenangani: 'Tekankan bahwa penggolongan mudzakkar/muannats gramatikal berlaku pada semua kata benda, bukan hanya makhluk hidup.',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Klasifikasi mudzakkar/muannats', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Koreksi kaidah isim isyarah', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Ketepatan penggunaan هَذَا / هَذِهِ',
              perluBimbingan: 'Masih menyamakan seluruh kosakata benda memakai هَذَا.',
              berkembang: 'Benar pada soal tulis langsung, namun belum mampu menjelaskan alasan koreksi.',
              cakap: 'Tepat menulis هَذَا كِتَابٌ dan هَذِهِ مِسْطَرَةٌ serta memperbaiki هَذِهِ حَقِيبَةٌ.',
              mahir: 'Seluruh mufradat tepat berharakat disertai contoh dialog tanya jawab yang benar.',
            },
          ],
        },
      };
    }

    if (lowerMapel.includes('inggris')) {
      const isSD = grade.gradeBand === 'sd_awal' || grade.gradeBand === 'sd_atas';
      const stimulusText = isSD
        ? 'Read the school canteen price list and dialogue:\n[Menu: Fried Rice Rp10.000 | Chicken Noodle Rp8.000 | Mineral Water Rp3.000 | Orange Juice Rp5.000]\nDina: "Good morning, Ibu. Can I have one Chicken Noodle and one Orange Juice, please?"\nSeller: "Sure, Dina. Anything else?"\nDina: "No, thank you. How much is the total?"\nSeller: "Eight thousand plus five thousand is thirteen thousand rupiahs."'
        : 'Read the Descriptive Text below:\n"Taman Sari Water Castle is a historic royal garden located in Yogyakarta, about 2 kilometers south of the Sultan Palace. Built in the mid-18th century, the complex consists of bathing pools, arched stone gates, and quiet underground passages. High whitewashed walls surround clear turquoise pools where visitors can observe classical Javanese architecture blended with European arch details."';
      return {
        isCuratedFixture: true,
        subJudulTopik: cleanTopicHeading(tp.materiPokok),
        pendekatanKegiatan: isSD
          ? 'Reading Dialogue & Polite Transaction Practice'
          : 'Text Structure, Language Features & Guided Writing',
        modeKerja: 'Berpasangan',
        alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
        targetBelajarSiswa: isSD
          ? [
              'Identify food items, prices, and polite expressions ("Can I have...?", "Thank you") from the dialogue.',
              'Write a short polite ordering dialogue with accurate total price.',
            ]
          : [
              'Identify Identification and Description paragraphs and sensory adjectives directly from the text.',
              'Analyze Simple Present Tense verbs and compose 2 descriptive sentences about a local school landmark.',
            ],
        prasyaratMateri: isSD ? ['Numbers 1–20 and basic food words'] : ['Basic Simple Present Tense (is/are/verb-s)'],
        petunjukPengerjaan: [
          'Read the text excerpt carefully; base every answer on facts found in the text.',
          'Check subject-verb agreement and spelling before submitting.',
        ],
        stimulusKasus: {
          judul: isSD ? 'Dialogue at the School Canteen' : 'Descriptive Text: Taman Sari Water Castle',
          teks: stimulusText,
          pertanyaanAwal: isSD
            ? 'Which polite phrases does Dina use when ordering food?'
            : 'Which sentence introduces what and where the place is (Identification)?',
        },
        stimulusData: {
          jenisData: 'kutipan_teks',
          poinKunci: isSD
            ? ['Fried Rice Rp10.000 | Chicken Noodle Rp8.000', 'Orange Juice Rp5.000 | Mineral Water Rp3.000']
            : ['Location: Yogyakarta (~2 km south of Sultan Palace)', 'Tense used: Simple Present (is, consists, surround)'],
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: isSD ? 'Find menu items and polite expressions in the dialogue' : 'Locate Identification vs Description in the text',
            instruksi: isSD
              ? 'Underline what Dina orders and copy two polite expressions from the dialogue.'
              : 'Identify the opening Identification sentence and list 3 descriptive facts from sentences 2–3.',
            ruangJawabanJenis: 'uraian_singkat',
          },
          {
            langkahKe: 2,
            judulLangkah: isSD ? 'Write your own 2-line order dialogue' : 'Write 3 descriptive sentences about your school library or yard',
            instruksi: isSD
              ? 'Use "Can I have...?" to order 1 Fried Rice and 1 Mineral Water, then write the correct total price.'
              : 'Use at least two sensory adjectives and accurate Simple Present verbs (is/has/contains).',
            ruangJawabanJenis: 'uraian_panjang',
          },
        ],
        pemeriksaanHasil: [
          isSD
            ? 'Check total calculation: Rp10.000 + Rp3.000 = Rp13.000.'
            : 'Verify all verbs describe current permanent features in Simple Present Tense, not Past Tense (except passive historical facts like "was built / Built").',
        ],
        pertanyaanAnalisis: [
          {
            id: 'q-en-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Extracting explicit facts and vocabulary directly from the provided reading text.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: isSD
              ? 'How much does Dina pay for one Chicken Noodle and one Orange Juice?'
              : 'Where is Taman Sari located according to the text, and mention two physical features described there!',
            panduanJawabanSingkat: isSD
              ? 'Rp13.000 (Rp8.000 + Rp5.000).'
              : 'Located in Yogyakarta (~2 km south of the Sultan Palace); features bathing pools, arched stone gates, whitewashed walls, or underground passages.',
          },
          {
            id: 'q-en-2',
            nomor: 2,
            tingkatKognitif: 'Menengah',
            alasanTingkatKognitif: 'Applying grammar/functional language rules (singular/plural verb agreement) on an erroneous sample sentence.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: isSD
              ? 'Change Dina’s order into: "Can I have one Fried Rice and one Mineral Water, please?" What total must the seller say?'
              : 'Find and correct the grammatical mistake in this sentence about the text: "The whitewashed walls surrounds the clear bathing pool."',
            panduanJawabanSingkat: isSD
              ? 'Total = Rp10.000 + Rp3.000 = thirteen thousand rupiahs (Rp13.000).'
              : '"walls" is plural so the verb should be "surround" (without -s): "The whitewashed walls surround the clear bathing pool."',
          },
        ],
        dukunganTambahan: isSD
          ? 'Use pattern: "Can I have [item], please?" and add the two numbers from the menu list.'
          : 'Check whether the subject is singular (it/park -> verb+s) or plural (walls/gates -> base verb).',
        pengayaan: {
          instruksi: 'Extension task:',
          tugas: [
            isSD
              ? 'Ask your partner politely what drink they want from the menu and write down their answer.'
              : 'Combine two sensory details into one clear noun phrase (e.g., "clear turquoise bathing pools").',
          ],
        },
        kesimpulanRefleksi: [
          isSD
            ? 'Two polite words/phrases I practiced today are "..." and "...".'
            : 'In writing a Descriptive Text, Identification introduces ...... while Description explains ......',
          'Which part felt harder: finding details from the English text, choosing the right verb form, or writing your own sentences?',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: isSD ? 'Rp13.000' : 'Yogyakarta (~2 km south of Sultan Palace); bathing pools/gates/whitewashed walls.', langkahPenyelesaian: ['Locate lines directly in text.'] },
            { nomor: 2, jawabanInti: isSD ? 'Rp13.000 (thirteen thousand rupiahs)' : 'Change "surrounds" to "surround" because subject "walls" is plural.', langkahPenyelesaian: ['Match plural subject "walls" with plural Simple Present verb.'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: isSD ? 'Writing "I want..." abruptly without "please" or misreading Rp8.000 + Rp5.000.' : 'Adding -s to plural verbs ("walls surrounds") or mixing Past Tense for current building features.',
              caraMenangani: 'Highlight the subject noun before checking verb endings on the board.',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Text comprehension & features', aktivitasTerkait: 'Step 1 & Question 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Grammar accuracy & guided production', aktivitasTerkait: 'Step 2 & Question 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Comprehension & Accuracy',
              perluBimbingan: 'Answers do not match details in the provided text.',
              berkembang: 'Extracts explicit facts correctly but misses verb agreement or polite structure.',
              cakap: 'Answers accurately from text and fixes the grammar/price task correctly.',
              mahir: 'Also produces original descriptive/dialogue lines with natural vocabulary and zero agreement errors.',
            },
          ],
        },
      };
    }

    // Bahasa Indonesia (SD / SMP / SMA / SMK)
    const isSDAwal = grade.gradeBand === 'sd_awal';
    const isSDAtas = grade.gradeBand === 'sd_atas';
    const stimulusText = isSDAwal
      ? 'Bacalah cerita pendek ini:\n"Pagi ini Siti menyiram bunga melati di halaman sekolah sebelum bel berbunyi. Budi membantu membawakan ember air bersih. Bunga melati tampak segar dan wangi karena disiram setiap pagi."'
      : isSDAtas
      ? 'Bacalah paragraf berikut dengan saksama:\n"(1) Pohon memiliki peran penting untuk mencegah banjir di musim hujan. (2) Akar pohon mengikat tanah dan membantu menyerap air hujan ke dalam bumi. (3) Selain itu, daun yang rimbun memperlambat jatuhnya tetesan air ke tanah sehingga air tidak langsung menggenangi jalanan. (4) Oleh karena itu, menanam pohon di pekarangan sekolah membantu lingkungan tetap aman dari genangan air."'
      : 'Bacalah kutipan teks deskripsi berikut:\n"(1) Pantai Liang di Maluku Tengah memiliki pasir putih bersih sepanjang ratusan meter dan air laut berwarna biru jernih kehijauan. (2) Di tepi pantai berdiri deretan pohon ketapang berdaun lebar yang meneduhkan pengunjung dari terik matahari siang. (3) Suara ombaknya berderu lembut menghampiri kaki wisatawan, sementara angin pantai terasa sejuk di kulit. (4) Pantai ini mudah dikunjungi dan menjadi kebanggaan wisata alam setempat."';

    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: isSDAwal
        ? 'Membaca Teks Pendek & Menyusun Kalimat Santun'
        : 'Analisis Kutipan Teks Autentik & Menulis Terarah',
      modeKerja: isSDAwal ? 'Berpasangan' : 'Individu',
      alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
      targetBelajarSiswa: isSDAwal
        ? ['Menemukan nama tokoh, tempat, dan kejadian langsung dari bacaan.', 'Menyalin/menulis kalimat berita diawali huruf kapital dan diakhiri tanda titik.']
        : isSDAtas
        ? ['Menentukan kalimat utama dan gagasan pokok paragraf dari teks.', 'Membedakan kalimat utama dengan kalimat penjelas.']
        : ['Mengidentifikasi struktur teks dan citraan indra langsung dari kutipan kalimat bernomor.', 'Menyunting kesalahan penulisan preposisi "di" vs imbuhan "di-" dan menyusun kalimat deskripsi konkret.'],
      prasyaratMateri: isSDAwal ? ['Membaca lancar kata sederhana'] : ['Memahami paragraf dan tanda baca titik/kapital'],
      petunjukPengerjaan: [
        'Tunjuk nomor kalimat dalam teks kutipan sebagai bukti setiap jawabanmu.',
        'Jangan menebak di luar isi teks bacaan yang tersedia di atas.',
      ],
      stimulusKasus: {
        judul: isSDAwal ? 'Cerita Pagi di Halaman Sekolah' : isSDAtas ? 'Bacaan: Manfaat Pohon Menyerap Air Hujan' : 'Kutipan Teks Deskripsi: Pantai Liang',
        teks: stimulusText,
        pertanyaanAwal: isSDAwal
          ? 'Siapa saja anak yang ada dalam cerita pagi di sekolah itu?'
          : isSDAtas
          ? 'Kalimat nomor berapa yang paling umum dan dirinci oleh kalimat-kalimat lainnya?'
          : 'Pancaindra apa saja (penglihatan, pendengaran, peraba) yang muncul dalam kalimat (1) sampai (3)?',
      },
      stimulusData: {
        jenisData: 'kutipan_teks',
        poinKunci: isSDAwal
          ? ['Tokoh: Siti & Budi | Tempat: Halaman sekolah']
          : isSDAtas
          ? ['Jumlah kalimat: 4 kalimat bernomor (1)–(4)']
          : ['Jumlah kalimat: 4 kalimat bernomor (1)–(4)'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: isSDAwal ? 'Catat tokoh dan perbuatannya dari bacaan' : 'Analisis kalimat dalam teks bernomor',
          instruksi: isSDAwal
            ? 'Tuliskan siapa yang menyiram bunga dan siapa yang membantu membawakan air.'
            : isSDAtas
            ? 'Tentukan nomor kalimat utama dan catat dua bukti rincian dari kalimat penjelas (2) & (3).'
            : 'Kelompokkan kalimat (1)–(4) ke bagian Identifikasi, Deskripsi Bagian, atau Simpulan, lalu catat 2 contoh citraan pancaindra.',
          ruangJawabanJenis: 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: isSDAwal ? 'Susun 1 kalimat baru huruf kapital–titik' : 'Menulis & menyunting kalimat efektif',
          instruksi: isSDAwal
            ? 'Lengkapi dengan huruf kapital dan titik: "siti dan budi menjaga taman sekolah"'
            : 'Perbaiki ejaan atau tulis 2 kalimat baru bertema kelas/sekolah yang mengikuti pola teks pada bacaan di atas.',
          ruangJawabanJenis: 'uraian_panjang',
        },
      ],
      pemeriksaanHasil: ['Periksa kembali nomor kalimat kutipan, penggunaan huruf kapital awal kalimat, dan ketepatan tanda titik.'],
      pertanyaanAnalisis: [
        {
          id: 'q-bi-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Menemukan fakta tersurat dengan menyebutkan nomor kalimat/isi bacaan secara langsung.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: isSDAwal
            ? 'Di mana Siti dan Budi berada saat menyiram bunga melati?'
            : isSDAtas
            ? 'Menurut kalimat (2) dan (3), apa fungsi akar pohon dan daun rimbun saat hujan turun?'
            : 'Sebutkan dua kata atau frasa yang menggambarkan penglihatan (visual) serta satu frasa pendengaran dari kalimat (1)–(3)!',
          panduanJawabanSingkat: isSDAwal
            ? 'Di halaman sekolah.'
            : isSDAtas
            ? 'Akar mengikat tanah dan menyerap air hujan; daun rimbun memperlambat jatuhnya air hujan ke tanah.'
            : 'Visual: "pasir putih bersih", "air laut berwarna biru jernih kehijauan", "pohon ketapang berdaun lebar"; Pendengaran: "suara ombaknya berderu lembut".',
        },
        {
          id: 'q-bi-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: isSDAwal
            ? 'Memperbaiki kesalahan kapital awal kalimat dan tanda baca akhir kalimat.'
            : 'Mengevaluasi struktur kalimat/ejaan serta menjelaskan hubungan rincian ke ide pokok paragraf.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: isSDAwal
            ? 'Tuliskan kembali kalimat "budi membantu siti" dengan huruf kapital dan tanda titik yang benar!'
            : isSDAtas
            ? 'Tentukan gagasan pokok paragraf tersebut dalam satu kalimat singkat tanpa menyalin mentah keempat kalimatnya!'
            : 'Periksa penulisan dua ungkapan berikut: "di pantai" dan "di kunjungi". Manakah yang penulisannya keliru dan bagaimana perbaikannya sesuai kaidah kata depan vs imbuhan?',
          panduanJawabanSingkat: isSDAwal
            ? 'Budi membantu Siti.'
            : isSDAtas
            ? 'Pentingnya pohon untuk menyerap air hujan dan mencegah genangan banjir.'
            : '"di pantai" sudah benar karena kata depan penunjuk tempat dipisah; "di kunjungi" keliru, seharusnya dirangkai menjadi "dikunjungi" karena imbuhan pasif di-.',
        },
      ],
      dukunganTambahan: isSDAwal
        ? 'Huruf kapital dipakai di huruf paling awal kalimat dan huruf pertama nama orang.'
        : 'Perhatikan kata depan "di" (menunjukkan tempat -> ditulis terpisah) vs awalan pasif "di-" (melekat pada kata kerja -> digabung).',
      pengayaan: {
        instruksi: 'Latihan lanjutan terkait TP:',
        tugas: [
          isSDAwal
            ? 'Buat 1 kalimat sendiri tentang kegiatan menjaga kebersihan kelas!'
            : 'Tulis 1 kalimat tambahan dengan citraan perabaan/penciuman atau fakta pendukung yang menyambung mulus ke bacaan di atas.',
        ],
      },
      kesimpulanRefleksi: [
        isSDAwal
          ? 'Setiap kalimat berita diawali huruf ...... dan diakhiri tanda ......'
          : 'Penulisan tempat seperti "di sekolah" ditulis ......., sedangkan kata kerja pasif seperti "dikunjungi" ditulis .......',
        'Bagian mana yang menurutmu masih perlu berlatih: menemukan bukti di bacaan, menentukan ejaan, atau menyusun kalimat sendiri?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: isSDAwal ? 'Di halaman sekolah.' : 'Sesuai kutipan eksplisit kalimat (1)–(3) teks stimulus.', langkahPenyelesaian: ['Verifikasi kecocokan jawaban siswa dengan kalimat bernomor.'] },
          { nomor: 2, jawabanInti: isSDAwal ? 'Budi membantu Siti.' : isSDAtas ? 'Manfaat pohon mencegah banjir lewat serapan akar dan daun.' : '"dikunjungi" harus digabung (imbuhan verba); "di pantai" dipisah (preposisi tempat).', langkahPenyelesaian: ['Cek pemahaman pembeda kata depan vs imbuhan atau kalimat utama paragraf.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: isSDAwal ? 'Lupa memberi huruf kapital pada nama orang di tengah kalimat.' : 'Menggabung seluruh kata "di" atau memisahkan semua "di" termasuk kata kerja pasif ("di baca").',
            caraMenangani: 'Uji dengan mengubah ke bentuk aktif me-: jika bisa menjadi "mengunjungi", berarti imbuhan "di-" digabung ("dikunjungi").',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi informasi & struktur teks', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Kaidah kebahasaan/EYD & menulis', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Ketepatan analisis teks & kaidah ejaan',
            perluBimbingan: 'Jawaban tidak merujuk isi teks atau terdapat lebih dari 2 kesalahan ejaan.',
            berkembang: 'Menemukan fakta teks dasar tetapi belum tepat memperbaiki kaidah huruf kapital / preposisi "di".',
            cakap: 'Seluruh jawaban didukung bukti kalimat teks dan perbaikan kaidah EYD tepat.',
            mahir: 'Juga menulis kalimat lanjutan yang hidup, efektif, dan bebas kesalahan ejaan.',
          },
        ],
      },
    };
  }

  // =========================================================================
  // 2. SOSIAL & SEJARAH (EKONOMI, GEOGRAFI, SEJARAH, IPS, SOSIOLOGI)
  // =========================================================================
  if (family === 'sosial_sejarah') {
    if (lowerMapel.includes('ekonomi')) {
      const stimulusText =
        'Pada pasar buah lokal, fungsi permintaan jeruk dinyatakan sebagai Qd = 100 − 2P dan fungsi penawaran jeruk Qs = 20 + 2P (dengan P = harga dalam ribuan rupiah per kg dan Q = jumlah dalam kg). Tentukan harga keseimbangan pasar (P*) dan jumlah keseimbangan (Q*), lalu analisis apa yang terjadi di pasar bila harga ditetapkan Rp25.000/kg (P = 25)!';
      return {
        isCuratedFixture: true,
        subJudulTopik: 'Menentukan Harga & Jumlah Keseimbangan Pasar (Qd = Qs)',
        pendekatanKegiatan: 'Analisis Data Pasar, Pemodelan Persamaan Ekonomi & Pemeriksaan',
        modeKerja: 'Berpasangan',
        alokasiWaktu: '2 x 45 Menit',
        targetBelajarSiswa: [
          'Menghitung titik keseimbangan pasar (P*, Q*) dari fungsi permintaan Qd dan penawaran Qs.',
          'Mengidentifikasi kondisi kelebihan penawaran (excess supply) atau kelebihan permintaan saat harga melenceng dari keseimbangan.',
        ],
        prasyaratMateri: ['Menyelesaikan persamaan linear satu variabel dan hukum permintaan–penawaran'],
        petunjukPengerjaan: [
          'Perhatikan bahwa P dinyatakan dalam ribuan rupiah (P = 20 berarti Rp20.000/kg).',
          'Substitusikan nilai P* ke fungsi Qd DAN Qs untuk memastikan jumlah sama.',
        ],
        stimulusKasus: {
          judul: 'Pasar Buah Lokal: Permintaan & Penawaran Jeruk',
          teks: stimulusText,
          pertanyaanAwal: 'Apa syarat aljabar yang harus dipenuhi agar pasar berada pada kondisi keseimbangan?',
        },
        stimulusData: {
          jenisData: 'persamaan',
          poinKunci: ['Fungsi Permintaan: Qd = 100 − 2P', 'Fungsi Penawaran: Qs = 20 + 2P', 'Syarat Keseimbangan: Qd = Qs'],
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: 'Selesaikan persamaan Qd = Qs untuk menentukan harga P*',
            instruksi: 'Tuliskan 100 − 2P = 20 + 2P lalu kumpulkan suku sejenis.',
            ruangJawabanJenis: 'perhitungan',
          },
          {
            langkahKe: 2,
            judulLangkah: 'Hitung Q* pada fungsi Qd maupun Qs sebagai verifikasi',
            instruksi: 'Substitusikan P* ke Qd dan Qs; cek apakah hasilnya sama.',
            ruangJawabanJenis: 'perhitungan',
          },
          {
            langkahKe: 3,
            judulLangkah: 'Analisis dampak harga P = 25 (Rp25.000/kg)',
            instruksi: 'Hitung Qd dan Qs saat P = 25 untuk menentukan terjadi kelebihan barang atau kekurangan barang.',
            ruangJawabanJenis: 'perhitungan',
          },
        ],
        pemeriksaanHasil: ['Verifikasi keseimbangan: P*=20 -> Qd = 100−40 = 60 kg, Qs = 20+40 = 60 kg (Cocok).'],
        pertanyaanAnalisis: [
          {
            id: 'q-eko-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Menyelesaikan persamaan linear tunggal Qd = Qs lalu menyubstitusi nilai harga.',
            ruangJawabanJenis: 'perhitungan',
            pertanyaan: 'Berapakah harga keseimbangan pasar (dalam rupiah/kg) dan jumlah keseimbangan jeruk (kg)?',
            panduanJawabanSingkat: '4P = 80 -> P* = 20 (Rp20.000/kg); Q* = 100 − 2(20) = 60 kg.',
          },
          {
            id: 'q-eko-2',
            nomor: 2,
            tingkatKognitif: 'Menengah',
            alasanTingkatKognitif: 'Menghitung selisih Qs − Qd pada harga di atas keseimbangan dan menafsirkan surplus pasar.',
            ruangJawabanJenis: 'perhitungan',
            pertanyaan: 'Jika harga ditetapkan di P = 25 (Rp25.000/kg), berapa kg kelebihan penawaran atau kelebihan permintaan yang terjadi?',
            panduanJawabanSingkat: 'Qd = 100 − 50 = 50 kg; Qs = 20 + 50 = 70 kg. Qs > Qd sehingga terjadi kelebihan penawaran (excess supply/surplus) sebesar 70 − 50 = 20 kg.',
          },
        ],
        dukunganTambahan: 'Pindahkan -2P ke ruas kanan menjadi +2P -> 100 − 20 = 2P + 2P -> 80 = 4P.',
        pengayaan: {
          instruksi: 'Pengayaan analisis kebijakan:',
          tugas: ['Apa yang terjadi pada jumlah transaksi bila pemerintah menetapkan harga maksimum di P = 15 (Rp15.000/kg)? Hitung Qd dan Qs-nya!'],
        },
        kesimpulanRefleksi: [
          'Harga keseimbangan pasar tercapai pada Rp.........../kg dengan jumlah ...... kg.',
          'Kesulitan apa yang muncul: memindahkan tanda persamaan, menafsirkan satuan ribuan rupiah, atau membedakan surplus vs shortage?',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: 'Rp20.000/kg (P=20), Q*=60 kg.', langkahPenyelesaian: ['100 - 2P = 20 + 2P -> 4P = 80 -> P=20', 'Q = 100 - 40 = 60.'] },
            { nomor: 2, jawabanInti: 'Surplus penawaran 20 kg (Qs=70, Qd=50).', langkahPenyelesaian: ['Saat P=25: Qd=50, Qs=70 -> surplus 20 kg.'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: 'Menulis jawaban akhir harga sebagai "Rp20" tanpa mengembalikan skala satuan ribuan menjadi Rp20.000/kg.',
              caraMenangani: 'Garisbawahi keterangan skala satuan pada stimulus sebelum siswa menuliskan kalimat simpulan.',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Menentukan P* & Q* keseimbangan', aktivitasTerkait: 'Langkah 1–2 & Pertanyaan 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menganalisis surplus/shortage harga', aktivitasTerkait: 'Langkah 3 & Pertanyaan 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Ketepatan perhitungan keseimbangan & interpretasi pasar',
              perluBimbingan: 'Salah menyusun tanda +/- saat menyamakan Qd = Qs.',
              berkembang: 'P*=20 dan Q*=60 tepat, namun lupa menyertakan satuan Rp20.000/kg atau salah hitung surplus.',
              cakap: 'Tepat menemukan Rp20.000/kg, 60 kg, dan menghitung surplus 20 kg pada P=25.',
              mahir: 'Menuntaskan semua hitungan lengkap disertai skenario pengayaan P=15 (shortage 20 kg).',
            },
          ],
        },
      };
    }

    if (lowerMapel.includes('sejarah')) {
      const stimulusText =
        'Perhatikan catatan linimasa dan dua sumber peristiwa sejarah berikut:\n[Linimasa] 1908: Berdirinya Budi Utomo | 1928: Kongres Pemuda II / Sumpah Pemuda | 17 Agustus 1945: Pembacaan Teks Proklamasi Kemerdekaan.\n[Sumber A]: Foto asli pembacaan teks Proklamasi oleh Soekarno di Jalan Pegangsaan Timur 56 pada 17 Agustus 1945 beserta rekaman saksi mata hadirin.\n[Sumber B]: Buku pelajaran Sejarah Indonesia terbitan tahun 2024 yang merangkum bab Pergerakan Nasional.';
      return {
        isCuratedFixture: true,
        subJudulTopik: cleanTopicHeading(tp.materiPokok),
        pendekatanKegiatan: 'Analisis Kronologi Peristiwa & Kritik Sumber Sejarah',
        modeKerja: 'Berpasangan',
        alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
        targetBelajarSiswa: [
          'Mengurutkan peristiwa pergerakan nasional secara kronologis serta menjelaskan perubahan strategi perjuangan.',
          'Membedakan sumber sejarah primer dan sekunder dari waktu pembuatan serta keterlibatan pembuatnya.',
        ],
        prasyaratMateri: ['Memahami urutan tahun kalender dan arti dokumen saksi mata'],
        petunjukPengerjaan: [
          'Periksa tahun pembuatan dan siapa pembuat Sumber A maupun Sumber B.',
          'Gunakan bukti kronologi linimasa dalam menuliskan hubungan sebab-akibat.',
        ],
        stimulusKasus: {
          judul: 'Linimasa Pergerakan Nasional & Klasifikasi Sumber Sejarah',
          teks: stimulusText,
          pertanyaanAwal: 'Mengapa tahun 1908 dan 1928 dianggap sebagai titik perubahan penting sebelum 1945?',
        },
        stimulusData: {
          jenisData: 'tabel',
          tabelData: {
            kolom: ['Sumber', 'Waktu Dibuat', 'Pembuat / Posisi', 'Klasifikasi (Primer/Sekunder)'],
            baris: [
              ['Sumber A (Foto 17 Ags 1945)', 'Saat peristiwa (1945)', 'Saksi langsung di lokasi', '.......................'],
              ['Sumber B (Buku Teks 2024)', 'Pasca-peristiwa (2024)', 'Penulis/peneliti modern', '.......................'],
            ],
          },
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: 'Bandingkan Sumber A dan Sumber B untuk menentukan sumber primer vs sekunder',
            instruksi: 'Lengkapi tabel perbandingan berdasarkan kedekatan waktu dengan peristiwa 1945.',
            ruangJawabanJenis: 'tabel',
          },
          {
            langkahKe: 2,
            judulLangkah: 'Jelaskan keterkaitan kronologis 1908 -> 1928 -> 1945',
            instruksi: 'Tuliskan apa perubahan strategi perjuangan yang terjadi dari masa sebelum 1908 menuju organisasi modern dan persatuan pemuda 1928.',
            ruangJawabanJenis: 'uraian_panjang',
          },
        ],
        pemeriksaanHasil: ['Pastikan alasan penentuan sumber primer/sekunder menyebut bukti kedekatan waktu dan kesaksian langsung.'],
        pertanyaanAnalisis: [
          {
            id: 'q-sej-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Mengklasifikasikan dua sumber berdasar definisi saksi sezaman vs tulisan belakangan.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Manakah yang termasuk sumber primer dan sumber sekunder di antara Sumber A dan Sumber B? Jelaskan ciri penentunya!',
            panduanJawabanSingkat: 'Sumber A primer (dibuat langsung pada waktu kejadian 1945 oleh saksi mata); Sumber B sekunder (disusun ulang puluhan tahun kemudian dari penelitian sumber terdahulu).',
          },
          {
            id: 'q-sej-2',
            nomor: 2,
            tingkatKognitif: 'Mahir',
            alasanTingkatKognitif: 'Menilai mengapa sejarawan tetap memeriksa keabsahan (kritik sumber) terhadap sumber primer sekalipun.',
            ruangJawabanJenis: 'uraian_panjang',
            pertanyaan: 'Meskipun sebuah dokumen merupakan sumber primer dari tahun 1945, mengapa sejarawan tetap perlu membandingkannya dengan kesaksian lain sebelum menarik kesimpulan?',
            panduanJawabanSingkat: 'Karena satu saksi mata mungkin memiliki keterbatasan sudut pandang, sudut pengambilan gambar parsial, atau bias pribadi; pembandingan antarsumber (koroborasi) memastikan objektivitas fakta sejarah.',
          },
        ],
        dukunganTambahan: 'Primer = berasal dari zaman/peristiwa itu sendiri; Sekunder = ditulis oleh peneliti di masa sesudahnya berdasarkan sumber-sumber primer.',
        pengayaan: {
          instruksi: 'Pengayaan analisis sumber:',
          tugas: ['Berikan satu contoh sumber primer di lingkungan keluargamu (mis. ijazah lama, foto keluarga tahun 1980) dan jelaskan cara menjaganya dari kerusakan.'],
        },
        kesimpulanRefleksi: [
          'Sumber A tergolong sumber ...... karena .......; sedangkan Sumber B tergolong ......',
          'Aspek mana yang masih perlu diperdalam: berpikir kronologis diakronik vs sinkronik, atau verifikasi sumber?',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: 'A = Primer, B = Sekunder.', langkahPenyelesaian: ['Tunjukkan tahun 1945 vs 2024 dan keterlibatan langsung.'] },
            { nomor: 2, jawabanInti: 'Menghindari bias sudut pandang tunggal lewat koroborasi silang antarsumber.', langkahPenyelesaian: ['Tekankan langkah kritik ekstern/intern dalam metode sejarah.'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: 'Menganggap sumber primer adalah "buku paling utama/tebal di perpustakaan" sedangkan sekunder adalah "buku pendamping".',
              caraMenangani: 'Beri contoh konkret: buku paket 2024 sangat penting di kelas, tetapi bagi peristiwa 1945 ia tetap sumber sekunder karena penulisnya tidak mengalami langsung 1945.',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Klasifikasi sumber primer/sekunder', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Kronologi & kritik sumber sejarah', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Analisis kronologi & kritik sumber',
              perluBimbingan: 'Mengira buku ajar modern 2024 merupakan sumber primer karena dicetak resmi.',
              berkembang: 'Benar memisahkan Sumber A (primer) dan B (sekunder), namun alasan kritik sumber masih umum.',
              cakap: 'Menjelaskan tepat perbedaan waktu pembuatan primer vs sekunder beserta alur 1908–1945.',
              mahir: 'Menjelaskan perlunya koroborasi antarsaksi sumber primer untuk mencegah bias sejarah.',
            },
          ],
        },
      };
    }

    // Geografi / Sosiologi / IPS
    const isGeog = lowerMapel.includes('geografi');
    const stimulusText = isGeog
      ? 'Badan penanggulangan pesisir mencatat tinggi pasang maksimum air laut bulan purnama di teluk mencapai +1,20 meter di atas permukaan laut rata-rata (dpl). Data survei elevasi daratan di tiga kelurahan pesisir menunjukkan: Kelurahan Pulo Beras (+0,85 m dpl), Kelurahan Muara Baru (+1,05 m dpl), dan Kelurahan Bukit Indah (+2,40 m dpl).'
      : 'Perhatikan jadwal penerbangan antartiga kota di Indonesia berikut: Pesawat berangkat dari Jakarta (WIB / UTC+7) pukul 07.00 WIB menuju Makassar (WITA / UTC+8) dengan lama penerbangan tepat 2 jam 15 menit. Kota tujuan ketiga adalah Jayapura yang berada di zona WIT (UTC+9). Tentukan pukul berapa pesawat tiba dalam waktu setempat Makassar (WITA) dan berapa selisih waktu antara Jakarta dengan Jayapura!';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: isGeog ? 'Analisis Data Elevasi & Pemetaan Risiko Wilayah' : 'Analisis Keruangan & Konversi Zona Waktu Indonesia',
      modeKerja: 'Berpasangan',
      alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
      targetBelajarSiswa: isGeog
        ? ['Membandingkan data elevasi wilayah terhadap tinggi pasang maksimum laut.', 'Merumuskan rekomendasi mitigasi struktural dan tata ruang berdasarkan data risiko.']
        : ['Menghitung perbedaan waktu resmi Indonesia (WIB, WITA, WIT).', 'Mengaitkan letak garis bujur astronomis Indonesia dengan pembagian tiga zona waktu.'],
      prasyaratMateri: isGeog ? ['Membaca bilangan desimal pada tabel ketinggian'] : ['Operasi penjumlahan jam dan menit'],
      petunjukPengerjaan: [
        isGeog ? 'Bandingkan elevasi tiap kelurahan (m dpl) dengan tinggi pasang +1,20 m.' : 'Hitung lama terbang dulu dalam WIB, lalu tambahkan selisih +1 jam untuk WITA dan +2 jam untuk WIT.',
      ],
      stimulusKasus: {
        judul: isGeog ? 'Data Elevasi Pesisir vs Tinggi Pasang Purnama' : 'Perhitungan Waktu Penerbangan Jakarta–Makassar–Jayapura',
        teks: stimulusText,
        pertanyaanAwal: isGeog
          ? 'Kelurahan mana yang memiliki elevasi LEBIH RENDAH dari tinggi pasang air laut (+1,20 m)?'
          : 'Mengapa wilayah Indonesia yang membentang dari 95°BT hingga 141°BT terbagi menjadi tiga zona waktu?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: isGeog
          ? {
              kolom: ['Kelurahan', 'Elevasi Tanah (m dpl)', 'Pasang Maksimum', 'Risiko Genangan (Tergenang / Aman)'],
              baris: [
                ['Pulo Beras', '+0,85 m', '+1,20 m', '.......................'],
                ['Muara Baru', '+1,05 m', '+1,20 m', '.......................'],
                ['Bukit Indah', '+2,40 m', '+1,20 m', '.......................'],
              ],
            }
          : {
              kolom: ['Kota', 'Zona Waktu', 'Selisih dari WIB'],
              baris: [
                ['Jakarta', 'WIB (UTC+7)', '0 jam'],
                ['Makassar', 'WITA (UTC+8)', '+1 jam'],
                ['Jayapura', 'WIT (UTC+9)', '+2 jam'],
              ],
            },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: isGeog ? 'Hitung selisih tinggi pasang dikurangi elevasi kelurahan' : 'Hitung waktu tiba dalam WIB lalu ubah ke WITA',
          instruksi: isGeog
            ? 'Tentukan dua kelurahan yang elevasinya di bawah +1,20 m dan hitung potensi kedalaman airnya (1,20 − elevasi).'
            : 'Tambahkan 2 jam 15 menit ke pukul 07.00 WIB, lalu konversikan ke WITA (+1 jam).',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: isGeog ? 'Susun rekomendasi mitigasi berbasis data' : 'Tentukan pukul saat itu di Jayapura (WIT) & kaitkan dengan kondisi wilayah',
          instruksi: isGeog
            ? 'Usulkan langkah perlindungan untuk kelurahan terdampak dan fungsi wilayah Bukit Indah (+2,40 m) sebagai titik evakuasi.'
            : 'Saat pesawat mendarat di Makassar pukul tersebut, pukul berapa waktu yang ditunjukkan jam dinding warga Jayapura?',
          ruangJawabanJenis: 'uraian_singkat',
        },
      ],
      pemeriksaanHasil: [
        isGeog ? 'Pastikan 1,20 − 0,85 = 0,35 m (35 cm) dan 1,20 − 1,05 = 0,15 m (15 cm).' : 'Pastikan 07.00 WIB + 2j 15m = 09.15 WIB = 10.15 WITA = 11.15 WIT.',
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-sos-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: isGeog ? 'Membandingkan dua bilangan desimal dari tabel.' : 'Penjumlahan durasi waktu dengan konversi 1 zona.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: isGeog
            ? 'Kelurahan mana saja yang terancam tergenang banjir rob, dan berapa perkiraan tinggi genangan air di atas permukaan tanahnya?'
            : 'Pada pukul berapa pesawat tiba di Makassar dalam waktu setempat (WITA), dan pukul berapa saat bersamaan di Jayapura (WIT)?',
          panduanJawabanSingkat: isGeog
            ? 'Pulo Beras (1,20 − 0,85 = 0,35 m / 35 cm) dan Muara Baru (1,20 − 1,05 = 0,15 m / 15 cm). Bukit Indah (+2,40 m) tetap aman di atas pasang.'
            : 'Tiba Makassar 09.15 WIB = 10.15 WITA; di Jayapura saat itu sudah pukul 11.15 WIT.',
        },
        {
          id: 'q-sos-2',
          nomor: 2,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Mengambil keputusan perencanaan berbasis tren perubahan muka tanah dan kausalitas ruang.',
          ruangJawabanJenis: 'uraian_panjang',
          pertanyaan: isGeog
            ? 'Jika Kelurahan Muara Baru mengalami penurunan muka tanah 0,05 m setiap tahun, dalam berapa tahun wilayah itu menyamai ketinggian Pulo Beras (+0,85 m) sekarang?'
            : 'Mengapa warga Makassar mengalami matahari terbit lebih dulu daripada warga Jakarta, dan apa akibatnya bagi koordinasi kegiatan nasional daring?',
          panduanJawabanSingkat: isGeog
            ? '(1,05 − 0,85) / 0,05 = 0,20 / 0,05 = 4 tahun; maka perlu pengendalian pengambilan air tanah dan tanggul rob segera.'
            : 'Karena rotasi Bumi dari barat ke timur membuat wilayah timur (120°BT Makassar, 141°BT Jayapura) terkena sinar matahari lebih pagi; agenda daring nasional wajib menyebut zona waktu secara eksplisit.',
        },
      ],
      dukunganTambahan: isGeog
        ? 'Air laut menggenangi wilayah dengan angka elevasi dpl lebih kecil daripada angka ketinggian pasang (+1,20 m).'
        : 'Ke arah timur (WIB -> WITA -> WIT) waktu bertambah +1 jam setiap pindah 1 zona.',
      pengayaan: {
        instruksi: 'Pengayaan kontekstual:',
        tugas: [
          isGeog
            ? 'Jelaskan peran ekosistem hutan bakau (mangrove) di garis pantai sebelum permukiman Pulo Beras terhadap energi gelombang pasang.'
            : 'Jika rapat nasional dijadwalkan pukul 09.00 WIT di Papua, pukul berapa peserta dari Bandung (WIB) harus mulai bergabung?',
        ],
      },
      kesimpulanRefleksi: [
        'Data kuantitatif wilayah (elevasi/zona waktu) menentukan keputusan tata ruang maupun koordinasi aktivitas masyarakat.',
        'Bagian mana yang paling menantang: membaca selisih tabel data atau menghubungkan data ke keputusan lapangan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: isGeog ? 'Pulo Beras (35 cm) & Muara Baru (15 cm).' : '10.15 WITA (Makassar) dan 11.15 WIT (Jayapura).', langkahPenyelesaian: ['Hitung langsung selisih dari tabel.'] },
          { nomor: 2, jawabanInti: isGeog ? '4 tahun lagi ((1,05-0,85)/0,05); tangani air tanah.' : 'Rotasi Bumi barat->timur; wajib mencantumkan zona waktu (WIB/WITA/WIT).', langkahPenyelesaian: ['Hubungkan hitung matematis/astronomis dengan kebijakan.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: isGeog ? 'Menjumlah elevasi dengan tinggi pasang alih-alih mengurangkannya.' : 'Mengurangi jam (bukan menambah) saat bergerak ke wilayah timur Indonesia.',
            caraMenangani: 'Ingatkan "Timur = Terbit duluan = Jam lebih besar (+1 tiap zona)".',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Mengolah data spasial/zona', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Analisis dampak & rekomendasi kebijakan', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Akurasi analisis data wilayah & kesimpulan',
            perluBimbingan: 'Salah membaca tanda selisih atau tidak memakai data angka dari tabel.',
            berkembang: 'Benar mengidentifikasi kelurahan/jam dasar, namun hitungan lanjutan masih keliru.',
            cakap: 'Seluruh perhitungan elevasi/zona waktu akurat beserta penjelasannya.',
            mahir: 'Menjawab tepat soal tren/dampak dan memberi rekomendasi tata ruang/koordinasi yang konkret.',
          },
        ],
      },
    };
  }

  // =========================================================================
  // 3. PENDIDIKAN PANCASILA, PAI & MAPEL KEMENAG (FIKIH, QUR'AN HADIS, AKIDAH, SKI)
  // =========================================================================
  if (family === 'pancasila_agama') {
    const isQuranHadis = lowerMapel.includes('qur') || lowerMapel.includes('hadis') || lowerTopic.includes('tajwid');
    const isFikih = lowerMapel.includes('fikih') || lowerTopic.includes('thaharah') || lowerTopic.includes('muamalah') || lowerTopic.includes('zakat');
    const isPancasila = lowerMapel.includes('pancasila') || lowerMapel.includes('ppkn');

    if (isQuranHadis) {
      const stimulusText =
        'Perhatikan empat contoh potongan lafaz Arab berharakat dengan pertemuan Nun Sukun (نْ) atau Tanwin (ـًـٍـٌ) dan huruf sesudahnya:\n(1) مِنْ خَوْفٍ (Min khaufin -> Nun sukun bertemu huruf خ)\n(2) مَنْ يَقُولُ (Man yaquulu -> Nun sukun bertemu huruf ي)\n(3) سَمِيعٌ بَصِيرٌ (Samii’un bashiirun -> Tanwin bertemu huruf ب)\n(4) عَنْ صَلَاتِهِمْ (‘An shalaatihim -> Nun sukun bertemu huruf ص)\nIdentifikasi hukum bacaan masing-masing contoh berdasarkan huruf setelah nun sukun/tanwin dan jelaskan cara melafalkannya dengan tartil!';
      return {
        isCuratedFixture: true,
        subJudulTopik: 'Identifikasi Hukum Nun Sukun/Tanwin pada Contoh Lafaz Berharakat',
        pendekatanKegiatan: 'Klasifikasi Hukum Bacaan & Penerapan Cara Lafal',
        modeKerja: 'Berpasangan',
        alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
        targetBelajarSiswa: [
          'Menunjukkan huruf sesudah nun sukun/tanwin pada empat potongan lafaz.',
          'Menentukan hukum bacaan (Izhar Halqi, Idgham Bighunnah, Iqlab, atau Ikhfa Haqiqi) beserta cara bacanya.',
        ],
        prasyaratMateri: ['Mengenal huruf hijaiyah serta tanda sukun (ْ) dan tanwin (ً ٍ ٌ)'],
        petunjukPengerjaan: [
          'Lingkari huruf tepat sesudah نْ atau tanwin pada masing-masing potongan contoh.',
          'Cocokkan huruf tersebut dengan kaidah hukum bacaan sebelum menentukan cara bacanya (jelas, lebur berdengung, mengganti ke mim, atau samar).',
        ],
        stimulusKasus: {
          judul: 'Empat Contoh Potongan Lafaz Nun Sukun / Tanwin',
          teks: stimulusText,
          pertanyaanAwal: 'Huruf hijaiyah apa saja yang tepat berada setelah nun sukun atau tanwin pada nomor (1)–(4)?',
        },
        stimulusData: {
          jenisData: 'tabel',
          tabelData: {
            kolom: ['No', 'Potongan Lafaz', 'Huruf Pertemuan', 'Hukum Bacaan & Cara Lafal'],
            baris: [
              ['1', 'مِنْ خَوْفٍ', 'نْ + خ', '.......................'],
              ['2', 'مَنْ يَقُولُ', 'نْ + ي', '.......................'],
              ['3', 'سَمِيعٌ بَصِيرٌ', 'Tanwin ٌ + ب', '.......................'],
              ['4', 'عَنْ صَلَاتِهِمْ', 'نْ + ص', '.......................'],
            ],
          },
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: 'Catat huruf pertemuan setelah nun sukun/tanwin',
            instruksi: 'Tentukan huruf tepat sesudah نْ/tanwin untuk keempat potongan contoh di atas.',
            ruangJawabanJenis: 'tabel',
          },
          {
            langkahKe: 2,
            judulLangkah: 'Klasifikasikan hukum tajwid dan cara pelafalannya',
            instruksi: 'Pasangkan masing-masing nomor ke Izhar Halqi, Idgham Bighunnah, Iqlab, atau Ikhfa Haqiqi serta jelaskan bunyi bacanya.',
            ruangJawabanJenis: 'uraian_singkat',
          },
        ],
        pemeriksaanHasil: [
          'Periksa: hanya pertemuan dengan huruf ب (nomor 3) yang mengubah bunyi "n" menjadi bunyi mim berdengung (Iqlab).',
        ],
        pertanyaanAnalisis: [
          {
            id: 'q-qh-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Mencocokkan huruf pertemuan (خ، ي، ب، ص) langsung ke 4 hukum bacaan dasar.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Tentukan hukum bacaan bagi masing-masing contoh nomor (1) sampai (4)!',
            panduanJawabanSingkat: '(1) مِنْ خَوْفٍ = Izhar Halqi (dibaca jelas tanpa dengung); (2) مَنْ يَقُولُ = Idgham Bighunnah (lebur ke ي berdengung); (3) سَمِيعٌ بَصِيرٌ = Iqlab (tanwin berbunyi mim samar berdengung); (4) عَنْ صَلَاتِهِمْ = Ikhfa Haqiqi (samar berdengung).',
          },
          {
            id: 'q-qh-2',
            nomor: 2,
            tingkatKognitif: 'Menengah',
            alasanTingkatKognitif: 'Mendeteksi kekeliruan pelafalan dengung pada Izhar Halqi dan menjelaskan perbaikannya.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Jika seorang teman membaca "مِنْ خَوْفٍ" dengan mendengung panjang seperti "mingg khaufin", di mana letak kekeliruannya dan bagaimana seharusnya dibaca?',
            panduanJawabanSingkat: 'Keliru karena خ adalah huruf tenggorokan (Izhar Halqi), sehingga nun sukun wajib dibaca terang dan jelas tanpa dengung/samar ("min khaufin").',
          },
        ],
        dukunganTambahan: 'Kelompok huruf Izhar Halqi (tenggorokan): ء، هـ، ع، ح، غ، خ -> selalu dibaca jelas tanpa ghunnah.',
        pengayaan: {
          instruksi: 'Latihan penguatan bacaan tartil:',
          tugas: ['Mengapa huruf ب disebut huruf tunggal Iqlab? Coba lafalkan "sami’um bashiir" sambil merasakan pertemuan dua bibir pada bunyi م dan ب.'],
        },
        kesimpulanRefleksi: [
          'Empat contoh di atas membuktikan bahwa perbedaan satu huruf sesudah نْ/tanwin menentukan apakah suara dibaca ......, lebur, bertukar mim, atau samar.',
          'Hukum bacaan mana yang paling sering kamu salah baca saat tilawah? Tuliskan cara mengeceknya!',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: '1: Izhar Halqi, 2: Idgham Bighunnah, 3: Iqlab, 4: Ikhfa Haqiqi.', langkahPenyelesaian: ['Cocokkan huruf خ (Halq), ي (Yanmu), ب (Iqlab), ص (Ikhfa).'] },
            { nomor: 2, jawabanInti: 'Salah mendengungkan Izhar Halqi; bacaan harus jelas "min khaufin".', langkahPenyelesaian: ['Jelaskan sifat huruf halqi tidak disertai ghunnah.'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: 'Mendengungkan semua nun sukun termasuk sebelum huruf Izhar (مِنْ خَوْفٍ dibaca meng-khauf) atau memanjangkan qalqalah pada mim.',
              caraMenangani: 'Praktekkan contoh suara kontras "min khaufin" (jelas 1 ketuk lidah di ujung atas) vs "man yaquul" (lebur berdengung 2 ketukan).',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi huruf & hukum nun sukun', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Koreksi pelafalan tartil', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Ketepatan identifikasi hukum & cara baca tajwid',
              perluBimbingan: 'Tidak membedakan Izhar Halqi (dibaca jelas) dari hukum berdengung.',
              berkembang: 'Tepat menyebutkan nama hukum, tetapi belum tepat menjelaskan cara pelafalannya.',
              cakap: 'Klasifikasi keempat contoh benar disertai alasan huruf pertemuan dan cara baca.',
              mahir: 'Juga mengidentifikasi letak kekeliruan dengung pada contoh soal nomor 2 dengan alasan kaidah tepat.',
            },
          ],
        },
      };
    }

    if (isFikih) {
      const stimulusText =
        'Perhatikan dua skenario transaksi muamalah berikut:\n[Transaksi A]: Rina membeli sebuah kalkulator di toko alat tulis seharga Rp85.000. Penjual mengizinkan Rina mencoba menyalakan dan mengecek tombolnya. Rina setuju, menyerahkan uang tunai, dan menerima barang tersebut.\n[Transaksi B]: Dito membeli "paket kotak kejutan alat tulis tertutup" seharga Rp30.000 lewat pesan daring tanpa mengetahui isi, jumlah, atau jenis barang di dalamnya, hanya diberitahu "isinya rahasia dan tidak bisa ditukar bila kosong atau rusak".\nPeriksa keabsahan kedua transaksi berdasarkan rukun dan syarat jual beli (kejelasan barang, harga, ijab qabul, dan prinsip menghindari gharar)!';
      return {
        isCuratedFixture: true,
        subJudulTopik: cleanTopicHeading(tp.materiPokok),
        pendekatanKegiatan: 'Analisis Kasus Muamalah & Penerapan Kaidah Fikih',
        modeKerja: 'Berpasangan',
        alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
        targetBelajarSiswa: [
          'Memeriksa pemenuhan rukun jual beli dan syarat kejelasan objek transaksi.',
          'Menjelaskan alasan mengapa unsur ketidakjelasan merugikan (gharar) dihindari dan bagaimana mengubah akad menjadi sah.',
        ],
        prasyaratMateri: ['Mengenal rukun jual beli dasar (penjual, pembeli, barang/objek, nilai tukar, ijab qabul)'],
        petunjukPengerjaan: [
          'Bandingkan unsur barang, kejelasan harga, serta hak pemeriksaan (khiyar) pada Transaksi A vs Transaksi B.',
        ],
        stimulusKasus: {
          judul: 'Memeriksa Sah Tidaknya Dua Contoh Transaksi Jual Beli',
          teks: stimulusText,
          pertanyaanAwal: 'Syarat objek jual beli apa yang tidak terpenuhi pada Transaksi B dibanding Transaksi A?',
        },
        stimulusData: {
          jenisData: 'tabel',
          tabelData: {
            kolom: ['Unsur Periksa', 'Transaksi A (Kalkulator Toko)', 'Transaksi B (Kotak Rahasia Tanpa Penjelasan)'],
            baris: [
              ['Kejelasan Jenis & Kondisi Barang', 'Jelas jenis & dicoba langsung', 'Tidak diketahui isi/jumlah/kondisinya'],
              ['Kejelasan Harga', 'Rp85.000 jelas', 'Rp30.000 jelas'],
              ['Kerelaan & Hak Tukar Cacat (Khiyar)', 'Ada uji coba; sepakat', 'Ditolak tukar meski barang cacat'],
            ],
          },
        },
        ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
        langkahAktivitas: [
          {
            langkahKe: 1,
            judulLangkah: 'Audit pemenuhan syarat jual beli pada Transaksi A dan B',
            instruksi: 'Isi pemeriksaan syarat penjual-pembeli berakal, objek halal/suci & diketahui jelas, harga disepakati, dan ijab qabul.',
            ruangJawabanJenis: 'tabel',
          },
          {
            langkahKe: 2,
            judulLangkah: 'Rumuskan solusi perbaikan agar Transaksi B bebas gharar',
            instruksi: 'Tuliskan dua syarat informasi yang wajib dicantumkan penjual di Transaksi B agar akad jual belinya menjadi sah.',
            ruangJawabanJenis: 'uraian_singkat',
          },
        ],
        pemeriksaanHasil: ['Pastikan alasanmu menyebut fakta spesifik kedua skenario, bukan sekadar menghafal rukun jual beli tanpa konteks.'],
        pertanyaanAnalisis: [
          {
            id: 'q-fk-1',
            nomor: 1,
            tingkatKognitif: 'Dasar',
            alasanTingkatKognitif: 'Membandingkan dua skenario konkret berdasarkan kriteria kejelasan objek transaksi.',
            ruangJawabanJenis: 'uraian_singkat',
            pertanyaan: 'Transaksi manakah yang memenuhi syarat jual beli sah? Sebutkan 2 alasannya dari fakta cerita!',
            panduanJawabanSingkat: 'Transaksi A sah karena objeknya jelas (1 kalkulator Rp85.000), pembeli dapat mengecek fungsinya, ada harga jelas, dan terjadi kesepakatan suka sama suka.',
          },
          {
            id: 'q-fk-2',
            nomor: 2,
            tingkatKognitif: 'Menengah',
            alasanTingkatKognitif: 'Mendiagnosis unsur gharar/ketidakjelasan pada kotak kejutan dan mengusulkan perbaikan akad.',
            ruangJawabanJenis: 'uraian_panjang',
            pertanyaan: 'Mengapa skenario Transaksi B berisiko mengandung gharar (ketidakjelasan yang merugikan), dan bagaimana cara memperbaikinya agar memenuhi ketentuan jual beli yang adil?',
            panduanJawabanSingkat: 'Karena jenis, jumlah, dan keadaan barang tidak diketahui sehingga berisiko merugikan pembeli (termasuk meniadakan khiyar aib bila rusak). Perbaikan: cantumkan daftar minimal isi/spesifikasi barang jelas serta garansi tukar bila cacat/tidak sesuai.',
          },
        ],
        dukunganTambahan: 'Dalam fikih muamalah, syarat objek jual beli antara lain: suci, bermanfaat, dimiliki penuh penjual, serta diketahui jelas sifat/ukuran/jumlahnya.',
        pengayaan: {
          instruksi: 'Pengayaan muamalah:',
          tugas: ['Jelaskan perbedaan antara "Khiyar Majelis" dan "Khiyar Aib" dengan mengambil contoh Transaksi A bila layar kalkulator baru disadari retak setelah di rumah.'],
        },
        kesimpulanRefleksi: [
          'Prinsip penting transaksi jual beli yang sehat adalah keterbukaan kondisi barang sehingga terhindar dari ...... dan menjaga hak ......',
          'Catatan untuk review guru: Bagian ketentuan akad atau khiyar mana di mata pelajaran madrasah Anda yang perlu ditekankan lagi?',
        ],
        panduanGuru: {
          kunciDanContohJawaban: [
            { nomor: 1, jawabanInti: 'Transaksi A sah; barang & harga jelas, bebas cek kondisi, ada ijab qabul sukarela.', langkahPenyelesaian: ['Bandingkan unsur syarat objek jelas pada A vs tidak jelas pada B.'] },
            { nomor: 2, jawabanInti: 'Transaksi B mengandung gharar dan meniadakan khiyar aib; perbaiki dengan membuka spesifikasi barang + jaminan retur bila cacat.', langkahPenyelesaian: ['Tunjukkan risiko kerugian salah satu pihak dan prinsip taradhin (suka sama suka berdasar info jelas).'] },
          ],
          miskonsepsiUmum: [
            {
              miskonsepsi: 'Mengira selama pembeli "mau bayar Rp30.000 berarti sah", tanpa menyadari syarat kejelasan objek (anti-gharar).',
              caraMenangani: 'Tanyakan apa yang terjadi jika kotak berisi barang rusak: transaksi menjadi sumber perselisihan, itulah sebabnya fikih mensyaratkan kejelasan barang.',
            },
          ],
          pemetaanTP: [
            { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Pemeriksaan syarat sah objek transaksi', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
            { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Identifikasi gharar & perbaikan akad', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
          ],
          rubrikPenilaian: [
            {
              aspek: 'Ketepatan analisis kasus muamalah',
              perluBimbingan: 'Tidak membedakan kejelasan barang pada Transaksi A vs kotak misteri B.',
              berkembang: 'Memilih A sebagai sah tetapi belum mampu merumuskan perbaikan spesifik untuk B.',
              cakap: 'Mengidentifikasi unsur gharar pada B dan menyarankan keterbukaan spesifikasi + hak khiyar.',
              mahir: 'Menjawab tepat semua soal disertai penerapan jenis khiyar majelis/aib pada contoh lanjutan.',
            },
          ],
          catatanKurikulum: 'Contoh kasus muamalah disusun oleh aplikasi; silakan tinjau penyesuaiannya dengan KMA / buku fikih madrasah yang digunakan.',
        },
      };
    }

    // Pendidikan Pancasila / PAI / Akidah Akhlak / SKI
    const stimulusText = isPancasila
      ? 'Situasi di Kelas: Menjelang kerja bakti kebun kelas, ketua kelas langsung memutuskan bahwa kelompok siswa laki-laki memikul pot berat sendirian sedangkan kelompok siswa perempuan membersihkan kaca, tanpa berdiskusi. Dua siswa mengeluh karena kondisi kesehatan salah satu siswa tidak memungkinkan mengangkat beban berat, dan mereka merasa tidak pernah diajak bermusyawarah untuk mencari cara berbagi tugas yang aman dan adil.'
      : 'Situasi di Grup Kelas: Beredar tangkapan layar yang menuduh salah satu pengurus OSIS mengambil uang kas tanpa bukti kwitansi atau penjelasan bendahara. Beberapa siswa langsung meneruskan pesan itu dengan komentar mengejek ke grup lain sebelum memeriksa kebenarannya.';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: 'Analisis Situasi Nilai, Penalaran Alasan & Penerapan Nyata',
      modeKerja: 'Berpasangan',
      alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
      targetBelajarSiswa: [
        'Mengidentifikasi hak/nilai atau norma yang terlanggar dalam situasi konkret sekolah.',
        'Merumuskan langkah penyelesaian adil berbasis alasan nilai dan penerapan sikap nyata.',
      ],
      prasyaratMateri: [isPancasila ? 'Mengenal makna sila ke-4 (musyawarah) & ke-5 (keadilan sosial) serta 4 norma dasar' : 'Mengenal prinsip kejujuran, tabayyun (verifikasi kabar), dan adab menjaga kehormatan teman'],
      petunjukPengerjaan: [
        'Gunakan fakta pada cerita situasi untuk menjawab alasan jawabanmu.',
        'Tuliskan solusi tindakan nyata yang menghormati semua pihak dan aman dilakukan.',
      ],
      stimulusKasus: {
        judul: isPancasila ? 'Dilema Pembagian Kerja Bakti & Musyawarah Kelas' : 'Menguji Kabar Grup Kelas Sebelum Menyebarkannya',
        teks: stimulusText,
        pertanyaanAwal: isPancasila
          ? 'Masalah keadilan dan prosedur musyawarah apa yang terlewat oleh ketua kelas?'
          : 'Mengapa meneruskan tuduhan tanpa verifikasi fakta bertentangan dengan adab jujur dan amanah?',
      },
      stimulusData: {
        jenisData: 'daftar_fakta',
        poinKunci: isPancasila
          ? ['Keputusan diambil sepihak tanpa diskusi', 'Kemampuan fisik individu tidak diperhitungkan']
          : ['Informasi masih berupa tuduhan tanpa bukti kwitansi/konfirmasi', 'Pesan diteruskan disertai ejekan (berpotensi fitnah/ghibah)'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Identifikasi pihak terdampak dan nilai yang diabaikan',
          instruksi: 'Catat siapa yang dirugikan dalam situasi tersebut serta prinsip Pancasila/norma atau adab akhlak yang dilanggar.',
          ruangJawabanJenis: 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Susun solusi tindakan yang adil dan dapat dijalankan di kelas',
          instruksi: isPancasila
            ? 'Rancang proses musyawarah singkat 5 menit dan pembagian tugas yang aman bagi kondisi fisik semua siswa.'
            : 'Susun 3 langkah konkret tabayyun sebelum menanggapi kabar yang beredar dan cara memulihkan ketertiban grup.',
          ruangJawabanJenis: 'uraian_panjang',
        },
      ],
      pemeriksaanHasil: ['Periksa apakah usulan solusimu melindungi hak/martabat pihak terkait dan menyelesaikan akar persoalan secara tertib.'],
      pertanyaanAnalisis: [
        {
          id: 'q-pa-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Mengidentifikasi prinsip yang dilanggar langsung dari rincian situasi sekolah.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: isPancasila
            ? 'Sila Pancasila dan nilai norma apa saja yang kurang tercermin pada keputusan sepihak ketua kelas di atas?'
            : 'Perilaku tercela apa saja yang muncul ketika siswa langsung menyebar tuduhan disertai ejekan tanpa konfirmasi?',
          panduanJawabanSingkat: isPancasila
            ? 'Sila ke-4 (mengabaikan musyawarah mufakat mendengarkan aspirasi anggota) dan sila ke-5 / norma kemanusiaan (pembagian beban tidak memperhatikan kesanggupan kesehatan anggota).'
            : 'Menyebar kabar tanpa tabayyun (potensi fitnah/hoaks) dan ghibah/menggunjing disertai ejekan.',
        },
        {
          id: 'q-pa-2',
          nomor: 2,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Mengevaluasi alternatif penyelesaian damai serta merumuskan dialog santun yang operasional.',
          ruangJawabanJenis: 'uraian_panjang',
          pertanyaan: isPancasila
            ? 'Tuliskan usulan pembagian tugas adil (mempertimbangkan kemampuan tanpa membedakan gender secara kaku) beserta contoh kalimat usulan santun dalam musyawarah kelas!'
            : 'Jika ternyata hasil pemeriksaan catatan kas bendahara menunjukkan uang kas aman atau hanya salah catat tanggal, tindakan etis apa yang wajib dilakukan penyebar kabar?',
          panduanJawabanSingkat: isPancasila
            ? 'Misalnya pot berat diangkat bersama berdua dengan troli/ember kecil bergantian sesuai kesanggupan, siswa yang kurang fit bertugas mencatat/menyiram ringan; disampaikan santun: "Bagaimana kalau kita bagi berdasar berat ringan alat dan kondisi teman agar aman bersama?".'
            : 'Mengakui kekeliruan secara terbuka di grup, menghapus/mengklarifikasi pesan lama dengan bukti catatan kas sah, serta meminta maaf langsung kepada pihak yang tertuduh.',
        },
      ],
      dukunganTambahan: isPancasila
        ? 'Adil tidak selalu berarti semua mendapat pekerjaan yang identik atau dikelompokkan berdasarkan stereotip gender, melainkan sesuai kesanggupan & kesepakatan.'
        : 'Tabayyun berarti mengecek bukti sumber langsung (bertanya pada pihak berwenang/bendahara dan melihat catatan) sebelum memercayai atau membagikan info.',
      pengayaan: {
        instruksi: 'Refleksi kesepakatan kelas:',
        tugas: [
          isPancasila
            ? 'Buat 1 kesepakatan tertulis tata cara musyawarah kelas apabila terjadi perbedaan usulan kegiatan.'
            : 'Buat 2 butir etika grup percakapan kelas agar terbebas dari kabar hoaks dan olok-olok.',
        ],
      },
      kesimpulanRefleksi: [
        isPancasila
          ? 'Keputusan kelas menjadi adil dan ditaati bersama apabila ditempuh lewat ...... dengan mempertimbangkan .......'
          : 'Langkah wajib sebelum meneruskan informasi di media sosial adalah ...... untuk mencegah .......',
        'Sikap apa yang menurutmu paling perlu dibiasakan di kelas kita mulai minggu ini?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: isPancasila ? 'Pengabaian musyawarah (Sila 4) & keadilan kondisi fisik (Sila 5).' : 'Ghibah, penyebaran hoaks tanpa tabayyun, dan merendahkan sesama.', langkahPenyelesaian: ['Kaitkan langsung dengan fakta kasus.'] },
          { nomor: 2, jawabanInti: isPancasila ? 'Solusi kerja berpasangan/alat bantu aman + kalimat usul santun.' : 'Klarifikasi terbuka dengan bukti bendahara & permintaan maaf.', langkahPenyelesaian: ['Nilai kelayakan dan kesantunan usulan siswa.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: isPancasila ? 'Mengira ketua kelas berhak mengatur semua tanpa diskusi atau membagi tugas berdasar anggapan "laki-laki selalu kuat / perempuan selalu ringan".' : 'Mengira "meneruskan saja tanpa menulis tuduhan baru" bebas dari tanggung jawab moral.',
            caraMenangani: 'Diskusikan konsekuensi keselamatan kerja serta tanggung jawab ikut menyebarkan berita yang belum jelas.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi pelanggaran nilai/adab', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Merumuskan tindakan penerapan nyata', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Penalaran alasan & kualitas tindakan nyata',
            perluBimbingan: 'Hanya menulis "tidak baik" tanpa menyebut prinsip dan solusi konkret.',
            berkembang: 'Menyebut nilai yang dilanggar tetapi usulan solusi masih menghakimi atau tidak realistis.',
            cakap: 'Mengaitkan kasus ke nilai/norma secara tepat dan mengusulkan tindakan santun yang aman.',
            mahir: 'Menunjukkan empati, menghindarkan stereotip, dan menulis langkah klarifikasi/musyawarah secara spesifik.',
          },
        ],
        catatanKurikulum: tp.referensiCP?.catatan,
      },
    };
  }

  // =========================================================================
  // 4. INFORMATIKA & PKK / KEJURUAN
  // =========================================================================
  if (family === 'informatika_kejuruan') {
    const isPKK = lowerMapel.includes('pkk') || lowerMapel.includes('kewirausahaan');
    const stimulusText = isPKK
      ? 'Perhatikan hasil inspeksi kondisi ruang praktik bengkel sebelum produksi:\n(1) Kabel ekstensi listrik melintang di lantai jalur lewat tanpa penutup kabel.\n(2) Botol cairan pembersih mudah menguap diletakkan tanpa label tutup dekat gerinda.\n(3) Siswa menggerinda besi tanpa memakai kacamata pelindung (safety goggles).\n(4) Alat ukur dan kunci pas berserakan tercampur di meja kerja.\nAudit pelanggaran K3LH serta prinsip 5R dari keempat temuan di atas dan tetapkan tindakan koreksinya!'
      : 'Perhatikan potongan algoritma penentuan kelulusan nilai rapor (KKTP = 75) berikut:\n1. Baca input nilai\n2. JIKA nilai > 75 MAKA status = "Tuntas"\n3. SELAIN ITU status = "Perlu Bimbingan"\n4. Cetak status\nGuru menetapkan aturan: siswa dengan nilai TEPAT 75 atau lebih dinyatakan "Tuntas". Lakukan penelusuran (trace) untuk input 60, 75, dan 88 lalu temukan kesalahan logika (bug) pada baris nomor 2!';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: isPKK
        ? 'Audit Keselamatan K3LH & Budaya Kerja 5R'
        : 'Penelusuran Algoritma (Trace) & Perbaikan Bug Kondisi Batas',
      modeKerja: 'Berpasangan',
      alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
      targetBelajarSiswa: isPKK
        ? ['Mengidentifikasi bahaya mekanik/listrik/kimia serta pelanggaran 5R dari daftar kondisi bengkel.', 'Menetapkan alat pelindung diri (APD) dan penataan aman yang wajib dilakukan.']
        : ['Menjalankan tabel penelusuran (dry-run trace) pada beberapa input uji termasuk nilai batas.', 'Memperbaiki kondisi pertidaksamaan logika (bug) agar algoritma memenuhi aturan yang diminta.'],
      prasyaratMateri: isPKK ? ['Mengenal prinsip dasar 5R dan APD bengkel'] : ['Memahami operator perbandingan > dan >= pada bilangan bulat'],
      petunjukPengerjaan: [
        isPKK
          ? 'Petakan setiap temuan (1)–(4) dengan potensi risikonya dan jenis perbaikan konkret.'
          : 'Jalankan baris demi baris algoritma tepat sesuai bunyi kode saat ini (jangan menebak maksud pemrogram sebelum bagian debug).',
      ],
      stimulusKasus: {
        judul: isPKK ? 'Laporan Inspeksi Ruang Praktik Sebelum Kerja' : 'Audit Logika Pseudocode Penentu Ketuntasan Nilai',
        teks: stimulusText,
        pertanyaanAwal: isPKK
          ? 'Temuan mana yang berisiko paling cepat memicu cedera mata atau kebakaran?'
          : 'Apa hasil cetak algoritma saat nilai = 75 menurut kode baris 2 saat ini?',
      },
      stimulusData: {
        jenisData: 'algoritma',
        tabelData: isPKK
          ? {
              kolom: ['Temuan', 'Jenis Bahaya / Pelanggaran', 'Tindakan Koreksi / APD'],
              baris: [
                ['(1) Kabel di jalur lewat', 'Tersandung / korsleting', '.......................'],
                ['(2) Cairan kimia dekat gerinda', 'Percikan api -> kebakaran', '.......................'],
                ['(3) Menggerinda tanpa goggles', 'Serpihan besi ke mata', '.......................'],
                ['(4) Kunci pas berserakan', 'Prinsip Rapi / Ringkas (5R)', '.......................'],
              ],
            }
          : {
              kolom: ['Input Uji (nilai)', 'Hasil Kondisi `nilai > 75`', 'Keluaran Kode Saat Ini', 'Seharusnya Menurut Aturan (>=75)'],
              baris: [
                ['60', 'Salah (False)', 'Perlu Bimbingan', 'Perlu Bimbingan'],
                ['75', '.......................', '.......................', 'Tuntas'],
                ['88', 'Benar (True)', 'Tuntas', 'Tuntas'],
              ],
            },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: isPKK ? 'Klasifikasi bahaya K3LH dan ketidaksesuaian 5R' : 'Lengkapi tabel trace input uji [60, 75, 88]',
          instruksi: isPKK
            ? 'Hubungkan setiap nomor temuan (1)–(4) dengan risiko kecelakaan/pemborosan waktunya.'
            : 'Evaluasi ekspresi `nilai > 75` secara harfiah untuk nilai 60, 75, dan 88 lalu catat hasilnya.',
          ruangJawabanJenis: 'tabel',
        },
        {
          langkahKe: 2,
          judulLangkah: isPKK ? 'Susun daftar periksa APD & perbaikan ruang sebelum mesin dinyalakan' : 'Perbaiki baris ke-2 kode dan uji ulang nilai batas [74, 75, 76]',
          instruksi: isPKK
            ? 'Tuliskan langkah koreksi aman untuk keempat temuan secara berurutan.'
            : 'Ubah operator pada baris ke-2 agar aturan "tepat 75 atau lebih = Tuntas" terpenuhi dan buktikan hasil ujinya.',
          ruangJawabanJenis: 'langkah_algoritma',
        },
      ],
      pemeriksaanHasil: [
        isPKK
          ? 'Pastikan semua bahan mudah terbakar dijauhkan dari area percikan api dan seluruh pengguna gerinda memakai pelindung mata.'
          : 'Verifikasi hasil kode perbaikan pada batas kritis: input 74 -> "Perlu Bimbingan", input 75 -> "Tuntas", input 76 -> "Tuntas".',
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-inf-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: isPKK ? 'Mencocokkan pelanggaran temuan ke bahaya kerja terkait.' : 'Menelusuri input batas 75 pada percabangan > secara harfiah.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: isPKK
            ? 'Alat pelindung diri apa yang wajib dipakai pada Temuan (3), dan mengapa Temuan (2) sangat berbahaya didekatkan dengan mesin gerinda?'
            : 'Untuk input nilai = 75, apakah pernyataan `75 > 75` bernilai Benar atau Salah? Apa keluaran yang dicetak algoritma awal?',
          panduanJawabanSingkat: isPKK
            ? 'Wajib memakai kacamata pelindung (safety goggles/face shield); gerinda menghasilkan percikan bunga api panas yang dapat menyulut uap cairan pembersih mudah menguap.'
            : '75 > 75 bernilai Salah (False), sehingga algoritma mencetak "Perlu Bimbingan" (keliru terhadap aturan minimal 75 tuntas).',
        },
        {
          id: 'q-inf-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Memperbaiki bug kondisi batas (off-by-one/strict inequality) dan memvalidasi dengan boundary test cases.',
          ruangJawabanJenis: 'langkah_algoritma',
          pertanyaan: isPKK
            ? 'Susun kembali daftar langkah 5R singkat untuk memperbaiki Temuan (4) agar alat ukur akurat tetap terawat dan cepat ditemukan!'
            : 'Tuliskan perbaikan lengkap baris ke-2 kode di atas, lalu uji apa yang dicetak bila diuji tiga angka batas: 74, 75, dan 76!',
          panduanJawabanSingkat: isPKK
            ? 'Ringkas (pilah alat rusak/tak terpakai), Rapi (simpan kunci pas di shadow board berlabel, pisahkan alat ukur presisi di kotak beralas busa), Resik (bersihkan oli/debu gram), Rawat & Rajin (biasakan mengembalikan setelah pakai).'
            : 'Perbaikan: `JIKA nilai >= 75 MAKA status = "Tuntas"`. Uji batas: 74 -> "Perlu Bimbingan", 75 -> "Tuntas", 76 -> "Tuntas".',
        },
      ],
      dukunganTambahan: isPKK
        ? 'Selalu bedakan pengamanan sumber bahaya langsung (listrik/api/mata) dari penataan alat (5R).'
        : 'Perbedaan `>` ("lebih besar dari", 75 tidak masuk) vs `>=` ("lebih besar dari atau sama dengan", 75 ikut masuk).',
      pengayaan: {
        instruksi: 'Pengayaan lanjutan:',
        tugas: [
          isPKK
            ? 'Tambahkan 1 poin SOP larangan pakaian longgar/perhiasan menjuntai saat mengoperasikan mesin putar dan jelaskan alasannya.'
            : 'Tambahkan validasi jika pengguna salah mengetik input kurang dari 0 atau lebih dari 100 agar mencetak "Nilai tidak valid".',
        ],
      },
      kesimpulanRefleksi: [
        isPKK
          ? 'Inspeksi K3LH wajib dilakukan ...... menyalakan mesin kerja.'
          : 'Pengujian pada nilai tepat batas (boundary test) seperti angka ...... berhasil menemukan bug operator `>` yang seharusnya `>=`.',
        'Kesalahan mana yang perlu kamu periksa lebih teliti ke depan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: isPKK ? 'Goggles + bahaya sulutan percikan api ke uap mudah terbakar.' : '75 > 75 bernilai False -> tercetak "Perlu Bimbingan" (Bug).', langkahPenyelesaian: ['Trace kondisi batas 75.'] },
          { nomor: 2, jawabanInti: isPKK ? 'Penataan 5R dengan shadow board & kotak alat presisi.' : 'Ganti menjadi `nilai >= 75`; hasil: 74=Perlu Bimbingan, 75=Tuntas, 76=Tuntas.', langkahPenyelesaian: ['Verifikasi boundary values 74, 75, 76.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: isPKK ? 'Menganggap sarung tangan kain cukup melindungi mata atau menaruh cairan kimia tertutup rapat aman dekat gerinda.' : 'Hanya menguji angka acak tengah (misal 60 dan 88) sehingga bug tepat di nilai batas `75` lolos tidak terdeteksi.',
            caraMenangani: 'Tekankan aturan boundary testing: uji selalu nilai tepat di ambang batas (n−1, n, n+1).',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: isPKK ? 'Audit K3LH' : 'Trace langkah algoritma', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: isPKK ? 'Perbaikan 5R & SOP' : 'Debugging syarat batas >=', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: isPKK ? 'Ketepatan audit K3LH & perbaikan 5R' : 'Ketepatan trace & debugging kondisi batas',
            perluBimbingan: isPKK ? 'Melewatkan risiko api atau tidak mencantumkan pelindung mata.' : 'Mengira 75 > 75 menghasilkan "Tuntas".',
            berkembang: isPKK ? 'Mengidentifikasi bahaya tetapi saran 5R masih umum.' : 'Menemukan bug pada 75 tetapi tidak membuktikannya lewat uji 74, 75, 76.',
            cakap: isPKK ? 'Seluruh 4 temuan diberi bahaya tepat, APD wajib, & perbaikan konkret.' : 'Memperbaiki ke `>= 75` dan membuktikan keluaran akurat pada 74, 75, 76.',
            mahir: isPKK ? 'Juga melengkapi prosedur tambahan mesin putar & penjadwalan perawatan.' : 'Juga menambahkan validasi rentang input [0..100] tanpa merusak logika kelulusan.',
          },
        ],
      },
    };
  }

  // =========================================================================
  // 5. SENI BUDAYA & PJOK
  // =========================================================================
  if (family === 'seni_pjok') {
    const isPJOK = lowerMapel.includes('pjok') || lowerMapel.includes('jasmani') || lowerMapel.includes('olahraga');
    const lowerMateri = tp.materiPokok.toLowerCase();
    const matchesCuratedSeniPJOK =
      isPJOK
        ? /(kebugaran|denyut|lari|shuttle|atletik|permainan|bola|senam|gerak|aktivitas|kesehatan)/i.test(lowerMateri)
        : /(ragam hias|3r|daur ulang|tempat pensil|kerajinan|nirmana|musik|melodi|tari|teater|kemasan)/i.test(lowerMateri);
    if (!matchesCuratedSeniPJOK) {
      return null;
    }
    const stimulusText = isPJOK
      ? 'Sebelum mempraktikkan lari bolak-balik (shuttle run) ringan di lapangan datar bebas batu, siswa memeriksa denyut nadi istirahat selama 15 detik dan memperoleh 18 denyut. Setelah pemanasan 5 menit dan latihan lari ringan 3 menit, pengukuran 15 detik mencatat 34 denyut. Gunakan aturan 1 menit = 60 detik (nadi per menit = hitungan 15 detik × 4) untuk memantau respons kebugaran tubuh dan langkah keselamatan latihan!'
      : 'Kelompok siswa merancang tempat pensil meja dari kaleng bekas susu bersih atau botol plastik kokoh berprinsip 3R. Ukuran tinggi alas disepakati 11 cm dan diameter 7 cm. Alat pemotong yang tersedia di meja hanya gunting seng/cutter. Sebelum memotong dan melilit tali rami/kertas hias, susun prosedur keselamatan kerja (menutup tepi tajam kaleng) serta rencana motif pola geometris/flora!';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: isPJOK
        ? 'Pengukuran Kinerja Tubuh, Praktik Aman & Refleksi Kebugaran'
        : 'Observasi Unsur Karya, Keselamatan Alat & Rencana Penciptaan',
      modeKerja: 'Berpasangan',
      alokasiWaktu: `${grade.defaultDurationMinutes} Menit`,
      targetBelajarSiswa: isPJOK
        ? ['Menghitung denyut nadi istirahat dan pascaaktivitas (bpm) dengan tepat.', 'Menjelaskan urutan pemanasan, pemeriksaan lapangan, serta pendinginan demi keselamatan sendi dan jantung.']
        : ['Menentukan ukuran, alat aman, serta langkah pengamanan tepi tajam saat berkarya dari bahan daur ulang.', 'Menyusun sketsa pola motif teratur sebelum proses perakitan.'],
      prasyaratMateri: isPJOK ? ['Perkalian × 4 sederhana dan teknik meraba nadi pergelangan/leher lembut'] : ['Penggunaan penggaris cm dan pemahaman prinsip 3R'],
      petunjukPengerjaan: [
        isPJOK
          ? 'PENTING: Lakukan pemanasan dinamis & cek permukaan lapangan kering rata sebelum berlari; hentikan aktivitas segera bila merasa pusing.'
          : 'KESELAMATAN ALAT: Gunakan alas potong rata, arahkan mata pisau cutter menjauhi jari, dan lapisi tepi kaleng/botol dengan selotip kain sebelum menghias.',
      ],
      stimulusKasus: {
        judul: isPJOK ? 'Data Pemantauan Denyut Nadi Pra dan Pasca Latihan' : 'Perencanaan Karya 3R Aman & Bermotif Teratur',
        teks: stimulusText,
        pertanyaanAwal: isPJOK
          ? 'Berapa kali lipat kenaikan denyut nadi siswa dari kondisi istirahat menuju selesai lari ringan?'
          : 'Bagian bahan manakah yang paling berisiko melukai tangan jika tidak dilindungi sejak awal?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: isPJOK
          ? {
              kolom: ['Kondisi Pengukuran', 'Hitungan 15 Detik', 'Rumus × 4', 'Denyut Nadi (bpm)'],
              baris: [
                ['Istirahat (Sebelum Pemanasan)', '18 denyut', '18 × 4', '.......................'],
                ['Pasca Lari Ringan 3 Menit', '34 denyut', '34 × 4', '.......................'],
              ],
            }
          : {
              kolom: ['Tahap Berkarya', 'Alat & Ukuran', 'Aturan Keselamatan Wajib'],
              baris: [
                ['1. Pengukuran & Pemotongan', 'Penggaris (11 cm × Ø 7 cm), cutter/gunting', 'Potong di atas alas talenan; jauhkan jari tangan'],
                ['2. Pengamanan Tepi Wadah', 'Isolasi kertas/kain & amplas halus', 'Tutup penuh bibir potongan supaya tidak tajam'],
                ['3. Sketsa & Hiasan Pola', 'Pensil, lem PVA, motif berulang', 'Jarak antarmotif simetris & bersih dari ceceran lem'],
              ],
            },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: isPJOK ? 'Cek keselamatan lapangan & hitung bpm istirahat dan latihan' : 'Tentukan ukuran, motif, dan checklist K3 alat',
          instruksi: isPJOK
            ? 'Kalikan hitungan 15 detik dengan 4 untuk mendapatkan bpm istirahat serta pasca latihan, lalu tulis checklist keamanan sepatu & lantai.'
            : 'Catat ukuran wadah dan dua langkah pengamanan cutter serta penutupan bibir wadah tajam sebelum merakit.',
          ruangJawabanJenis: isPJOK ? 'perhitungan' : 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: isPJOK ? 'Jelaskan fungsi pemanasan & pendinginan setelah denyut mencapai 136 bpm' : 'Buat rencana pola pengulangan motif & uji kelayakan karya',
          instruksi: isPJOK
            ? 'Mengapa setelah mencatat 136 bpm siswa tidak boleh langsung duduk diam mendadak, melainkan berjalan santai (pendinginan)?'
            : 'Gambar skema pola motif (misalnya keliling 22 cm dibagi 4 motif simetris berjarak 5,5 cm) lalu uji apakah pensil berdiri stabil tanpa terguling.',
          ruangJawabanJenis: 'uraian_panjang',
        },
      ],
      pemeriksaanHasil: [
        isPJOK ? 'Verifikasi: 18 × 4 = 72 bpm; 34 × 4 = 136 bpm (selisih naik 64 bpm).' : 'Pastikan keliling tabung diameter 7 cm (≈ 22 cm) sesuai ruang tempel motif dan tidak ada tepi tajam terasa saat disentuh.',
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-sp-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: isPJOK ? 'Menghitung bpm 15 detik × 4 dan selisih kenaikannya.' : 'Mengidentifikasi langkah keselamatan fisik wajib dari skenario berkarya.',
          ruangJawabanJenis: isPJOK ? 'perhitungan' : 'uraian_singkat',
          pertanyaan: isPJOK
            ? 'Berapakah denyut nadi siswa per menit (bpm) sebelum dan sesudah latihan, serta berapa kenaikannya?'
            : 'Sebutkan dua langkah keselamatan wajib saat memotong kaleng/botol plastik agar tangan pembuat maupun pengguna tempat pensil tidak terluka!',
          panduanJawabanSingkat: isPJOK
            ? 'Istirahat = 18 × 4 = 72 bpm; Pasca latihan = 34 × 4 = 136 bpm; Kenaikan = 136 − 72 = 64 bpm.'
            : '(1) Memotong di atas alas rata dengan arah mata pisau menjauh dari tangan penahan; (2) Melipat/melapisi seluruh bibir potongan kaleng dengan selotip kain atau lilitan tali kuat sehingga tidak tajam.',
        },
        {
          id: 'q-sp-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: isPJOK ? 'Menjelaskan mekanisme fisiologis penyesuaian otot dan aliran darah pascaolahraga.' : 'Menentukan simetri/proporsi ukuran dan cara menguji kekuatan karya.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: isPJOK
            ? 'Mengapa melakukan pemanasan dinamis sebelum shuttle run dan pendinginan jalan santai sesudahnya wajib dilakukan demi keselamatan tubuh?'
            : 'Jika keliling permukaan luar wadah ±22 cm dan kamu ingin membuat 4 motif bunga yang berjarak sama rata mengelilingi wadah, setiap berapa cm titik tengah motif tersebut harus digambar?',
          panduanJawabanSingkat: isPJOK
            ? 'Pemanasan menaikkan suhu otot dan kelenturan sendi sehingga mencegah kram/keseleo saat berbalik arah cepat; pendinginan menurunkan detak jantung bertahap agar aliran darah tidak tertahan mendadak dan mencegah pusing.'
            : '22 cm : 4 = 5,5 cm setiap jarak antarmotif sehingga pola tampak seimbang.',
        },
      ],
      dukunganTambahan: isPJOK
        ? 'Jangan menekan arteri leher terlalu keras saat menghitung nadi; cukup sentuh lembut dengan jari telunjuk dan jari tengah.'
        : 'Gunakan penggaris fleksibel atau seutas pita kertas melingkari wadah untuk membagi 4 jarak sama persis sebelum menggambar.',
      pengayaan: {
        instruksi: 'Aktivitas penguatan:',
        tugas: [
          isPJOK
            ? 'Catat denyut nadi milikmu sendiri setelah berjalan santai 2 menit dan istirahat 3 menit untuk melihat kecepatan pemulihan jantungmu.'
            : 'Tuliskan label kurasi mini untuk karyamu: Judul Karya, Bahan Utama 3R, Teknik Pembuatannya, dan Saran Perbaikan Finishing.',
        ],
      },
      kesimpulanRefleksi: [
        isPJOK
          ? 'Denyut nadi istirahatku ...... bpm dan setelah aktivitas ringan meningkat menjadi ...... bpm; prosedur aman wajibku adalah .......'
          : 'Karya kerajinan yang baik memadukan kerapian motif ...... dengan keamanan pemakaian (bebas tepi ...... dan kokoh berdiri).',
        'Bagian praktik atau keselamatan mana yang paling perlu diperhatikan saat pelaksanaan di kelas?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: isPJOK ? '72 bpm -> 136 bpm (naik 64 bpm).' : 'Alas potong aman + penutupan bibir tajam wadah.', langkahPenyelesaian: ['Cek perkalian × 4 dan prosedur keselamatan alat tajam.'] },
          { nomor: 2, jawabanInti: isPJOK ? 'Pemanasan cegah cedera otot/sendi; pendinginan normalkan jantung bertahap.' : '22 / 4 = 5,5 cm jarak antartitik tengah motif.', langkahPenyelesaian: ['Evaluasi kelogisan mekanik tubuh / pembagian simetris.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: isPJOK ? 'Mengalikan hitungan 15 detik dengan 6 atau 10 sehingga bpm meleset jauh, atau langsung duduk setelah lari sprint.' : 'Memotong bahan tanpa menutup pinggiran tajam dulu sehingga membahayakan siswa.',
            caraMenangani: 'Pastikan guru memeriksa tanda penutupan tepi tajam atau kondisi sepatu + lapangan sebelum izin praktik diberikan.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: isPJOK ? 'Hitung bpm & cek aman lapangan' : 'Cek keselamatan alat & bahan', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: isPJOK ? 'Alasan pemanasan–pendinginan' : 'Proporsi pola & uji kelayakan', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: isPJOK ? 'Akurasi pengukuran kebugaran & kepatuhan keselamatan' : 'Keselamatan alat, proporsi motif & ketelitian konstruksi',
            perluBimbingan: isPJOK ? 'Salah menghitung bpm × 4 dan tidak melakukan pemanasan/pendinginan.' : 'Menggunakan alat potong tidak aman dan mengabaikan penutupan tepi tajam.',
            berkembang: isPJOK ? 'Hitungan bpm tepat tetapi penjelasan keselamatan masih singkat.' : 'Prosedur K3 baik, namun pembagian simetri jarak motif belum merata.',
            cakap: isPJOK ? 'Tepat menghitung 72 & 136 bpm serta menjelaskan fungsi pemanasan dan pendinginan.' : 'Mematuhi K3, menutup tepi tajam rapi, dan menghitung jarak simetri 5,5 cm dengan tepat.',
            mahir: isPJOK ? 'Mencatat data pemulihan pribadi akurat serta menjaga sikap sportif bersama pasangan.' : 'Hasil karya stabil fungsional lengkap dengan label kurasi dan ulasan perbaikan teknis.',
          },
        ],
      },
    };
  }

  return null;
}
