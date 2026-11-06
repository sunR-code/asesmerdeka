import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 1. BANK SOAL BAHASA INGGRIS SD (Kelas 1-6: Mudah, Kosakata Harian & Kalimat Sederhana)
// ============================================================================
export function buildSDEnglishQuestionBank(req: GenerationRequest): QuestionBank {
  return {
    capaianPembelajaran:
      'Peserta didik mampu memahami kosakata dasar bahasa Inggris (benda di kelas, warna, angka, waktu, dan kegiatan harian) serta merespons kalimat tanya-jawab sederhana secara tepat.',
    tujuanPembelajaranDefault:
      `Peserta didik dapat mengidentifikasi kosakata bahasa Inggris, membaca jam/kegiatan harian, dan melengkapi kalimat sederhana pada topik ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: `Read the short text about Rina's morning routine!
"Hello! My name is Rina. I am a fourth-grade student. Every morning, I get up at 05.00 o'clock. At 06.00 o'clock, I have breakfast with bread and warm milk. Then, I go to school at 06.30 in the morning."`,
        pertanyaan: 'What time does Rina have breakfast every morning?',
        opsi5: [
          'At five o’clock (05.00)',
          'At six o’clock (06.00)',
          'At half past six (06.30)',
          'At seven o’clock (07.00)',
          'At eight o’clock (08.00)',
        ],
        kunci: 'B',
        pembahasan:
          'Dalam bacaan tertulis: "At 06.00 o\'clock, I have breakfast with bread and warm milk." Bahasa Inggris dari pukul 06.00 tepat adalah "At six o\'clock" (Pilihan B).',
        levelKognitif: 'C2 (Memahami Informasi Bacaan Sederhana)',
        indikatorSoal: 'Disajikan teks pendek tentang kegiatan pagi hari, peserta didik SD dapat menentukan waktu kegiatan (telling time) dengan tepat.',
      },
      {
        stimulus: `Look at the things on Budi's desk!
"Budi has a blue pencil case. Inside his pencil case, there are three pencils, one ruler, and an eraser."`,
        pertanyaan: 'Why do we use the word "an" before "eraser" (an eraser)?',
        opsi5: [
          'Because the word "eraser" starts with a vowel sound (bunyi huruf vokal e).',
          'Because there are many erasers in the pencil case.',
          'Because the eraser has a blue color.',
          'Because the eraser belongs to the teacher.',
          'Because the word "eraser" is a verb.',
        ],
        kunci: 'A',
        pembahasan:
          'Dalam bahasa Inggris, kata sandang "an" digunakan di depan benda tunggal yang diawali bunyi huruf vokal (a, i, u, e, o), seperti "an eraser", "an apple", atau "an umbrella" (Pilihan A).',
        levelKognitif: 'C3 (Menerapkan Aturan Artikel A/An)',
        indikatorSoal: 'Disajikan kalimat sederhana tentang benda di kelas, peserta didik dapat menentukan alasan penggunaan artikel "an".',
      },
      {
        stimulus: `Read the short dialogue below!
Andi : "Good morning, Siti! How many books are there on the teacher's table?"
Siti : "Good morning, Andi! There ______ five books on the teacher's table."`,
        pertanyaan: 'The correct word to complete Siti’s sentence is ....',
        opsi5: ['am', 'is', 'are', 'has', 'do'],
        kunci: 'C',
        pembahasan:
          'Karena jumlah bukunya ada lima ("five books" = jamak / lebih dari satu), maka kata bantu yang tepat setelah "There" adalah "are" → "There are five books" (Pilihan C).',
        levelKognitif: 'C3 (Menerapkan There is vs There are)',
        indikatorSoal: 'Disajikan dialog singkat, peserta didik dapat memilih to be (is/are) yang tepat untuk benda jamak.',
      },
      {
        stimulus: `Read the sentences below!
"Dimas likes playing football in the schoolyard on Sunday morning. After playing football, he feels very thirsty and wants to drink something fresh."`,
        pertanyaan: 'What does Dimas need when he feels "thirsty" (haus)?',
        opsi5: [
          'A plate of fried rice',
          'A glass of mineral water or orange juice',
          'A new pair of shoes',
          'A thick dictionary book',
          'A wooden chair',
        ],
        kunci: 'B',
        pembahasan:
          'Kata "thirsty" artinya haus dan "wants to drink" artinya ingin minum. Maka benda yang dibutuhkan Dimas adalah minuman seperti "A glass of mineral water or orange juice" (Pilihan B).',
        levelKognitif: 'C3 (Menghubungkan Kosakata Makanan & Minuman)',
        indikatorSoal: 'Disajikan situasi sederhana tentang rasa lapar/haus, peserta didik dapat memilih kosakata minuman/makanan yang sesuai.',
      },
      {
        stimulus: `Look at the clock!
The clock shows 06:30 in the morning. Mother says: "Wake up, Edo! It is ______________. Let's get ready for school!"`,
        pertanyaan: 'How do we say "06:30" in English?',
        opsi5: [
          'Six o’clock',
          'Half past six',
          'Quarter to seven',
          'Half past seven',
          'Seven o’clock',
        ],
        kunci: 'B',
        pembahasan:
          'Pukul 06.30 (enam lewat tiga puluh menit / setengah tujuh) dalam bahasa Inggris disebut "Half past six" (Pilihan B).',
        levelKognitif: 'C2 (Membaca Waktu / Telling Time)',
        indikatorSoal: 'Disajikan waktu angka pukul 06.30, peserta didik dapat menentukan ungkapan bahasa Inggrisnya dengan tepat.',
      },
      {
        stimulus: `Complete the sentence about daily activities below!
"Every night at 08.00 p.m., my sister __________ her school homework in the study room before going to sleep."`,
        pertanyaan: 'Which verb correctly completes the sentence above?',
        opsi5: ['do', 'does', 'doing', 'did', 'done'],
        kunci: 'B',
        pembahasan:
          'Karena subjeknya adalah "my sister" (tunggal = She) dan menceritakan kegiatan rutin ("Every night"), maka kata kerja "do" ditambah akhiran -es menjadi "does" (Pilihan B).',
        levelKognitif: 'C3 (Menerapkan Simple Present Subjek Tunggal)',
        indikatorSoal: 'Disajikan kalimat rumpang tentang rutinitas harian, peserta didik dapat memilih kata kerja yang sesuai untuk subjek tunggal.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Read the text about "My Clean Classroom"!
Hello, my name is Bagas. My classroom is big and clean. There is one white board on the wall and one teacher's desk at the front. There are twenty student chairs and ten windows in my classroom. My friends and I sweep the floor every morning.`,
        pertanyaan: 'Based on the text above, tick TRUE (Benar) or FALSE (Salah) for each statement!',
        pernyataan: [
          { teks: 'Bagas’s classroom is big and clean.', isBenar: true },
          { teks: 'There are five whiteboards on the wall.', isBenar: false },
          { teks: 'Bagas and his friends sweep the classroom floor every morning.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 BENAR (ruang kelas besar dan bersih). Pernyataan 2 SALAH karena hanya ada 1 papan tulis ("There is one whiteboard"). Pernyataan 3 BENAR.',
        levelKognitif: 'C3 (Memahami Informasi Rinci Bacaan SD)',
        indikatorSoal: 'Disajikan teks pendek tentang ruang kelas, peserta didik dapat menentukan kebenaran 3 pernyataan sederhana.',
      },
      {
        stimulus: `Study the English vocabulary list below!
1. "Seven o'clock" means pukul 07.00 tepat.
2. "Have breakfast" means makan malam.
3. "Take a bath" means mandi.`,
        pertanyaan: 'Determine whether each vocabulary meaning above is TRUE (Benar) or FALSE (Salah)!',
        pernyataan: [
          { teks: 'Statement 1 is correct because "seven o’clock" means pukul 07.00.', isBenar: true },
          { teks: 'Statement 2 is correct because "have breakfast" means makan malam.', isBenar: false },
          { teks: 'Statement 3 is correct because "take a bath" means mandi.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena "have breakfast" artinya sarapan pagi, sedangkan makan malam adalah "have dinner".',
        levelKognitif: 'C2 (Mengidentifikasi Makna Kosakata Harian)',
        indikatorSoal: 'Peserta didik dapat memvalidasi arti kosakata kegiatan sehari-hari dan waktu dalam bahasa Inggris.',
      },
      {
        stimulus: `Look at Siti's favorite food and drinks:
• Siti likes fried rice and chicken soup.
• Siti does not like spicy noodles.
• Siti drinks a glass of milk every morning.`,
        pertanyaan: 'Tick TRUE (Benar) or FALSE (Salah) based on Siti’s list above!',
        pernyataan: [
          { teks: 'Siti likes eating fried rice and chicken soup.', isBenar: true },
          { teks: 'Spicy noodles are Siti’s favorite food.', isBenar: false },
          { teks: 'Siti drinks milk every morning.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR sesuai data. Pernyataan 2 SALAH karena Siti tidak menyukai mi pedas ("does not like spicy noodles").',
        levelKognitif: 'C3 (Memahami Daftar Kesukaan)',
        indikatorSoal: 'Disajikan daftar makanan dan minuman kesukaan tokoh, peserta didik dapat menentukan pernyataan yang benar dan salah.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Writing Simple English Sentences (Kelas ${req.kelas} SD):
Imagine you are introducing your school bag and the things inside it to your classmate.`,
        pertanyaan: `Answer these questions in simple English:
a) Mention FOUR (4) school objects inside your bag in English (example: a book)!
b) Write TWO (2) simple sentences using "There is..." and "There are..." about things in your classroom!`,
        pedomanPenskoran: `Pedoman Penskoran (Skor Maksimal = 20):
- Menyebutkan 4 benda sekolah dalam bahasa Inggris dengan ejaan benar = 10 poin.
- Menulis 2 kalimat "There is..." dan "There are..." dengan tepat = 10 poin.`,
        contohJawaban: `a) Four objects inside my bag:
1. A book (sebuah buku)
2. A pencil (sebuah pensil)
3. An eraser (sebuah penghapus)
4. A ruler (sebuah penggaris)

b) Two sentences about my classroom:
1. There is one whiteboard in my classroom.
2. There are twenty chairs in my classroom.`,
        levelKognitif: 'C3 (Menulis Kalimat Sederhana Bahasa Inggris SD)',
        indikatorSoal: 'Peserta didik dapat menyebutkan kosakata benda sekolah dan menulis kalimat sederhana menggunakan There is dan There are.',
      },
      {
        stimulus: `Daily Activities & Telling Time:
Every student has a morning routine before going to school.`,
        pertanyaan: `Write 3 simple sentences in English about your morning activities and the time you do them! (Use: "I get up at...", "I have breakfast at...", and "I go to school at...")`,
        pedomanPenskoran: `Skor 20: Menulis 3 kalimat kegiatan pagi beserta keterangan waktunya dalam bahasa Inggris dengan tepat.\nSkor 12: Menulis 2 kalimat dengan benar.`,
        contohJawaban: `1. I get up at five o'clock (05.00) every morning.
2. I have breakfast with my family at six o'clock (06.00).
3. I go to school at half past six (06.30).`,
        levelKognitif: 'C3 (Menyusun Kalimat Rutinitas Harian)',
        indikatorSoal: 'Peserta didik mampu menulis 3 kalimat sederhana tentang kegiatan pagi hari beserta jamnya dalam bahasa Inggris.',
      },
      {
        stimulus: `Rearranging Words (Menyusun Kata Acak):
Look at the jumbled words below:
1) is - My - clean - classroom - very
2) apples - three - are - There - table - on - the`,
        pertanyaan: `Arrange the jumbled words above into two good English sentences and translate them into Indonesian!`,
        pedomanPenskoran: `Skor 20: Kedua kalimat tersusun benar secara gramatikal beserta artinya dalam bahasa Indonesia.`,
        contohJawaban: `1) My classroom is very clean. (Ruang kelasku sangat bersih.)
2) There are three apples on the table. (Ada tiga buah apel di atas meja.)`,
        levelKognitif: 'C3 (Menyusun Kalimat Bahasa Inggris)',
        indikatorSoal: 'Disajikan kata-kata acak, peserta didik dapat menyusunnya menjadi kalimat bahasa Inggris yang benar.',
      },
    ],
  };
}

// ============================================================================
// 2. BANK SOAL BAHASA INGGRIS — DESCRIPTIVE TEXT (SMP / SMA / SMK)
// ============================================================================
export function buildDescriptiveEnglishBank(): QuestionBank {
  return {
    capaianPembelajaran:
      'Pada akhir fase ini, peserta didik mampu memahami, menganalisis fungsi sosial, struktur teks (Identification & Description), serta unsur kebahasaan (Simple Present Tense, Descriptive Adjectives, Noun Phrases) dari teks deskriptif lisan dan tulis tentang tempat wisata, bangunan bersejarah, tokoh, atau lingkungan kerja.',
    tujuanPembelajaranDefault:
      'Peserta didik dapat mengidentifikasi gagasan utama, informasi rinci, rujukan kata, makna kosakata kontekstual, serta menyusun teks deskriptif sesuai kaidah kebahasaan yang tepat.',
    pgPool: [
      {
        stimulus: `Read the following text carefully!
