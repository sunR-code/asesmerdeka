import type { RangkumanRequest, RangkumanDokumen } from '../../types/summary';
import { getJenjangLabel, isSDGrade, isSMPGrade } from './helpers';

// ============================================================================
// 1. ENGINE KHUSUS BAHASA INGGRIS (SD vs SMP vs SMA/SMK)
// ============================================================================
export function buildEnglishTopicRangkuman(
  req: RangkumanRequest,
  rawTopik: string,
  lowerTopik: string,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const jenjangLabel = getJenjangLabel(req);
  const isSD = isSDGrade(req);
  const isSMP = isSMPGrade(req);

  // A. KHUSUS JENJANG SD (Kelas 1-6): Vocabulary, Simple Expressions, Daily Sentences
  if (isSD) {
    const isClassroom = lowerTopik.includes('classroom') || lowerTopik.includes('color') || lowerTopik.includes('benda');
    const isDailyTime = lowerTopik.includes('daily') || lowerTopik.includes('time') || lowerTopik.includes('jam') || lowerTopik.includes('activit');
    const isFood = lowerTopik.includes('food') || lowerTopik.includes('drink') || lowerTopik.includes('makanan');

    return {
      id,
      createdAt,
      judul: `🇬🇧 Fun English Summary: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
      mataPelajaran: req.mataPelajaran,
      jenjangFase: req.jenjangFase,
      kelas: req.kelas,
      topik: rawTopik,
      sumberAsal: req.modeInput,
      gayaBahasa: req.gayaBahasa,
      ringkasanSatuKalimat: `Belajar kosakata (vocabulary) dan kalimat percakapan sederhana Bahasa Inggris tentang "${rawTopik}" dengan cara seru dan mudah diingat!`,
      petaKonsep: [
        '1. Key Vocabulary (Kata Benda & Kata Sifat Penting)',
        '2. Simple Sentence Pattern (Pola Kalimat Dasar)',
        '3. Short Conversation / Reading Example (Contoh Bacaan Pendek)',
        '4. Fun Practice & Pronunciation (Latihan & Pengucapan)',
      ],
      rumusAtauPola: [
        {
          label: 'Pola Kalimat Tunjuk (Singular / Tunggal)',
          isi: 'This is a ... / That is a ... (Contoh: This is a blue pencil case). Gunakan "an" sebelum bunyi vokal a, i, u, e, o (an apple, an eraser).',
        },
        {
          label: 'Pola Kalimat Jamak (Plural / Lebih dari Satu)',
          isi: 'There are + [Number] + [Noun+s] (Contoh: There are three books on the desk).',
        },
        {
          label: 'Pola Kalimat Tanya-Jawab Sederhana',
          isi: isDailyTime
            ? 'Q: What time do you get up? → A: I get up at five o’clock (05.00).'
            : isFood
            ? 'Q: What is your favorite food? → A: My favorite food is fried rice.'
            : 'Q: What is this? → A: It is a whiteboard. | Q: What color is your bag? → A: My bag is red.',
        },
      ],
      poinUtama: [
        {
          judul: `1. Kosakata Utama (Core Vocabulary: ${rawTopik})`,
          penjelasan:
            'Langkah pertama mahir Bahasa Inggris di bangku SD adalah menghafal kosakata benda, warna, angka, atau aktivitas yang paling sering kita lihat di sekitar kita.',
          analogi: 'Kosakata itu seperti balok LEGO—kalau kita punya banyak balok, kita bisa menyusun kalimat apa saja dengan mudah!',
          poinKunci: isClassroom
            ? [
                'Benda Kelas (Classroom Objects): Book (buku), Pencil (pensil), Eraser (penghapus), Ruler (penggaris), Chair (kursi), Desk (meja), Whiteboard (papan tulis).',
                'Warna (Colors): Red (merah), Blue (biru), Green (hijau), Yellow (kuning), Black (hitam), White (putih).',
                'Kata Sifat Ukuran: Big (besar), Small (kecil), Clean (bersih), Neat (rapi).',
              ]
            : isDailyTime
            ? [
                'Aktivitas Harian (Daily Activities): Wake up / Get up (bangun tidur), Take a bath (mandi), Have breakfast (sarapan), Go to school (pergi ke sekolah), Study (belajar).',
                'Membaca Jam (Telling Time): O’clock (tepat, misal 07.00 = seven o’clock), Half past (lewat 30 menit, misal 06.30 = half past six).',
                'Keterangan Waktu: In the morning (pagi hari), In the afternoon (siang/sore hari), At night (malam hari).',
              ]
            : [
                'Kosakata Inti: Mengenal nama benda, tempat, makanan, atau anggota keluarga dalam Bahasa Inggris beserta artinya.',
                'Perhatikan cara penulisan (spelling) dan cara pengucapannya (pronunciation) dengan lantang.',
                'Pasangkan kata sifat di depan kata benda, misalnya: "a big bag" (tas besar), "sweet milk" (susu manis).',
              ],
        },
        {
          judul: '2. Cara Menyusun Kalimat Sederhana (Simple Sentences)',
          penjelasan:
            'Untuk membuat kalimat Bahasa Inggris yang benar, kita menggabungkan Subjek (Subject) + Kata Kerja/To Be (am, is, are) + Keterangan.',
          analogi: 'Ingat pasangan sahabat sejati: "I" temannya "am", "He/She/It" temannya "is", dan "You/We/They" temannya "are"!',
          poinKunci: [
            'I am a student. (Saya adalah seorang murid).',
            'She is my best friend. / It is a clean classroom. (Itu adalah ruang kelas yang bersih).',
            'They are happy students. (Mereka adalah murid-murid yang gembira).',
          ],
        },
        {
          judul: '3. Mengungkapkan Kesukaan & Kebiasaan (Likes & Daily Habits)',
          penjelasan:
            'Kita menggunakan kata kerja bentuk pertama (Verb 1) untuk menceritakan hal yang kita sukai atau kegiatan yang kita lakukan setiap hari.',
          poinKunci: [
            'Untuk I / You / We / They: gunakan Verb dasar (Contoh: I like ice cream. We go to school by bicycle).',
            'Untuk He / She / Nama 1 Orang: tambahkan -s/-es pada kata kerja (Contoh: Budi likes fried chicken. She goes to school at six o’clock).',
          ],
        },
      ],
      contohKonkret: {
        judulContoh: `Contoh Teks & Dialog Sederhana SD: "${rawTopik}"`,
        teksContoh: isDailyTime
          ? `[Short Reading: Rina's Morning Routine]\nHello! My name is Rina. I am a fourth-grade student.\nEvery morning, I get up at five o'clock. First, I make my bed and take a bath. At six o'clock, I have breakfast with my family. I eat bread and drink a glass of warm milk. Then, I go to school at half past six. I love studying at school with my friends!`
          : `[Short Reading: My Clean Classroom]\nHello friends! Look at my classroom. My classroom is big and very clean.\nThere is one large whiteboard at the front. There are twenty desks and forty chairs for the students. On my desk, I have two books, a blue pencil case, and a yellow ruler. We always clean our classroom together every day.`,
        bedahAnalisis: [
          '✅ Kalimat Pendek & Jelas: Menggunakan kosakata sehari-hari yang dekat dengan dunia anak SD (classroom, book, get up, breakfast).',
          '✅ Penggunaan "To Be" & Angka: Menunjukkan perbedaan benda tunggal ("There is one whiteboard") dan benda jamak ("There are twenty desks").',
          '✅ Pesan Karakter Positif: Membiasakan hidup bersih, disiplin waktu, dan semangat belajar.',
        ],
      },
      tipsUjian: [
        '🎯 Perhatikan perbedaan "There is" (untuk 1 benda tunggal) dan "There are" (untuk benda jamak lebih dari satu, biasanya diakhiri huruf -s).',
        '🎯 Gunakan artikel "an" jika kata berikutnya diawali bunyi huruf hidup/vokal (an apple, an umbrella, an eraser, an orange).',
        '🎯 Jika subjeknya 1 orang (He, She, Andi, Siti), jangan lupa tambahkan akhiran -s/-es pada kata kerjanya (Siti reads a book).',
      ],
      faktaMenarik: [
        'Tahukah Kamu? Menghafal 5 kosakata baru Bahasa Inggris setiap pagi sambil menunjuk bendanya langsung di kamar atau kelas akan membuatmu cepat lancar berbicara!',
      ],
      glosarium: [
        { istilah: 'Singular (Tunggal)', makna: 'Benda yang jumlahnya hanya satu (menggunakan a / an / is).' },
        { istilah: 'Plural (Jamak)', makna: 'Benda yang jumlahnya lebih dari satu (menggunakan are dan akhiran -s).' },
        { istilah: 'Adjective (Kata Sifat)', makna: 'Kata yang menerangkan warna, ukuran, atau sifat benda (big, clean, red, happy).' },
        { istilah: 'Daily Routine', makna: 'Kegiatan kebiasaan yang dilakukan sehari-hari dari bangun tidur hingga malam.' },
      ],
      kuisKilat: [
        {
          nomor: 1,
          pertanyaan: 'Manakah yang benar: "There (is / are) three pencils in my bag"?',
          jawaban: '"There ARE three pencils in my bag" karena jumlah pensilnya ada tiga (jamak/plural).',
        },
        {
          nomor: 2,
          pertanyaan: 'Apa bahasa Inggrisnya "Sebuah penghapus" dan mengapa memakai "an"?',
          jawaban: '"An eraser", memakai "an" karena kata "eraser" diawali bunyi vokal (e).',
        },
        {
          nomor: 3,
          pertanyaan: 'Ubahlah ke Bahasa Inggris: "Budi pergi ke sekolah pukul 06.30"!',
          jawaban: '"Budi goes to school at half past six."',
        },
      ],
      pesanInspirasi:
        'Practice makes perfect! Jangan takut salah saat mencoba berbicara Bahasa Inggris bersama teman dan Bapak/Ibu Guru ya! 🌟',
    };
  }

  // B. SUB-CABANG: DESCRIPTIVE TEXT (SMP vs SMA/SMK)
  if (lowerTopik.includes('descriptive') || lowerTopik.includes('deskripsi')) {
    return {
      id,
      createdAt,
      judul: `🇬🇧 Mastering Descriptive Text: Struktur, Kaidah Bahasa & Contoh Model (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
      mataPelajaran: req.mataPelajaran,
      jenjangFase: req.jenjangFase,
      kelas: req.kelas,
      topik: rawTopik,
      sumberAsal: req.modeInput,
      gayaBahasa: req.gayaBahasa,
      ringkasanSatuKalimat:
        'Descriptive Text adalah teks Bahasa Inggris yang bertujuan menggambarkan satu objek spesifik (orang, hewan kesayangan, tempat wisata, atau fasilitas sekolah) secara rinci sehingga pembaca seolah-olah melihatnya langsung.',
      petaKonsep: [
        '1. Social Function (To Describe a Specific Object)',
        '2. Generic Structure (Identification & Description)',
        '3. Language Features (Simple Present, Adjectives, Noun Phrases)',
        '4. Model Text & Structural Analysis',
      ],
      rumusAtauPola: [
        {
          label: 'Social Function (Tujuan Komunikatif)',
          isi: 'To describe a particular person, animal, place, or thing specifically (Mendeskripsikan satu objek khusus, bukan kategori umum).',
        },
        {
          label: 'Generic Structure (Struktur Teks)',
          isi: '1) Identification (Paragraf 1: Memperkenalkan nama objek, lokasi, atau identitas umum) → 2) Description (Paragraf 2 dst.: Merinci bagian-bagian, ciri fisik, sifat, dan keunikan objek).',
        },
        {
          label: 'Rumus Simple Present Tense (Tense Utama)',
          isi: 'Nominal: Subject + am/is/are + Adjective/Noun (e.g., The library is very quiet) | Verbal: Subject + Verb 1 (s/es) + Object (e.g., It has two floors and bright windows).',
        },
        {
          label: 'Urutan Kata Sifat / Adjective Order (OSASCOMP)',
          isi: 'Opinion (beautiful) - Size (large) - Age (ancient) - Shape (round) - Color (brown) - Origin (Javanese) - Material (wooden) - Purpose + Noun.',
        },
      ],
      poinUtama: [
        {
          judul: '1. Social Function & Perbedaan Descriptive vs Report Text',
          penjelasan:
            'Descriptive Text berfokus mendeskripsikan SATU objek spesifik (Specific Participant), misalnya "My Cat Momo", "Our School Library", atau "Borobudur Temple". Sebaliknya, jika teks membahas kategori umum seperti "Cats in general", itu adalah Report Text.',
          analogi:
            'Descriptive Text itu seperti memotret Close-Up satu objek spesifik sampai detail terkecilnya terlihat jelas!',
          poinKunci: [
            'Specific Participant: Objek yang dideskripsikan bersifat tunggal/khusus dan punya nama jelas.',
            'Tujuan: Membantu pembaca membayangkan wujud fisik, suasana, dan karakter objek melalui kata-kata.',
            'Sering ditanyakan di ujian: "What is the writer’s intention in writing the text?" → Jawabannya: "To describe [Nama Objek] in detail."',
          ],
        },
        {
          judul: '2. Generic Structure: Identification vs Description',
          penjelasan:
            'Descriptive Text wajib tersusun atas dua bagian berurutan: Identification di paragraf pembuka dan Description di paragraf isi.',
          analogi:
            'Identification itu seperti Kartu Nama (mengenalkan siapa/apa objeknya), sedangkan Description adalah isi biodata lengkap dari ujung kepala sampai kaki.',
          poinKunci: [
            'Identification (Paragraf 1): Menjawab pertanyaan "What/Who is it?" dan "Where is it located?".',
            'Description (Paragraf 2 dst.): Menjelaskan Parts (bagian-bagian ruang/tubuh), Qualities (sifat/ukuran/warna), dan Characteristics (ciri khas/fungsi).',
          ],
        },
        {
          judul: '3. Language Features (Unsur Kebahasaan Wajib)',
          penjelasan:
            'Karena menggambarkan fakta kondisi objek saat ini, Descriptive Text selalu menggunakan Simple Present Tense dan kaya akan kata sifat panca indera (Sensory Adjectives).',
          poinKunci: [
            'Simple Present Tense: Gunakan Verb 1 (+s/es untuk subjek tunggal He/She/It) seperti "stands", "has", "consists of", "features".',
            'Relating / Linking Verbs: Kata kerja penghubung antara subjek dan sifatnya (is, are, look, seem, appear, smell, sound).',
            'Descriptive Adjectives & Noun Phrases: Gabungan kata sifat yang memperjelas kata benda, seperti "crystal-clear turquoise water" atau "spacious modern workshop".',
          ],
        },
      ],
      contohKonkret: {
        judulContoh: isSMP
          ? 'Contoh Model Descriptive Text SMP (My Favorite School Library) & Bedah Struktur'
          : 'Contoh Model Descriptive Text SMA/SMK (Borobudur Temple) & Bedah Struktur',
        teksContoh: isSMP
          ? `[IDENTIFICATION]\nMy favorite place at school is the "Cendekia" School Library. It is located on the second floor of the main building, right next to the science laboratory. Every break time, many students visit this quiet room to read stories or do their homework.\n\n[DESCRIPTION]\nThe library is spacious, clean, and fully air-conditioned. Inside, there are twelve tall wooden bookshelves filled with colorful storybooks, encyclopedias, and science magazines. In the corner near the large glass window, there is a cozy reading carpet with soft green cushions. Mrs. Sari, our friendly librarian, always helps us find the books we need with a warm smile.`
          : `[IDENTIFICATION]\nBorobudur Temple is the largest Buddhist monument in the world and one of Indonesia's most iconic historical landmarks. Located in Magelang, Central Java, this magnificent ninth-century temple sits on a green hilltop surrounded by twin volcanoes and lush rice fields.\n\n[DESCRIPTION]\nConstructed from over two million dark volcanic stone blocks without using any cement or mortar, the monument consists of nine stacked platforms—six square and three circular—topped by a grand central dome. Its walls are decorated with 2,672 intricate relief panels and 504 serene Buddha statues. At sunrise, golden morning light illuminates the misty stupas, creating a peaceful and breathtaking atmosphere for every visitor.`,
        bedahAnalisis: [
          '✅ Identification (Paragraf 1): Memperkenalkan nama objek spesifik beserta lokasi persisnya.',
          '✅ Description (Paragraf 2): Merinci bagian fisik, bahan/fasilitas, serta suasana (atmosphere) secara hidup.',
          '✅ Unsur Kebahasaan: Menggunakan Simple Present Tense (is, are, sits, consists of, helps) dan Noun Phrases (tall wooden bookshelves / dark volcanic stone blocks).',
        ],
      },
      tipsUjian: [
        '🎯 Jebakan Tense: Jangan gunakan Verb 2 (Past Tense seperti went, saw) saat mendeskripsikan kondisi fisik saat ini! Gunakan Verb 1 (is/are, has/have).',
        '🎯 Jebakan Adjective Order: Ingat rumus OSASCOMP saat mengurutkan kata sifat sebelum kata benda.',
        '🎯 Cara Cepat Jawab Soal Synonym: Perhatikan konteks kalimat apakah bermakna positif (magnificent = breathtaking = splendid) atau ukuran (vast = huge = spacious).',
      ],
      faktaMenarik: [
        'Tahukah Kamu? Pembaca manusia 3x lebih mudah mengingat teks deskripsi yang melibatkan minimal 3 panca indera (Sight/Penglihatan, Sound/Pendengaran, dan Touch/Suasana) dibandingkan daftar fakta biasa!',
      ],
      glosarium: [
        { istilah: 'Specific Participant', makna: 'Objek tunggal/khusus yang menjadi fokus deskripsi (misal: Mount Bromo, My Pet Cat).' },
        { istilah: 'Identification', makna: 'Bagian paragraf awal yang memperkenalkan identitas dan lokasi umum objek.' },
        { istilah: 'Description', makna: 'Bagian paragraf inti yang menguraikan rincian fisik, bagian, kualitas, dan karakteristik objek.' },
        { istilah: 'Sensory Adjectives', makna: 'Kata sifat yang menggugah panca indera pembaca (spacious, fragrant, crystal-clear, serene).' },
        { istilah: 'Relating Verb', makna: 'Kata kerja penghubung subjek dengan pelengkapnya (is, are, has, seem, look, consist of).' },
      ],
      kuisKilat: [
        {
          nomor: 1,
          pertanyaan: 'Apa perbedaan utama antara Descriptive Text dan Report Text?',
          jawaban: 'Descriptive Text mendeskripsikan satu objek spesifik (misal: Borobudur Temple), sedangkan Report Text membahas kategori objek secara umum/ilmiah (misal: Temples in general).',
        },
        {
          nomor: 2,
          pertanyaan: 'Susunlah kata sifat berikut sesuai aturan OSASCOMP: (wooden - round - beautiful - small - table)!',
          jawaban: '"A beautiful small round wooden table" (Opinion → Size → Shape → Material → Noun).',
        },
        {
          nomor: 3,
          pertanyaan: 'Mengapa kalimat "The museum has five exhibition halls" menggunakan "has", bukan "have"?',
          jawaban: 'Karena subjeknya tunggal (The museum = It) dalam pola kalimat Simple Present Tense.',
        },
      ],
      pesanInspirasi:
        'A great writer paints a picture with words! Kuasai kosakata sifat dan Simple Present Tense, maka kamu bisa mendeskripsikan keindahan Indonesia ke seluruh dunia! 🌍✨',
    };
  }

  // C. SUB-CABANG: PROCEDURE TEXT (SMP/SMA/SMK)
  if (lowerTopik.includes('procedure') || lowerTopik.includes('prosedur') || lowerTopik.includes('manual')) {
    return {
      id,
      createdAt,
      judul: `🇬🇧 Mastering Procedure Text: Manual, Tips & Recipe (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
      mataPelajaran: req.mataPelajaran,
      jenjangFase: req.jenjangFase,
      kelas: req.kelas,
      topik: rawTopik,
      sumberAsal: req.modeInput,
      gayaBahasa: req.gayaBahasa,
      ringkasanSatuKalimat:
        'Procedure Text adalah teks panduan Bahasa Inggris yang menjelaskan langkah-langkah berurutan untuk membuat sesuatu (Recipe) atau mengoperasikan suatu alat/sistem (Manual & SOP).',
      petaKonsep: [
        '1. Social Function (How to Make / Use Something)',
        '2. Generic Structure (Goal → Materials/Tools → Steps)',
        '3. Language Features (Imperatives, Action Verbs, Sequencers)',
        '4.Contoh Teks Manual / SOP & Bedah Analisis',
      ],
      rumusAtauPola: [
        {
          label: 'Generic Structure (3 Bagian Wajib)',
          isi: '1) Goal / Aim (Judul/Tujuan) → 2) Materials / Tools / Ingredients (Alat & Bahan) → 3) Steps / Methods (Langkah kerja berurutan dari awal hingga akhir).',
        },
        {
          label: 'Rumus Imperative Sentence (Kalimat Perintah)',
          isi: 'Positif: Verb 1 + Object + Adverb (e.g., "Press the power button gently", "Stir the mixture well") | Negatif/Larangan: Don\'t / Never + Verb 1 (e.g., "Do not touch the hot nozzle").',
        },
        {
          label: 'Temporal Conjunctions / Sequencers',
          isi: 'First, Second, Third, Next, Then, After that, Meanwhile, Before, Finally / Lastly.',
        },
      ],
      poinUtama: [
        {
          judul: '1. Social Function: Mengapa Kita Menulis Procedure Text?',
          penjelasan:
            'Tujuan komunikatif Procedure Text adalah memberi petunjuk langkah demi langkah secara jelas dan aman ("To explain/instruct how to make or operate something through a sequence of steps").',
          poinKunci: [
            'Recipe: Cara membuat makanan/minuman (menggunakan Ingredients / bahan takaran).',
            'Manual / Technical SOP: Cara mengoperasikan mesin, software, atau alat laboratorium (menggunakan Tools / Equipment).',
            'Tips / Life Hacks: Langkah praktis melakukan suatu aktivitas dengan efektif.',
          ],
        },
        {
          judul: '2. Generic Structure: Goal, Materials/Tools, dan Steps',
          penjelasan:
            'Urutan dalam Procedure Text bersifat kronologis. Langkah ke-2 tidak boleh mendahului langkah ke-1 agar hasil akhirnya tidak gagal atau membahayakan keselamatan.',
          poinKunci: [
            'Goal: Biasanya tertulis langsung sebagai judul, misalnya "How to Operate a 3D Printer Safely".',
            'Materials/Tools: Daftar rincian bahan atau perangkat yang harus disiapkan sebelum memulai.',
            'Steps: Instruksi berurutan dari awal sampai selesai (menggunakan penomoran 1, 2, 3 atau kata penghubung urutan).',
          ],
        },
        {
          judul: '3. Language Features (Ciri Kebahasaan Khas)',
          penjelasan:
            'Berbeda dengan teks cerita, kalimat dalam bagian Steps selalu langsung diawali Kata Kerja Bentuk 1 (Action Verb) tanpa subjek "You".',
          poinKunci: [
            'Action Verbs: plug in, turn on, click, select, pour, cut, measure, connect, unplug.',
            'Adverbs of Manner & Time: menjelaskan cara dan durasi (carefully, firmly, slowly, for 10 minutes, until golden brown).',
          ],
        },
      ],
      contohKonkret: {
        judulContoh: 'Contoh Model Procedure Text (Technical Manual) & Bedah Analisis',
        teksContoh: `[GOAL]\nHow to Print a Document Using a Wireless Office Printer\n\n[TOOLS NEEDED]\n• A laptop or smartphone connected to the Wi-Fi network\n• A wireless printer loaded with A4 paper and sufficient ink\n\n[STEPS]\n1. First, press the power button on the printer and wait until the Wi-Fi indicator light stops blinking.\n2. Second, open the document file (PDF or Word) on your laptop and press "Ctrl + P" on the keyboard.\n3. Next, select the correct wireless printer name from the printer dropdown menu.\n4. Then, adjust the print settings such as page range, paper size (A4), and color mode carefully.\n5. Finally, click the "Print" button and collect your printed pages from the output tray. Do not pull the paper forcibly while the printer is still operating.`,
        bedahAnalisis: [
          '✅ Goal & Tools: Menjelaskan tujuan prosedur dan prasyarat alat di bagian awal.',
          '✅ Imperative Verbs: Setiap langkah diawali Verb 1 perintah (press, open, select, adjust, click) dan kalimat larangan (Do not pull).',
          '✅ Sequencers & Adverbs: Menggunakan penanda urutan (First, Second, Next, Then, Finally) serta keterangan cara (carefully, forcibly).',
        ],
      },
      tipsUjian: [
        '🎯 Perhatikan pertanyaan "What should we do BEFORE / AFTER step X?" — baca nomor langkah tepat sebelum atau sesudahnya dengan teliti!',
        '🎯 Jika ditanya "Why should we do [Step]?", cari klausa tujuan yang menggunakan kata "to...", "in order to...", atau "so that...".',
      ],
      faktaMenarik: [
        'Tahukah Kamu? Di dunia penerbangan dan kedokteran, Procedure Text dalam bentuk Checklist SOP berhasil menurunkan tingkat kecelakaan kerja hingga lebih dari 80%!',
      ],
      glosarium: [
        { istilah: 'Imperative Sentence', makna: 'Kalimat perintah yang langsung diawali Verb 1 tanpa subjek.' },
        { istilah: 'Sequencers', makna: 'Kata penghubung penanda urutan langkah (First, Next, Then, Finally).' },
        { istilah: 'Ingredients vs Tools', makna: 'Ingredients adalah bahan habis pakai (resep), sedangkan Tools adalah peralatan kerja (manual).' },
      ],
      kuisKilat: [
        {
          nomor: 1,
          pertanyaan: 'Sebutkan 3 bagian utama Generic Structure dari Procedure Text!',
          jawaban: '1. Goal (Aim), 2. Materials / Ingredients / Tools, dan 3. Steps (Methods).',
        },
        {
          nomor: 2,
          pertanyaan: 'Bagaimana rumus membuat kalimat larangan (Negative Imperative) dalam Procedure Text?',
          jawaban: 'Do not (Don\'t) + Verb 1 + Object, atau Never + Verb 1 + Object.',
        },
      ],
      pesanInspirasi:
        'Clear instructions lead to great execution! Menguasai Procedure Text membuatmu siap menghadapi standar kerja internasional. 🚀',
    };
  }

  // D. SUB-CABANG BAHASA INGGRIS LAINNYA (Recount, Narrative, Exposition, Application Letter)
  const isNarrative = lowerTopik.includes('narrative') || lowerTopik.includes('fable') || lowerTopik.includes('legend');
  const isExposition = lowerTopik.includes('exposition') || lowerTopik.includes('analytical') || lowerTopik.includes('hortatory');

  return {
    id,
    createdAt,
    judul: `🇬🇧 English Study Guide: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: rawTopik,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat: `Panduan komprehensif menguasai Social Function, Generic Structure, Grammar Rules, dan contoh teks autentik pada materi Bahasa Inggris "${rawTopik}".`,
    petaKonsep: [
      '1. Social Function & Context',
      '2. Generic Structure (Kerangka Paragraf)',
      '3. Grammar & Language Features',
      '4. Model Text & Exam Strategies',
    ],
    rumusAtauPola: [
      {
        label: 'Social Function (Tujuan Teks)',
        isi: isNarrative
          ? 'To entertain/amuse the readers and teach a moral value through a story with complication and resolution.'
          : isExposition
          ? 'To persuade the reader that an issue is important by presenting logical arguments (Analytical: Thesis-Arguments-Reiteration | Hortatory: Thesis-Arguments-Recommendation).'
          : 'To retell past events or experiences in chronological order (Recount Text) or convey formal communication accurately.',
      },
      {
        label: 'Generic Structure (Struktur Teks)',
        isi: isNarrative
          ? '1) Orientation (Who, Where, When) → 2) Complication (Munculnya masalah/konflik hingga klimaks) → 3) Resolution (Penyelesaian masalah) → 4) Coda/Moral Value.'
          : isExposition
          ? '1) Thesis (Pengenalan isu & sudut pandang penulis) → 2) Arguments (Alasan logis disertai data/fakta) → 3) Reiteration / Recommendation (Penegasan ulang / saran).'
          : '1) Orientation (Pengenalan tokoh, waktu, tempat) → 2) Series of Events (Urutan peristiwa kronologis) → 3) Re-orientation (Kesan/penutup).',
      },
      {
        label: 'Rumus Grammar Dominan',
        isi: isExposition
          ? 'Simple Present Tense, Internal Conjunctions (Firstly, Furthermore, In addition, Therefore), Causal Verbs, dan Modal Auxiliaries (should, must).'
          : 'Simple Past Tense: Subject + Verb 2 + Object (e.g., visited, went, discovered) & Past Continuous Tense (was/were + V-ing).',
      },
    ],
    poinUtama: [
      {
        judul: `1. Memahami Fungsi Sosial & Konteks "${rawTopik}"`,
        penjelasan: `Setiap jenis teks Bahasa Inggris memiliki tujuan komunikatif yang khas. Pada materi ${rawTopik}, pembaca diajak memahami pesan utama penulis melalui struktur paragraf yang terorganisasi dengan baik.`,
        poinKunci: [
          'Identifikasi topik utama (Main Idea) dari paragraf pertama dan kalimat kesimpulan di paragraf terakhir.',
          'Kenali siapa target pembaca dan apa tujuan penulis menyusun teks tersebut.',
        ],
      },
      {
        judul: '2. Bedah Struktur Paragraf (Generic Structure)',
        penjelasan:
          'Memahami fungsi tiap paragraf sangat membantu kita menjawab soal pemahaman bacaan (reading comprehension) secara cepat tanpa harus menerjemahkan kata demi kata.',
        poinKunci: [
          'Paragraf Pembuka: Memperkenalkan latar belakang, tokoh/isu utama, serta konteks waktu/tempat.',
          'Paragraf Inti: Mengembangkan urutan peristiwa, konflik cerita, atau rangkaian argumen logis.',
          'Paragraf Penutup: Memberikan penyelesaian, kesimpulan akhir, atau pesan moral/rekomendasi.',
        ],
      },
      {
        judul: '3. Kaidah Kebahasaan & Kosakata Kunci (Language Features)',
        penjelasan:
          'Ketepatan penggunaan Tense, kata hubung (Conjunctions), dan rujukan kata ganti (Pronoun Reference) merupakan kunci utama dalam ujian Bahasa Inggris.',
        poinKunci: [
          'Perhatikan perubahan kata kerja (Verb 1 vs Verb 2 vs Verb 3) sesuai keterangan waktu (Time Signals).',
          'Pahami rujukan kata ganti (Pronouns: it, they, them, their, his, her) yang merujuk pada kata benda di kalimat sebelumnya.',
        ],
      },
    ],
    contohKonkret: {
      judulContoh: `Contoh Teks Model Bahasa Inggris: "${rawTopik}"`,
      teksContoh: isNarrative
        ? `[ORIENTATION]\nOnce upon a time, in a lush valley in West Java, lived an honest young farmer named Kabayan. Every morning, he worked diligently in his small rice field near the river.\n\n[COMPLICATION]\nOne dry season, the village river suddenly dried up because a giant fallen rock blocked the mountain spring. The villagers panicked as their crops began to wither. Although many strong men tried to push the rock alone and failed, Kabayan proposed a clever idea to use bamboo levers and pull the rock together.\n\n[RESOLUTION]\nWorking hand in hand with bamboo levers and ropes, the villagers finally moved the giant rock. Fresh water flowed back into the valley, teaching everyone that cooperation and wisdom are stronger than individual pride.`
        : isExposition
        ? `[THESIS]\nReading books regularly is one of the most essential habits for high school students in the digital era. Despite the popularity of short social media videos, deep reading offers irreplaceable cognitive benefits.\n\n[ARGUMENTS]\nFirstly, reading books strengthens concentration and critical thinking because students must follow complex ideas from chapter to chapter. Secondly, research shows that students who read twenty minutes a day possess a significantly richer vocabulary and better writing skills.\n\n[REITERATION]\nIn conclusion, cultivating a daily reading habit is crucial for students' academic success and lifelong learning.`
        : `[ORIENTATION]\nLast month, our eleventh-grade vocational class went on an industrial visit to a modern solar panel manufacturing plant in Cikarang. We departed from school at 6:30 a.m. accompanied by three engineering teachers.\n\n[EVENTS]\nUpon arriving at the plant, the safety officer gave us protective helmets and briefed us on industrial safety standards. First, we observed how automated robotic arms assembled photovoltaic cells with high precision. After that, we participated in a Q&A session with the lead engineer about renewable energy careers.\n\n[RE-ORIENTATION]\nWe returned home at 5:00 p.m. feeling inspired and motivated to master green technology skills for our future careers.`,
      bedahAnalisis: [
        '✅ Struktur Teks Lengkap: Terbagi jelas antara bagian pembuka, isi pengembangan, dan penutup.',
        '✅ Tata Bahasa Konsisten: Menggunakan tense dan kata hubung kronologis/argumentatif secara akurat.',
        '✅ Kosakata Kontekstual: Memuat istilah akademik dan kontekstual yang sesuai dengan jenjang siswa.',
      ],
    },
    tipsUjian: [
      '🎯 Untuk soal "What does the word \'they/it\' refer to?", baca 1 kalimat tepat di depannya dan cocokkan apakah bendanya tunggal (it) atau jamak (they).',
      '🎯 Untuk soal Main Idea paragraf, baca kalimat pertama dan kalimat terakhir paragraf tersebut.',
    ],
    faktaMenarik: [
      'Tahukah Kamu? Membaca teks Bahasa Inggris secara nyaring selama 10 menit sehari dapat meningkatkan daya ingat kosakata dan kelancaran berbicara hingga 2 kali lipat!',
    ],
    glosarium: [
      { istilah: 'Social Function', makna: 'Tujuan komunikatif penulis dalam menyampaikan teks kepada pembaca.' },
      { istilah: 'Chronological Conjunction', makna: 'Kata penghubung urutan waktu (first, then, after that, finally).' },
      { istilah: 'Pronoun Reference', makna: 'Kata ganti (it, they, he, she) yang merujuk pada kata benda yang telah disebutkan sebelumnya.' },
    ],
    kuisKilat: [
      {
        nomor: 1,
        pertanyaan: `Apa tujuan komunikatif (Social Function) utama dari materi ${rawTopik}?`,
        jawaban: isNarrative
          ? 'To entertain the readers and teach a moral lesson through a story.'
          : isExposition
          ? 'To present logical arguments to persuade the reader about an important issue.'
          : 'To retell past experiences or events chronologically to inform or entertain the reader.',
      },
      {
        nomor: 2,
        pertanyaan: 'Bagaimana cara menemukan makna kata sulit (Vocabulary in Context) di dalam teks ujian?',
        jawaban: 'Dengan membaca petunjuk konteks (context clues) pada kalimat sebelum dan sesudah kata tersebut.',
      },
    ],
    pesanInspirasi:
      'Every new English text you read opens a window to the world. Keep reading and practicing! 🌟',
  };
}