Labuan Bajo is a breathtaking fishing town located at the western end of the large island of Flores in East Nusa Tenggara, Indonesia. Once a quiet coastal village, it has now transformed into the main gateway to the world-famous Komodo National Park.

The town features picturesque hills overlooking crystal-clear turquoise waters and dozens of small tropical islands. Its harbor is always vibrant with traditional wooden Phinisi boats and modern speedboats anchored along the shoreline. One of its most iconic spots is Padar Island, where visitors can hike to the summit to witness a spectacular panoramic view of three uniquely curved bays with white, black, and pink sandy beaches.`,
        pertanyaan: 'What is the writer’s main intention in writing the text above?',
        opsi5: [
          'To retell the writer’s personal holiday experience in East Nusa Tenggara.',
          'To describe the natural beauty and specific features of Labuan Bajo in detail.',
          'To explain the step-by-step procedure of booking a Phinisi boat in Flores.',
          'To persuade the government to build more harbors in Komodo National Park.',
          'To describe tropical coastal towns in Indonesia in general scientific terms.',
        ],
        kunci: 'B',
        pembahasan:
          'Teks tersebut adalah Descriptive Text yang mendeskripsikan objek spesifik yaitu Labuan Bajo. Maka tujuan penulis (social function) adalah "To describe the natural beauty and specific features of Labuan Bajo in detail" (Pilihan B).',
        levelKognitif: 'C3 (Menentukan Tujuan Komunikatif)',
        indikatorSoal:
          'Disajikan teks deskriptif tentang destinasi wisata Indonesia, peserta didik dapat menentukan tujuan komunikatif (social function) penulis dengan tepat.',
      },
      {
        stimulus: `Read the excerpt from the text above!
"Paragraph 1: Labuan Bajo is a breathtaking fishing town located at the western end of the large island of Flores in East Nusa Tenggara, Indonesia. Once a quiet coastal village, it has now transformed into the main gateway to the world-famous Komodo National Park."`,
        pertanyaan:
          'In terms of the generic structure of a Descriptive Text, why is the first paragraph classified as the "Identification" section?',
        opsi5: [
          'Because it explains the moral value and resolution of the story.',
          'Because it describes the detailed physical parts of Padar Island’s beaches.',
          'Because it introduces the specific object being described, including its name and location.',
          'Because it presents arguments for and against tourism in Flores.',
          'Because it lists the equipment needed to hike to the summit of the hill.',
        ],
        kunci: 'C',
        pembahasan:
          'Dalam struktur Descriptive Text, paragraf pertama disebut Identification karena berfungsi memperkenalkan nama objek spesifik (Labuan Bajo), lokasi geografisnya (ujung barat Pulau Flores, NTT), dan identitas umumnya sebagai gerbang Taman Nasional Komodo (Pilihan C).',
        levelKognitif: 'C4 (Menganalisis Struktur Teks)',
        indikatorSoal:
          'Disajikan kutipan paragraf pembuka Descriptive Text, peserta didik dapat menganalisis alasan paragraf tersebut berfungsi sebagai bagian Identification.',
      },
      {
        stimulus: `Read the following sentence from the text!
"One of its most iconic spots is Padar Island, where visitors can hike to the summit to witness a spectacular panoramic view of three uniquely curved bays..."`,
        pertanyaan:
          'The bold/underlined word "spectacular" in the sentence above is closest in meaning to ....',
        opsi5: [
          'Ordinary and common',
          'Narrow and crowded',
          'Breathtaking and magnificent',
          'Ancient and abandoned',
          'Dangerous and steep',
        ],
        kunci: 'C',
        pembahasan:
          'Kata "spectacular" (sangat menakjubkan/memukau) memiliki persamaan makna (synonym) dengan "breathtaking and magnificent" (Pilihan C).',
        levelKognitif: 'C3 (Mengidentifikasi Makna Kosakata / Synonym)',
        indikatorSoal:
          'Disajikan kalimat dari teks deskriptif, peserta didik dapat menentukan sinonim kata sifat (descriptive adjective) sesuai konteks kalimat.',
      },
      {
        stimulus: `Read the following Descriptive Text about a vocational facility!
The Advanced Mechatronics Workshop is the proudest facility in our Vocational High School (SMK). Situated on the ground floor of the east wing, this spacious 200-square-meter room is designed to simulate a real modern manufacturing industry.

Inside the workshop, there are ten high-precision CNC (Computer Numerical Control) machines, four automated robotic arms, and a smart pneumatic testing station. The floor is painted with bright yellow safety lines to separate the operator zones from the pedestrian walkways. Every workbench is equipped with digital measuring tools and strict safety instruction boards.`,
        pertanyaan:
          'Based on the text above, why are bright yellow lines painted on the workshop floor?',
        opsi5: [
          'To make the room look more colorful and artistic for school visitors.',
          'To mark the storage area for broken CNC machines and old tools.',
          'To separate the machine operator zones from the safe pedestrian walkways.',
          'To indicate where students should charge their laptops and mobile phones.',
          'To show the emergency exit route to the school cafeteria.',
        ],
        kunci: 'C',
        pembahasan:
          'Pada paragraf kedua kalimat kedua disebutkan secara eksplisit: "The floor is painted with bright yellow safety lines to separate the operator zones from the pedestrian walkways." (Pilihan C).',
        levelKognitif: 'C4 (Menganalisis Informasi Rinci)',
        indikatorSoal:
          'Disajikan teks deskriptif tentang fasilitas bengkel/laboratorium sekolah, peserta didik dapat menemukan fungsi bagian spesifik berdasarkan informasi teks.',
      },
      {
        stimulus: `Pay attention to the grammar and Adjective Order (OSASCOMP: Opinion - Size - Age - Shape - Color - Origin - Material - Purpose) in the following sentence!
"In the center of the museum hall stands a _______________________ statue that attracts many international historians."`,
        pertanyaan:
          'Which of the following noun phrases correctly completes the sentence according to the standard English Adjective Order (OSASCOMP)?',
        opsi5: [
          'stone ancient magnificent Javanese large',
          'magnificent large ancient Javanese stone',
          'Javanese ancient large stone magnificent',
          'large stone Javanese magnificent ancient',
          'ancient Javanese magnificent stone large',
        ],
        kunci: 'B',
        pembahasan:
          'Sesuai aturan urutan kata sifat bahasa Inggris (OSASCOMP): Opinion (magnificent) → Size (large) → Age (ancient) → Origin (Javanese) → Material (stone) + Noun (statue). Maka susunan yang tepat adalah "magnificent large ancient Javanese stone" (Pilihan B).',
        levelKognitif: 'C3 (Menerapkan Kaidah Kebahasaan / OSASCOMP)',
        indikatorSoal:
          'Disajikan kalimat rumpang, peserta didik dapat menyusun urutan kata sifat (Adjective Order OSASCOMP) dalam Noun Phrase dengan tepat.',
      },
      {
        stimulus: `Read the following two short excerpts!
Text A: "Borobudur is the largest Buddhist temple in the world, located in Magelang, Central Java. Built in the 9th century, this specific monument consists of nine stacked platforms topped by a central dome."
Text B: "Temples are religious buildings designed for worship and spiritual rituals. In general, ancient temples across Asia were constructed using volcanic stone or red brick."`,
        pertanyaan:
          'What makes Text A a "Descriptive Text" while Text B is classified as a "Report Text"?',
        opsi5: [
          'Text A uses Simple Past Tense, whereas Text B uses Simple Future Tense.',
          'Text A describes one specific object (Borobudur Temple), whereas Text B describes a general category of objects (Temples in general).',
          'Text A contains a complication and resolution, whereas Text B contains steps.',
          'Text A is written to persuade tourists, whereas Text B is written to entertain children.',
          'Text A does not use any adjectives, whereas Text B uses many sensory adjectives.',
        ],
        kunci: 'B',
        pembahasan:
          'Perbedaan mendasar Descriptive Text dan Report Text terletak pada spesifisitas objeknya (Specific vs General Participant). Text A mendeskripsikan satu objek khusus (Borobudur Temple = Descriptive Text), sedangkan Text B membahas kategori umum (Temples in general = Report Text) (Pilihan B).',
        levelKognitif: 'C4 (Membandingkan Dua Jenis Teks)',
        indikatorSoal:
          'Disajikan dua kutipan teks pendek, peserta didik dapat membedakan karakteristik Descriptive Text dan Report Text secara kritis.',
      },
      {
        stimulus: `Complete the following descriptive paragraph with the correct Simple Present Tense verbs!
"Lawang Sewu (1) ______ a historic landmark in Semarang, Central Java. The building (2) ______ almost a thousand large windows and high arches that allow natural air circulation."`,
        pertanyaan:
          'The correct verbs to fill in blanks (1) and (2) are ....',
        opsi5: [
          '(1) are — (2) have',
          '(1) was — (2) had',
          '(1) is — (2) has',
          '(1) is — (2) have',
          '(1) be — (2) having',
        ],
        kunci: 'C',
        pembahasan:
          'Karena subjek "Lawang Sewu" dan "The building" adalah tunggal (singular third person = It) dan Descriptive Text menggunakan Simple Present Tense untuk menyatakan fakta kondisi saat ini, maka pasangan kata kerja yang tepat adalah "is" dan "has" (Pilihan C).',
        levelKognitif: 'C3 (Menerapkan Simple Present Tense)',
        indikatorSoal:
          'Disajikan paragraf deskriptif rumpang, peserta didik dapat memilih kata kerja Simple Present Tense (Linking Verb & Relational Verb) yang sesuai dengan subjek tunggal.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Read the following Descriptive Text carefully to evaluate the statements below!
Raja Ampat, located off the northwest tip of Bird's Head Peninsula in Southwest Papua, is an archipelago comprising over 1,500 small islands, cays, and shoals surrounding four main islands: Waigeo, Batanta, Salawati, and Misool.

According to marine biodiversity surveys, the Raja Ampat region houses 75% of the world's known coral species and more than 1,600 species of reef fish. Above the water, towering karst limestone islands covered in lush green jungle rise dramatically from the calm blue sea. Visitors who climb to the wooden viewing deck at Piaynemo can enjoy the iconic view of star-shaped lagoons. Because of its fragile ecosystem, tourists are strictly prohibited from touching the corals or littering plastic waste.`,
        pertanyaan:
          'Based on the Descriptive Text above, determine whether each of the following statements is TRUE (Benar) or FALSE (Salah)!',
        pernyataan: [
          {
            teks: 'The first paragraph functions as the Identification because it introduces Raja Ampat, its geographical location, and its four main islands.',
            isBenar: true,
          },
          {
            teks: 'Raja Ampat only has four islands in total and less than 500 species of reef fish.',
            isBenar: false,
          },
          {
            teks: 'The text uses Simple Present Tense verbs (such as "is", "houses", "rise") and descriptive noun phrases (such as "towering karst limestone islands").',
            isBenar: true,
          },
        ],
        pembahasan:
          'Pernyataan 1 BENAR (Paragraf 1 mengenalkan nama, lokasi di Papua Barat Daya, dan 4 pulau utama). Pernyataan 2 SALAH (Raja Ampat memiliki lebih dari 1.500 pulau kecil dan lebih dari 1.600 spesies ikan karang). Pernyataan 3 BENAR (Menggunakan Simple Present Tense dan frasa kata benda deskriptif).',
        levelKognitif: 'C4 (Evaluasi Informasi & Struktur AKM)',
        indikatorSoal:
          'Disajikan teks deskriptif tentang kepulauan Raja Ampat, peserta didik dapat memvalidasi kebenaran 3 pernyataan terkait struktur, isi fakta, dan kaidah kebahasaan.',
      },
      {
        stimulus: `Study the following comparison table of Language Features in Descriptive Text!
• Feature 1: Specific Participant (e.g., "Prambanan Temple", "My Digital Camera", "Mr. Budi").
• Feature 2: Dominant Tense = Simple Present Tense (S + V1(s/es) or S + am/is/are + Adjective).
• Feature 3: Sensory Adjectives & Relating Verbs (is, look, seem, consist of, feature).`,
        pertanyaan:
          'Based on the rules of Descriptive Text above, tick TRUE (Benar) or FALSE (Salah) for each statement below!',
        pernyataan: [
          {
            teks: 'The sentence "My school library has a comfortable reading corner and a high-speed Wi-Fi connection" follows the correct grammar of Descriptive Text.',
            isBenar: true,
          },
          {
            teks: 'A Descriptive Text must always use Simple Past Tense (Verb 2) because it retells past events.',
            isBenar: false,
          },
          {
            teks: 'Words like "spacious", "modern", "clean", and "historical" are examples of adjectives used to describe qualities of a place.',
            isBenar: true,
          },
        ],
        pembahasan:
          'Pernyataan 1 BENAR (Menggunakan Specific Participant "My school library" dan Simple Present "has"). Pernyataan 2 SALAH (Teks yang menceritakan peristiwa masa lampau dengan Verb 2 adalah Recount/Narrative Text, bukan Descriptive Text). Pernyataan 3 BENAR.',
        levelKognitif: 'C4 (Menganalisis Kaidah Kebahasaan AKM)',
        indikatorSoal:
          'Disajikan ringkasan kaidah kebahasaan Descriptive Text, peserta didik dapat mengevaluasi ketepatan penerapan grammar dan kosakata.',
      },
      {
        stimulus: `Read the short description of an Indonesian national figure below!
B.J. Habibie was one of Indonesia's greatest aviation engineers and the third President of the Republic of Indonesia. Known affectionately as a brilliant and visionary scientist, he dedicated his life to advancing aerospace technology and education for young Indonesians. In his workspace, hundreds of engineering books and aircraft models are arranged neatly on wooden shelves.`,
        pertanyaan: 'Determine whether each statement below is TRUE (Benar) or FALSE (Salah) based on the text!',
        pernyataan: [
          { teks: 'The words "brilliant" and "visionary" are descriptive adjectives describing character traits.', isBenar: true },
          { teks: 'The text is a Procedure Text that explains how to build an airplane step by step.', isBenar: false },
          { teks: 'The phrase "wooden shelves" is a noun phrase consisting of a material adjective (wooden) and a noun (shelves).', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena teks tersebut mendeskripsikan tokoh dan ruang kerjanya (Descriptive Biography), bukan langkah membuat pesawat (Procedure Text).',
        levelKognitif: 'C4 (Menganalisis Deskripsi Tokoh)',
        indikatorSoal: 'Disajikan teks deskripsi tokoh, peserta didik dapat memvalidasi jenis kata sifat dan struktur frasa kata benda.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Read the short Descriptive Text below!
[1] Mount Bromo is an active volcano and one of the most visited tourist attractions in East Java, Indonesia. It stands at 2,329 meters above sea level and sits in the middle of a vast plain called the "Sea of Sand" (Segara Wedi).
[2] At sunrise, the view from Mount Penanjakan is truly magical. Golden rays of sunlight slowly illuminate the smoking crater and the surrounding green peaks. The air is very crisp and cold, ranging from 3 to 10 degrees Celsius in the morning, while the scent of sulfur drifts gently in the wind.`,
        pertanyaan: `Analyze the text above by answering these three questions:
a) Identify the Generic Structure of Paragraph [1] and Paragraph [2] and explain the main idea of each paragraph!
b) Find at least FOUR (4) descriptive adjectives/noun phrases used by the writer to appeal to the reader's senses (sight, touch/temperature, or smell)!
c) Why does the writer use the verb "stands" and "sits" (with -s) in Paragraph [1]?`,
        pedomanPenskoran: `Pedoman Penskoran (Skor Maksimal = 20):
- Skor 20 (Sangat Baik): Menjawab lengkap poin (a) Identification & Description beserta ide pokoknya, (b) menyebutkan minimal 4 kata sifat/frasa benda panca indera dengan tepat, dan (c) menjelaskan alasan grammar Simple Present Tense subjek tunggal (It).
- Skor 15 (Baik): Menjawab 3 poin dengan benar namun penjelasan ide pokok atau grammar kurang rinci.
- Skor 10 (Cukup): Hanya menjawab 2 poin dengan benar.
- Skor 5 (Perlu Bimbingan): Hanya menjawab 1 poin atau jawaban masih kurang tepat.`,
        contohJawaban: `a) Generic Structure:
- Paragraph [1] is the Identification: It introduces Mount Bromo, its location in East Java, its height, and its position in the Sea of Sand.
- Paragraph [2] is the Description: It describes the magical sunrise view, the cold temperature, and the atmosphere around Mount Bromo.

b) Four sensory adjectives / noun phrases:
1. "vast plain" / "golden rays of sunlight" / "smoking crater" (Sight)
2. "crisp and cold air" (Touch/Temperature)
3. "magical view" / "surrounding green peaks" (Sight)
4. "scent of sulfur" (Smell)

c) Grammar reason: Because the subject is "It" (referring to Mount Bromo, which is a singular third-person noun), and in Simple Present Tense, singular subjects require Verb + s/es ("stands", "sits") to state factual conditions.`,
        levelKognitif: 'C4-C5 (Menganalisis & Mengevaluasi Teks)',
        indikatorSoal:
          'Disajikan teks deskriptif dua paragraf, peserta didik dapat menganalisis struktur teks, mengidentifikasi kosakata panca indera (sensory adjectives), dan menjelaskan kaidah Simple Present Tense.',
      },
      {
        stimulus: `Writing Task (HOTS — Creating a Descriptive Text):
Imagine an international student exchange group is visiting your school or your hometown next month. You are asked to write a short Descriptive Text to introduce EITHER:
(Option 1) Your favorite facility/room at school (e.g., Computer Lab, School Library, Workshop/Practice Room), OR
(Option 2) A famous tourist spot / historical building in your city/province.`,
        pertanyaan: `Write a well-structured Descriptive Text consisting of TWO paragraphs (minimum 80–120 words in English):
• Paragraph 1 (Identification): Introduce the name of the place/facility, its location, and why it is special.
• Paragraph 2 (Description): Describe its parts, physical appearance, facilities, and atmosphere using Simple Present Tense and at least 5 descriptive adjectives!`,
        pedomanPenskoran: `Pedoman Penskoran Menulis (Skor Maksimal = 20):
- Kelengkapan Struktur (Identification & Description) = 6 poin
- Ketepatan Grammar (Simple Present Tense & Subject-Verb Agreement) = 5 poin
- Kekayaan Kosakata (Minimal 5 Descriptive Adjectives / Noun Phrases) = 5 poin
- Keruntutan Kalimat, Ejaan (Spelling) & Tanda Baca = 4 poin`,
        contohJawaban: `[Paragraph 1 — Identification]
Our Digital Multimedia Laboratory is one of the best learning facilities at our school. It is located on the second floor of the main building, right next to the library. This room serves as the creative hub where students learn graphic design, video editing, and animation.

[Paragraph 2 — Description]
The laboratory is spacious, bright, and fully air-conditioned. Inside, there are thirty high-performance computers arranged neatly in five rows, each equipped with a large ultra-wide monitor and a digital drawing tablet. At the front of the room, an interactive smartboard hangs on the clean white wall, accompanied by a professional green-screen studio corner at the back. The quiet and modern atmosphere makes every student feel comfortable and inspired during practice sessions.`,
        levelKognitif: 'C6 (Mencipta / Menulis Teks Deskriptif)',
        indikatorSoal:
          'Peserta didik mampu menyusun teks deskriptif dua paragraf (Identification & Description) dalam bahasa Inggris dengan memperhatikan Simple Present Tense dan kekayaan kata sifat.',
      },
      {
        stimulus: `Grammar & Sentence Transformation (Descriptive Text):
Look at the following jumbled adjectives and nouns:
1) (bag - leather - brown - stylish - Italian - small)
2) Change the verb in brackets into the correct Simple Present Tense form: "The National Museum (have) more than 140,000 historical artifacts and (attract) thousands of students every month."`,
        pertanyaan: `a) Arrange the words in number (1) into a correct Noun Phrase using OSASCOMP order!
b) Rewrite sentence number (2) with the correct Simple Present Tense verb forms!`,
        pedomanPenskoran: `Skor 20: Menyusun Noun Phrase OSASCOMP dengan tepat (10 poin) dan mengubah kedua kata kerja menjadi "has" serta "attracts" dengan benar (10 poin).`,
        contohJawaban: `a) OSASCOMP Noun Phrase: "A stylish small brown Italian leather bag" (Opinion: stylish → Size: small → Color: brown → Origin: Italian → Material: leather → Noun: bag).
b) Correct Simple Present Tense: "The National Museum has more than 140,000 historical artifacts and attracts thousands of students every month."`,
        levelKognitif: 'C4 (Menerapkan Struktur Grammar Deskriptif)',
        indikatorSoal: 'Peserta didik dapat menyusun frasa kata benda OSASCOMP dan memperbaiki bentuk kata kerja Simple Present Tense.',
      },
    ],
  };
}

// ============================================================================
// 3. BANK SOAL BAHASA INGGRIS LAINNYA (Procedure, Recount, Narrative, Exposition)
// ============================================================================
export function buildOtherEnglishQuestionBank(req: GenerationRequest, lowerMateri: string): QuestionBank {
  if (lowerMateri.includes('procedure')) {
    return {
      capaianPembelajaran:
        'Peserta didik mampu memahami dan menganalisis fungsi sosial, struktur teks (Goal, Materials/Tools, Steps), dan unsur kebahasaan (Imperative Sentences, Action Verbs, Connectives) pada Procedure Text berbentuk manual kerja, SOP, maupun resep.',
      tujuanPembelajaranDefault:
        'Peserta didik dapat menganalisis langkah-langkah prosedur, makna kosakata teknis, kalimat perintah, serta menyusun teks prosedur secara sistematis.',
      pgPool: [
        {
          stimulus: `Read the following technical manual carefully!
How to Safely Use a Digital Multimeter to Measure DC Voltage
Tools: A digital multimeter, red and black test probes, and a DC battery.
Steps:
1. First, insert the black probe into the "COM" jack and the red probe into the "VΩmA" jack firmly.
2. Second, turn the rotary dial to the DC Voltage (V⎓) mode and select a voltage range higher than the expected battery voltage.
3. Next, touch the black probe tip to the negative (-) terminal and the red probe tip to the positive (+) terminal of the battery carefully.
4. Then, read the voltage number displayed on the LCD screen.
5. Finally, remove the probes and turn the selector dial back to the "OFF" position to prevent battery drain.`,
          pertanyaan: 'Why should the user turn the selector dial back to the "OFF" position at the end of the procedure?',
          opsi5: [
            'To reset the positive and negative terminals of the battery being tested.',
            'To prevent the multimeter’s internal battery from draining.',
            'To increase the voltage reading on the digital LCD screen.',
            'To clean the red and black test probes automatically.',
            'To switch the current from DC mode into AC mode.',
          ],
          kunci: 'B',
          pembahasan:
            'Pada langkah ke-5 tertulis jelas: "...turn the selector dial back to the \'OFF\' position to prevent battery drain" (untuk mencegah baterai multimeter cepat habis) (Pilihan B).',
          levelKognitif: 'C4 (Menganalisis Alasan Langkah Prosedur)',
          indikatorSoal: 'Disajikan teks prosedur manual penggunaan alat, peserta didik dapat menganalisis tujuan dari langkah keselamatan tertentu.',
        },
        {
          stimulus: `Look at Step 2 from the manual above:
"Second, turn the rotary dial to the DC Voltage mode and select a voltage range higher than the expected battery voltage."`,
          pertanyaan: 'What should you do RIGHT AFTER selecting the appropriate DC Voltage range on the rotary dial?',
          opsi5: [
            'Insert the black probe into the COM jack.',
            'Turn the multimeter dial back to the OFF position.',
            'Touch the black probe to the negative terminal and the red probe to the positive terminal.',
            'Replace the LCD screen with a new battery.',
            'Unplug the test probes from the multimeter ports.',
          ],
          kunci: 'C',
          pembahasan:
            'Langkah tepat sesudah Step 2 adalah Step 3: "Next, touch the black probe tip to the negative (-) terminal and the red probe tip to the positive (+) terminal of the battery carefully." (Pilihan C).',
          levelKognitif: 'C3 (Mengurutkan Langkah Prosedur)',
          indikatorSoal: 'Disajikan teks prosedur, peserta didik dapat menentukan langkah yang harus dilakukan tepat setelah langkah tertentu.',
        },
        {
          stimulus: `Pay attention to the grammar of the following safety instruction in a Procedure Text:
"_________ touch the bare metal tips with wet hands while measuring high electrical current!"`,
          pertanyaan: 'Which word correctly completes the negative imperative sentence above?',
          opsi5: [
            'Not to',
            'Does not',
            'Do not (Don’t)',
            'Did not',
            'Are not',
          ],
          kunci: 'C',
          pembahasan:
            'Kalimat larangan (Negative Imperative) dalam Procedure Text dibentuk dengan rumus: "Do not (Don\'t) + Verb 1" atau "Never + Verb 1" (Pilihan C).',
          levelKognitif: 'C3 (Menerapkan Kaidah Imperative Sentence)',
          indikatorSoal: 'Disajikan kalimat instruksi keselamatan rumpang, peserta didik dapat melengkapinya dengan bentuk Negative Imperative yang tepat.',
        },
        {
          stimulus: `Read the following recipe for Making Warm Ginger Honey Tea!
Ingredients: 250 ml of water, 2 thumb-sized fresh gingers (crushed), 2 tablespoons of pure honey, and a slice of lemon.
Steps:
1. Boil 250 ml of water in a small saucepan over medium heat.
2. Add the crushed ginger into the boiling water and simmer for 7 minutes until fragrant.
3. Turn off the stove and strain the ginger water into a ceramic mug.
4. Let it cool slightly for 2 minutes, then stir in two tablespoons of pure honey and a slice of lemon.
5. Serve the ginger honey tea while it is warm.`,
          pertanyaan: 'Why do we need to strain the ginger water in Step 3?',
          opsi5: [
            'To make the water boil faster on the stove.',
            'To separate the crushed ginger pulp from the liquid tea before drinking.',
            'To freeze the honey into ice cubes.',
            'To remove the sweet taste of the honey.',
            'To add more raw ginger skin into the mug.',
          ],
          kunci: 'B',
          pembahasan:
            'Kata "strain" artinya menyaring. Menyaring air rebusan jahe bertujuan memisahkan ampas jahe yang digeprek dari air teh sebelum diminum (Pilihan B).',
          levelKognitif: 'C4 (Menganalisis Fungsi Langkah Resep)',
          indikatorSoal: 'Disajikan teks prosedur resep minuman sehat, peserta didik dapat menyimpulkan tujuan dari langkah penyaringan bahan.',
        },
        {
          stimulus: `Look at Step 2 in the recipe above:
"Add the crushed ginger into the boiling water and simmer for 7 minutes until fragrant."`,
          pertanyaan: 'The word "simmer" in the instruction above means ....',
          opsi5: [
            'Freeze in the refrigerator',
            'Cook gently just below boiling point over low heat',
            'Cut into very thin slices with a sharp knife',
            'Blend at maximum speed using a mixer',
            'Bake inside a hot oven for an hour',
          ],
          kunci: 'B',
          pembahasan:
            'Dalam terminologi memasak (culinary procedure), "simmer" berarti merebus perlahan dengan api kecil agar sari bahan keluar secara optimal (Pilihan B).',
          levelKognitif: 'C3 (Mengidentifikasi Makna Action Verb)',
          indikatorSoal: 'Disajikan kalimat langkah prosedur, peserta didik dapat mengidentifikasi arti kata kerja tindakan (action verb).',
        },
        {
          stimulus: `Arrange these jumbled sentences into a coherent Procedure Text on "How to Create a Strong Account Password"!
(1) Next, combine uppercase letters, lowercase letters, numbers, and symbols.
(2) First, open the security settings page of your digital account.
(3) Finally, click the "Save Changes" button and store your password in a secure manager.
(4) Second, click on the "Change Password" menu and type a phrase of at least 12 characters.`,
          pertanyaan: 'The best chronological arrangement of the steps above is ....',
          opsi5: [
            '(2) - (4) - (1) - (3)',
            '(2) - (1) - (4) - (3)',
            '(4) - (2) - (1) - (3)',
            '(1) - (2) - (4) - (3)',
            '(3) - (2) - (4) - (1)',
          ],
          kunci: 'A',
          pembahasan:
            'Berdasarkan penanda urutan waktu (sequencers): First (2) → Second (4) → Next (1) → Finally (3). Maka urutan yang benar adalah (2) - (4) - (1) - (3) (Pilihan A).',
          levelKognitif: 'C4 (Menyusun Urutan Langkah Prosedur)',
          indikatorSoal: 'Disajikan langkah prosedur acak, peserta didik dapat mengurutkannya menjadi teks prosedur yang padu.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Read the Procedure Text below!
How to Back Up Important School Files to Cloud Storage
1. First, connect your laptop to a stable Wi-Fi network and log in to your cloud storage account.
2. Create a new folder named "School_Assignments_2026" to keep your documents organized.
3. Click the "Upload File" button and select the documents from your local drive.
4. Wait until the green checkmark appears next to the file name before closing the browser tab.`,
          pertanyaan: 'Determine whether each statement below is TRUE (Benar) or FALSE (Salah) based on the text!',
          pernyataan: [
            { teks: 'The goal of the text is to explain how to back up files to cloud storage safely.', isBenar: true },
            { teks: 'Users are advised to close the browser tab immediately before the green checkmark appears.', isBenar: false },
            { teks: 'The verbs "connect", "create", "click", and "wait" are Action Verbs in Imperative form.', isBenar: true },
          ],
          pembahasan: 'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena pengguna harus menunggu tanda centang hijau muncul sebelum menutup tab browser.',
          levelKognitif: 'C4 (Evaluasi Prosedur AKM)',
          indikatorSoal: 'Disajikan teks prosedur digital, peserta didik dapat memvalidasi pernyataan terkait urutan langkah dan ciri kebahasaan.',
        },
        {
          stimulus: `Review the structure of a Procedure Text:
• Goal: Tells the reader what will be made or done.
• Materials / Tools: Lists the items needed.
• Steps: Explains how to accomplish the goal in chronological order.`,
          pertanyaan: 'Tick TRUE (Benar) or FALSE (Salah) for each statement about Procedure Text below!',
          pernyataan: [
            { teks: 'Temporal conjunctions like "First", "Next", "Then", and "Finally" help show the sequence of steps.', isBenar: true },
            { teks: 'A Procedure Text uses Simple Past Tense (Verb 2) to tell a fairy tale from long ago.', isBenar: false },
            { teks: 'Adverbs of manner (such as "carefully", "slowly", "firmly") describe how an action should be performed.', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena Procedure Text menggunakan Simple Present Tense / Imperative (Verb 1), bukan Simple Past Tense.',
          levelKognitif: 'C4 (Menganalisis Kaidah Procedure Text)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi kebenaran kaidah kebahasaan dan struktur Procedure Text.',
        },
        {
          stimulus: `Laboratory Safety SOP: Using a Microscope
1. Place the microscope on a flat, sturdy laboratory table.
2. Plug in the power cord and turn on the bottom LED light source.
3. Place the glass slide on the stage and secure it with the stage clips.
4. Always start viewing the specimen using the lowest-power objective lens (4x) before switching to higher magnification.`,
          pertanyaan: 'Evaluate whether the following statements are TRUE (Benar) or FALSE (Salah) based on the SOP!',
          pernyataan: [
            { teks: 'Students must start observing with the lowest-power objective lens (4x) first.', isBenar: true },
            { teks: 'The glass slide is placed on the stage and held by stage clips.', isBenar: true },
            { teks: 'The microscope should be placed on an uneven and shaky surface.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR sesuai langkah ke-3 dan ke-4. Pernyataan 3 SALAH karena mikroskop wajib diletakkan di meja yang rata dan kokoh ("flat, sturdy table").',
          levelKognitif: 'C4 (Evaluasi SOP Laboratorium)',
          indikatorSoal: 'Disajikan SOP penggunaan alat laboratorium dalam bahasa Inggris, peserta didik dapat memvalidasi prosedur kerja yang benar.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Writing a Procedure Text:
Your teacher asks you to create a clear Standard Operating Procedure (SOP) or Tutorial for your classmates on how to perform a practical task (for example: How to Use a Projector in Classroom, How to Send a Formal Assignment via Email, or How to Make a Healthy Drink).`,
          pertanyaan: `Write a complete Procedure Text in English that includes:
a) Goal (Title)
b) Tools / Materials needed
c) At least 5 sequential Steps using Imperative Verbs and Temporal Conjunctions (First, Second, Next, Then, Finally)!`,
          pedomanPenskoran: `Skor 20: Memuat Goal, Tools/Materials, minimal 5 langkah berurutan dengan Imperative Verbs & Conjunctions yang tepat.\nSkor 15: Struktur lengkap namun terdapat sedikit kekeliruan ejaan/grammar.\nSkor 10: Langkah kurang dari 4 atau belum menggunakan kalimat perintah.`,
          contohJawaban: `Goal: How to Submit a School Assignment via Email Professionally
Tools: A laptop or smartphone, internet connection, and the assignment file (PDF).
Steps:
1. First, open your email application and click the "Compose" button.
2. Second, type your teacher's official email address accurately in the "To" field.
3. Next, write a clear subject line, such as "English Assignment - Full Name - Class".
4. Then, write a polite greeting in the email body and click the paperclip icon to attach your PDF file.
5. Finally, double-check the attachment and click the "Send" button.`,
          levelKognitif: 'C6 (Menyusun Procedure Text)',
          indikatorSoal: 'Peserta didik mampu menulis Procedure Text lengkap sesuai struktur Goal, Tools, dan Steps.',
        },
        {
          stimulus: `Read the following excerpt from a technical manual!
"Before cleaning the blender blade, always unplug the power cord from the electrical outlet. Wash the jar and blade carefully with warm soapy water, then dry them with a clean cloth."`,
          pertanyaan: `Analyze the instruction above:
a) What is the purpose of unplugging the power cord before cleaning the blender blade?
b) Identify THREE (3) imperative action verbs used in the excerpt above!`,
          pedomanPenskoran: `Skor 20: Menjelaskan alasan keselamatan listrik dengan tepat (10 poin) dan menyebutkan 3 action verbs (unplug, wash, dry) dengan benar (10 poin).`,
          contohJawaban: `a) To prevent electrical shock or accidental activation of the sharp spinning blade while cleaning it.
b) Three imperative action verbs: "unplug", "wash", and "dry".`,
          levelKognitif: 'C4 (Menganalisis Instruksi Keselamatan Kerja)',
          indikatorSoal: 'Disajikan kutipan manual keselamatan alat, peserta didik dapat menganalisis alasan langkah K3 dan mengidentifikasi kata kerja perintah.',
        },
        {
          stimulus: `Converting Narrative Description into Imperative Steps:
Suppose your friend tells you: "When you want to plant a mango seed in a pot, you need to fill the pot with fertile soil first. After that, you make a small hole in the center, put the seed inside, cover it with soil, and water it gently."`,
          pertanyaan: `Rewrite your friend's explanation above into 4 numbered Imperative Steps using sequencers (First, Second, Then, Finally)!`,
          pedomanPenskoran: `Skor 20: Mengubah kalimat menjadi 4 langkah Imperative (diawali Verb 1 tanpa "you") disertai kata penghubung urutan yang tepat.`,
          contohJawaban: `1. First, fill the pot with fertile soil.
2. Second, make a small hole in the center of the soil.
3. Then, put the mango seed inside the hole and cover it with soil.
4. Finally, water the soil gently.`,
          levelKognitif: 'C5 (Mengonversi Kalimat menjadi Langkah Prosedur)',
          indikatorSoal: 'Peserta didik dapat mengubah paragraf penjelasan menjadi langkah-langkah kalimat perintah (imperative steps).',
        },
      ],
    };
  }

  // Fallback untuk topik Bahasa Inggris lainnya (Recount, Narrative, Exposition, Application Letter) — Minimal 6 PG, 3 PGK, 3 Uraian!
  return {
    capaianPembelajaran: `Peserta didik mampu memahami, menganalisis struktur teks, fungsi sosial, dan kaidah kebahasaan pada materi Bahasa Inggris: ${req.materiPokok}.`,
    tujuanPembelajaranDefault: `Peserta didik dapat menganalisis gagasan utama, informasi tersurat/tersirat, kosakata, dan tata bahasa pada materi ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: `Read the following English passage carefully!
Last semester, our eleventh-grade class participated in a three-day community service and environmental camp in a highland village. On the first day, we arrived at the village hall at 9:00 a.m. and met the local farmers. In the afternoon, we planted two hundred pine and avocado seedlings along the hillside to prevent soil erosion.

On the second day, we conducted a digital literacy workshop for the village youth, teaching them how to photograph local agricultural products and promote them on online marketplaces. Although we felt tired when we returned home on the third day, we were deeply proud because our small collaboration brought real benefits to the community.`,
        pertanyaan: 'What is the main topic of the second paragraph?',
        opsi5: [
          'The long bus journey from school to the highland village.',
          'The digital literacy workshop to help village youth market local products online.',
          'The reason why pine trees cannot grow in lowland areas.',
          'The complaint of the students about the cold weather in the village.',
          'The history of agricultural tools in Indonesia.',
        ],
        kunci: 'B',
        pembahasan:
          'Paragraf kedua secara spesifik menceritakan kegiatan hari kedua, yaitu pelatihan literasi digital bagi pemuda desa untuk memasarkan produk pertanian secara daring (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Main Idea)',
        indikatorSoal: `Disajikan teks bahasa Inggris terkait ${req.materiPokok}, peserta didik dapat menentukan gagasan utama paragraf tertentu.`,
      },
      {
        stimulus: `Look at the sentence from the text above:
"In the afternoon, we planted two hundred pine and avocado seedlings along the hillside to prevent soil erosion."`,
        pertanyaan: 'Why did the students plant pine and avocado seedlings along the hillside?',
        opsi5: [
          'To replace all vegetable farms with timber factories.',
          'To prevent soil erosion on the highland slope.',
          'To build a wooden bridge across the village river.',
          'To sell the tree leaves at the traditional market.',
          'To compete in a national gardening championship.',
        ],
        kunci: 'B',
        pembahasan: 'Kalimat tersebut menyebutkan tujuan penanaman bibit pohon: "...to prevent soil erosion" (untuk mencegah erosi tanah) (Pilihan B).',
        levelKognitif: 'C3 (Mengidentifikasi Informasi Tersurat)',
        indikatorSoal: 'Peserta didik dapat menemukan alasan tindakan tokoh berdasarkan informasi di dalam teks.',
      },
      {
        stimulus: `Read the sentence below!
"Although we felt tired when we returned home on the third day, we were deeply proud because our small collaboration brought real benefits..."`,
        pertanyaan: 'The word "benefits" in the sentence above can be best replaced by ....',
        opsi5: [
          'Obstacles and problems',
          'Damages and losses',
          'Advantages and positive impacts',
          'Expenses and debts',
          'Doubts and fears',
        ],
        kunci: 'C',
        pembahasan: 'Kata "benefits" (manfaat/keuntungan positif) bersinonim dengan "advantages and positive impacts" (Pilihan C).',
        levelKognitif: 'C3 (Menentukan Sinonim Kontekstual)',
        indikatorSoal: 'Peserta didik dapat menentukan persamaan kata (synonym) yang tepat berdasarkan konteks kalimat.',
      },
      {
        stimulus: `Read the following Narrative excerpt!
Once upon a time, on the north coast of Sumatra, lived a poor widow and her only son, Malin Kundang. Growing up as a hardworking young man, Malin decided to sail across the sea to seek his fortune. Years later, he became a wealthy merchant with a magnificent ship, but when he landed back at his home village, his arrogance blinded him from acknowledging his own elderly mother.`,
        pertanyaan: 'What moral lesson can we learn from the story of Malin Kundang above?',
        opsi5: [
          'Wealth and luxury are more important than family ties.',
          'We must always respect, honor, and never forget our parents regardless of our success.',
          'Sailing across the sea is the only way to become a successful merchant.',
          'Young people should never leave their hometown to study or work.',
          'Building a large ship requires hundreds of skilled carpenters.',
        ],
        kunci: 'B',
        pembahasan:
          'Pesan moral (moral value) utama dari kisah Malin Kundang adalah kewajiban menghormati dan menyayangi orang tua dalam kondisi apa pun serta menjauhi sifat sombong (Pilihan B).',
        levelKognitif: 'C4 (Menyimpulkan Pesan Moral / Moral Value)',
        indikatorSoal: 'Disajikan kutipan teks naratif legenda Nusantara, peserta didik dapat menyimpulkan nilai moral cerita.',
      },
      {
        stimulus: `Pay attention to the pronoun reference in the sentence below!
"On the second day, we conducted a digital literacy workshop for the village youth, teaching them how to photograph local agricultural products..."`,
        pertanyaan: 'The underlined pronoun "them" in the sentence above refers to ....',
        opsi5: [
          'The eleventh-grade teachers',
          'The pine and avocado seedlings',
          'The village youth',
          'The local agricultural products',
          'The online marketplaces',
        ],
        kunci: 'C',
        pembahasan:
          'Kata ganti objek "them" merujuk pada penerima pelatihan yang disebutkan tepat sebelumnya, yaitu "the village youth" (para pemuda desa) (Pilihan C).',
        levelKognitif: 'C3 (Menentukan Rujukan Kata Ganti / Pronoun Reference)',
        indikatorSoal: 'Disajikan kutipan kalimat dari teks, peserta didik dapat menentukan rujukan kata ganti (pronoun reference) dengan tepat.',
      },
      {
        stimulus: `Complete the sentence below with the correct Simple Past Tense verb form!
"While the students were setting up the projector in the village hall, the head of the village ________ and welcomed everyone warmly."`,
        pertanyaan: 'Which verb form best completes the sentence above?',
        opsi5: ['arrive', 'arrives', 'arrived', 'is arriving', 'will arrive'],
        kunci: 'C',
        pembahasan:
          'Kalimat tersebut menggabungkan kejadian yang sedang berlangsung di masa lampau (Past Continuous: "were setting up") dengan kejadian yang menyela di masa lampau (Simple Past Tense: Verb 2 = "arrived") (Pilihan C).',
        levelKognitif: 'C3 (Menerapkan Simple Past & Past Continuous)',
        indikatorSoal: 'Disajikan kalimat rumpang masa lampau, peserta didik dapat memilih bentuk Verb 2 yang tepat.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Evaluate the following statements based on the passage about the Environmental & Digital Literacy Camp above!`,
        pertanyaan: 'Tick TRUE (Benar) or FALSE (Salah) for each statement below!',
        pernyataan: [
          { teks: 'The students planted 200 seedlings on the first day to help prevent soil erosion.', isBenar: true },
          { teks: 'On the second day, the students only played games and did not interact with the village youth.', isBenar: false },
          { teks: 'The passage uses past tense verbs such as "participated", "arrived", "planted", and "conducted".', isBenar: true },
        ],
        pembahasan: 'Pernyataan 1 dan 3 BENAR sesuai isi dan tata bahasa teks. Pernyataan 2 SALAH karena pada hari kedua siswa mengadakan workshop literasi digital.',
        levelKognitif: 'C4 (Evaluasi Bacaan AKM)',
        indikatorSoal: 'Peserta didik dapat menentukan kebenaran pernyataan berdasarkan isi bacaan dan unsur kebahasaannya.',
      },
      {
        stimulus: `Compare the generic structures of English text genres below:
• Recount Text: Orientation → Series of Events → Re-orientation
• Narrative Text: Orientation → Complication → Resolution → Coda/Moral Value
• Analytical Exposition: Thesis → Arguments → Reiteration`,
        pertanyaan: 'Determine whether each statement below is TRUE (Benar) or FALSE (Salah)!',
        pernyataan: [
          { teks: 'The main difference between Narrative and Recount Text is the presence of a conflict/problem (Complication) in Narrative Text.', isBenar: true },
          { teks: 'Analytical Exposition Text is written to tell a fictional fairy tale using Past Tense.', isBenar: false },
          { teks: 'Both Recount and Narrative Texts introduce who, where, and when in the "Orientation" section.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena Analytical Exposition bertujuan memaparkan argumen logis tentang suatu isu penting menggunakan Simple Present Tense.',
        levelKognitif: 'C4 (Membandingkan Struktur Genre Teks)',
        indikatorSoal: 'Peserta didik dapat memvalidasi perbandingan struktur antara Recount, Narrative, dan Exposition Text.',
      },
      {
        stimulus: `Read the short Analytical Exposition excerpt below!
"Bringing a reusable water tumbler to school brings significant environmental and financial benefits for students. Firstly, it drastically reduces single-use plastic bottle waste in the school environment. Secondly, students can save their pocket money by refilling drinking water from the school's water dispenser."`,
        pertanyaan: 'Based on the excerpt above, tick TRUE (Benar) or FALSE (Salah) for each statement!',
        pernyataan: [
          { teks: 'The first sentence acts as the Thesis statement presenting the writer’s main viewpoint.', isBenar: true },
          { teks: 'The writer argues that using a tumbler increases plastic waste at school.', isBenar: false },
          { teks: 'Connectives like "Firstly" and "Secondly" are used to structure arguments logically.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena penggunaan tumbler justru mengurangi sampah botol plastik sekali pakai ("reduces single-use plastic bottle waste").',
        levelKognitif: 'C4 (Evaluasi Teks Eksposisi)',
        indikatorSoal: 'Disajikan kutipan teks eksposisi bahasa Inggris, peserta didik dapat mengevaluasi tesis, argumen, dan kata hubungnya.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Critical Reflection & Writing (${req.materiPokok}):
Learning English texts is not only about understanding grammar, but also about communicating ideas clearly in real-life situations.`,
        pertanyaan: `Based on the topic "${req.materiPokok}", answer the following questions:
a) Explain the main communicative purpose (Social Function) and structure of this topic!
b) Write 3 complete English sentences that apply the grammar rules of "${req.materiPokok}"!`,
        pedomanPenskoran: `Skor 20: Menjelaskan social function & struktur dengan tepat serta menulis 3 kalimat bahasa Inggris yang gramatikal.\nSkor 12: Menjelaskan konsep dengan cukup baik namun kalimat contoh masih kurang lengkap.`,
        contohJawaban: `a) The communicative purpose is to convey structured ideas clearly according to the text genre (Opening/Orientation, Body/Details, and Closing/Conclusion).\nb) Example sentences:\n1. Last week, our class visited the national history museum to study Indonesian heritage.\n2. Students collaborated actively to solve real-world problems during the workshop.\n3. Mastering English communication opens wider career opportunities in the global industry.`,
        levelKognitif: 'C5-C6 (Mengevaluasi & Menyusun Kalimat)',
        indikatorSoal: `Peserta didik dapat menjelaskan struktur konsep dan menyusun kalimat bahasa Inggris sesuai kaidah ${req.materiPokok}.`,
      },
      {
        stimulus: `Reading Comprehension & Inference:
"Last Saturday, Nadya joined an inter-school English storytelling competition. Although she felt nervous while waiting backstage, she took a deep breath and delivered her story about Lake Toba expressively. At the end of the event, the judges announced her as the first-place winner."`,
        pertanyaan: `Answer the following questions in complete English sentences:
a) How did Nadya overcome her nervousness before going on stage?
b) Find THREE (3) past tense verbs (Verb 2) in the paragraph above and write their base forms (Verb 1)!`,
        pedomanPenskoran: `Skor 20: Menjawab cara Nadya mengatasi gugup dengan benar (10 poin) dan menyebutkan 3 pasangan Verb 2 -> Verb 1 secara tepat (10 poin).`,
        contohJawaban: `a) She overcame her nervousness by taking a deep breath and focusing on delivering her story expressively.
b) Three Past Tense verbs and their Verb 1 forms:
1. joined → join
2. felt → feel (or took → take)
3. announced → announce`,
        levelKognitif: 'C4 (Menganalisis Isi & Kaidah Verb 2)',
        indikatorSoal: 'Disajikan paragraf cerita pengalaman, peserta didik dapat menganalisis tindakan tokoh dan mengidentifikasi bentuk kata kerja lampau.',
      },
      {
        stimulus: `Writing a Short Paragraph (${req.materiPokok}):
Write a short paragraph in English (60–90 words) related to the topic "${req.materiPokok}" (for example: an unforgettable school event, a moral story, or an opinion on digital learning).`,
        pertanyaan: `Make sure your paragraph includes a clear opening sentence, supporting details, and a concluding sentence with accurate grammar!`,
        pedomanPenskoran: `Skor 20: Paragraf memenuhi panjang 60-90 kata, struktur pembuka-isi-penutup jelas, serta tata bahasa dan ejaan akurat.`,
        contohJawaban: `Last month, my classmates and I organized a "Green School Day" project to make our school environment cleaner and shadier. In the morning, each class brought five flower pots and planted colorful ornamental plants along the corridor. Next, we painted recycling bins for organic and inorganic waste. Although our uniforms got a little dirty, we felt very happy because our school corridor now looks fresh and green every day.`,
        levelKognitif: 'C6 (Menulis Paragraf Bahasa Inggris)',
        indikatorSoal: 'Peserta didik mampu menyusun paragraf bahasa Inggris yang padu dan gramatikal sesuai tema.',
      },
    ],
  };
}
