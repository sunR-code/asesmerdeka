import type {
  GenerationRequest,
  AsesmenDokumen,
  ButirSoal,
  SoalPilihanGanda,
  SoalPilihanGandaKompleks,
  SoalUraian,
  KriteriaRubrik,
} from '../types/assessment';
import type { RangkumanDokumen } from '../types/summary';
import type { PGTemplate, PGKTemplate, UraianTemplate, QuestionBank } from './asesmen/types';
import {
  isSDRequest,
  isSMARequest,
  formatCognitiveLevel,
  balanceOptionAndKey,
} from './asesmen/types';
import {
  buildSDEnglishQuestionBank,
  buildDescriptiveEnglishBank,
  buildOtherEnglishQuestionBank,
} from './asesmen/englishBanks';
import { buildMathQuestionBank } from './asesmen/mathBanks';
import { buildIndonesianQuestionBank } from './asesmen/indonesianBanks';
import { buildScienceQuestionBank } from './asesmen/scienceBanks';
import { buildIslamicMadrasahQuestionBank } from './asesmen/islamicBanks';
import { buildPancasilaQuestionBank } from './asesmen/pancasilaBanks';
import {
  buildPJOKQuestionBank,
  buildSeniPrakaryaQuestionBank,
  buildIPSQuestionBank,
  buildInformatikaPKKQuestionBank,
  buildContextualGeneralQuestionBank,
} from './asesmen/otherSubjectBanks';

export type { PGTemplate, PGKTemplate, UraianTemplate, QuestionBank };

/**
 * Engine Pembuat Soal Asesmen Kurikulum Merdeka (Domain-Aware, Grade-Aware & Anti-Duplicate)
 */
export function buildSmartCurriculumAsesmen(
  req: GenerationRequest,
  noteTag?: string
): AsesmenDokumen {
  const isSMA = isSMARequest(req);
  const optionLetters: ('A' | 'B' | 'C' | 'D' | 'E')[] = isSMA
    ? ['A', 'B', 'C', 'D', 'E']
    : ['A', 'B', 'C', 'D'];

  const domainBank = getQuestionBankForRequest(req, isSMA);
  const bank = req.sourceRangkuman
    ? mergeWithRangkumanBank(req.sourceRangkuman, domainBank, req)
    : domainBank;

  const soalList: ButirSoal[] = [];
  let currentNo = 1;

  // Pola rotasi kunci jawaban yang seimbang (A, C, B, D, [E])
  const rotationOrder = isSMA ? [0, 2, 1, 3, 4] : [0, 2, 1, 3];

  // 1. Susun Soal Pilihan Ganda (PG) tanpa duplikasi untuk paket standar
  for (let i = 0; i < req.jumlahPG; i++) {
    const baseTpl = bank.pgPool[i % bank.pgPool.length];
    const cycle = Math.floor(i / bank.pgPool.length);
    const tpl: PGTemplate =
      cycle === 0
        ? baseTpl
        : {
            ...baseTpl,
            pertanyaan: `[Variasi Penalaran #${cycle + 1}] ${baseTpl.pertanyaan}`,
          };

    const targetKeyIdx = rotationOrder[i % rotationOrder.length];
    const balanced = balanceOptionAndKey(tpl, optionLetters, targetKeyIdx);

    soalList.push({
      id: `pg-${currentNo}`,
      nomor: currentNo,
      tipe: 'pilihan_ganda',
      stimulus: tpl.stimulus,
      pertanyaan: tpl.pertanyaan,
      pilihan: balanced.pilihan,
      kunci: balanced.kunci,
      pembahasan: balanced.pembahasan,
      levelKognitif: formatCognitiveLevel(tpl.levelKognitif, req.levelKognitif, i),
      indikatorSoal: tpl.indikatorSoal,
      skor: 10,
    } as SoalPilihanGanda);
    currentNo++;
  }

  // 2. Susun Soal Pilihan Ganda Kompleks (AKM)
  for (let i = 0; i < req.jumlahPGK; i++) {
    const baseTpl = bank.pgkPool[i % bank.pgkPool.length];
    const cycle = Math.floor(i / bank.pgkPool.length);
    const tpl: PGKTemplate =
      cycle === 0
        ? baseTpl
        : {
            ...baseTpl,
            pertanyaan: `[Analisis Lanjutan #${cycle + 1}] ${baseTpl.pertanyaan}`,
          };

    soalList.push({
      id: `pgk-${currentNo}`,
      nomor: currentNo,
      tipe: 'pilihan_ganda_kompleks',
      stimulus: tpl.stimulus,
      pertanyaan: tpl.pertanyaan,
      pernyataan: tpl.pernyataan.map((p, idx) => ({
        id: `p-${currentNo}-${idx + 1}`,
        teks: p.teks,
        isBenar: p.isBenar,
      })),
      pembahasan: tpl.pembahasan,
      levelKognitif: formatCognitiveLevel(tpl.levelKognitif, req.levelKognitif, i),
      indikatorSoal: tpl.indikatorSoal,
      skor: 15,
    } as SoalPilihanGandaKompleks);
    currentNo++;
  }

  // 3. Susun Soal Uraian
  for (let i = 0; i < req.jumlahUraian; i++) {
    const baseTpl = bank.uraianPool[i % bank.uraianPool.length];
    const cycle = Math.floor(i / bank.uraianPool.length);
    const tpl: UraianTemplate =
      cycle === 0
        ? baseTpl
        : {
            ...baseTpl,
            pertanyaan: `[Studi Kasus Lanjutan #${cycle + 1}] ${baseTpl.pertanyaan}`,
          };

    soalList.push({
      id: `ur-${currentNo}`,
      nomor: currentNo,
      tipe: 'uraian',
      stimulus: tpl.stimulus,
      pertanyaan: tpl.pertanyaan,
      pedomanPenskoran: tpl.pedomanPenskoran,
      contohJawaban: tpl.contohJawaban,
      levelKognitif: formatCognitiveLevel(tpl.levelKognitif, req.levelKognitif, i + 1),
      indikatorSoal: tpl.indikatorSoal,
      skorMaksimal: 20,
    } as SoalUraian);
    currentNo++;
  }

  // 4. Rubrik KKTP
  const rubrikKKTP: KriteriaRubrik[] = [
    {
      tujuanPembelajaran:
        req.tujuanPembelajaranInput ||
        `Peserta didik mampu memahami struktur konsep, menganalisis informasi, dan memecahkan permasalahan kontekstual pada materi ${req.materiPokok}.`,
      buktiKetercapaian: `Ketepatan menjawab soal pemahaman konsep, ketelitian menganalisis pernyataan stimulus AKM, serta kelengkapan argumen pada soal uraian ${req.materiPokok}.`,
      perluBimbingan: `Belum mampu mengidentifikasi konsep dasar dan ciri utama pada materi ${req.materiPokok}; memerlukan pendampingan langsung dan remedial terarah (Skor 0–60).`,
      cukup: `Mampu mengidentifikasi konsep dasar ${req.materiPokok}, namun masih kurang teliti saat menganalisis soal berbasis bacaan/kasus (Skor 61–74).`,
      baik: `Mampu memahami struktur konsep dan menganalisis sebagian besar soal stimulus serta menyusun jawaban uraian dengan tepat dan mandiri (Skor 75–87).`,
      sangatBaik: `Sangat mahir menganalisis soal penalaran kritis (HOTS), menguasai kaidah/rumus secara tuntas, serta mampu menyusun jawaban uraian secara sistematis dan kreatif (Skor 88–100).`,
    },
  ];

  const isEnglish = req.mataPelajaran.toLowerCase().includes('inggris');

  return {
    id: 'DOC-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    judul: `${req.tipeAsesmen.split(' ')[0]} ${req.mataPelajaran} — ${req.materiPokok} ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    tipeAsesmen: req.tipeAsesmen,
    alokasiWaktu: req.alokasiWaktu,
    tahunAjaran: '2026/2027',
    namaSekolah: req.namaSekolah || 'Satuan Pendidikan Kurikulum Merdeka',
    namaPenyusun: req.namaGuru || 'Guru Mata Pelajaran',
    capaianPembelajaran: bank.capaianPembelajaran,
    tujuanPembelajaran: [
      req.tujuanPembelajaranInput || bank.tujuanPembelajaranDefault,
    ],
    materiPokok: req.materiPokok,
    profilPelajarPancasila: ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
    petunjukUmum: isEnglish
      ? [
          'Pray before you start working on this assessment.',
          'Write your Full Name, Class, and Student Number clearly on the answer sheet.',
          'Read each text stimulus and question carefully before choosing or writing your answer.',
          'Review all of your answers before submitting the worksheet to your teacher.',
        ]
      : [
          'Awali dengan berdoa sebelum mulai mengerjakan soal asesmen.',
          'Tuliskan Nama Lengkap, Kelas, dan Nomor Absen pada kolom identitas yang tersedia.',
          'Bacalah setiap teks stimulus, tabel, atau skenario kasus dengan cermat sebelum menjawab.',
          'Periksa kembali kelengkapan dan ketepatan jawaban Anda sebelum dikumpulkan.',
        ],
    soalList,
    rubrikKKTP,
  };
}

/**
 * Mengintegrasikan isi Rangkuman Materi secara langsung ke dalam Bank Soal (#14)
 * ketika guru klik "Buat Soal dari Rangkuman Ini"
 */
function mergeWithRangkumanBank(
  rangkuman: RangkumanDokumen,
  domainBank: QuestionBank,
  req: GenerationRequest
): QuestionBank {
  const isEnglish = req.mataPelajaran.toLowerCase().includes('inggris');
  // Untuk Bahasa Inggris atau Matematika yang sudah punya bank soal spesifik berkualitas tinggi,
  // apabila rangkuman berasal dari topik standar, utamakan bank domain namun tambahkan soal spesifik dari contohKonkret jika berasal dari upload dokumen guru.
  if (rangkuman.sumberAsal !== 'upload' && (isEnglish || req.mataPelajaran.toLowerCase().includes('matematika'))) {
    return domainBank;
  }

  const customPG: PGTemplate[] = [];
  if (rangkuman.contohKonkret && rangkuman.contohKonkret.teksContoh) {
    customPG.push({
      stimulus: `Perhatikan kutipan materi dari rangkuman "${rangkuman.topik}" berikut!\n${rangkuman.contohKonkret.teksContoh.slice(0, 420)}`,
      pertanyaan: `Berdasarkan kutipan materi dan analisis pada topik "${rangkuman.topik}" di atas, simpulan konsep yang paling tepat adalah ....`,
      opsi5: [
        rangkuman.ringkasanSatuKalimat,
        `Konsep ${rangkuman.topik} tidak memiliki keterkaitan dengan contoh kasus di atas.`,
        `Seluruh tahapan pada materi ${rangkuman.topik} bersifat acak dan tidak memerlukan aturan baku.`,
        `Penerapan ${rangkuman.topik} hanya berlaku pada satu kondisi tertutup tanpa analisis data.`,
        `Faktor lingkungan dan prosedur kerja dapat diabaikan sepenuhnya dalam ${rangkuman.topik}.`,
      ],
      kunci: 'A',
      pembahasan: `Berdasarkan intisari rangkuman materi "${rangkuman.topik}", simpulan konsep yang benar adalah: "${rangkuman.ringkasanSatuKalimat}" (Pilihan A).`,
      levelKognitif: 'C4 (Menganalisis Intisari Materi Rangkuman)',
      indikatorSoal: `Disajikan kutipan contoh konkret dari lembar rangkuman ${rangkuman.topik}, peserta didik dapat menyimpulkan intisari konsep dengan tepat.`,
    });
  }

  return {
    ...domainBank,
    pgPool: [...customPG, ...domainBank.pgPool],
  };
}

/**
 * Regenerasi 1 Butir Soal secara Spesifik (ketika guru klik tombol "Regenerasi AI" pada nomor tertentu)
 */
export function buildSingleRegeneratedQuestion(
  assessment: AsesmenDokumen,
  targetSoal: ButirSoal
): ButirSoal {
  const dummyReq: GenerationRequest = {
    mataPelajaran: assessment.mataPelajaran,
    jenjangFase: assessment.jenjangFase,
    kelas: assessment.kelas,
    tipeAsesmen: assessment.tipeAsesmen,
    materiPokok: assessment.materiPokok,
    tujuanPembelajaranInput: assessment.tujuanPembelajaran[0] || '',
    jumlahPG: 8,
    jumlahPGK: 4,
    jumlahUraian: 4,
    levelKognitif: 'Campuran Berimbang',
    sertakanRubrik: true,
    alokasiWaktu: assessment.alokasiWaktu,
  };

  const isSMA = isSMARequest(dummyReq);
  const optionLetters: ('A' | 'B' | 'C' | 'D' | 'E')[] = isSMA
    ? ['A', 'B', 'C', 'D', 'E']
    : ['A', 'B', 'C', 'D'];

  const bank = getQuestionBankForRequest(dummyReq, isSMA);
  const randomOffset = Math.floor(Math.random() * 10) + targetSoal.nomor + 1;

  if (targetSoal.tipe === 'pilihan_ganda') {
    const tpl = bank.pgPool[randomOffset % bank.pgPool.length];
    const balanced = balanceOptionAndKey(tpl, optionLetters, randomOffset);
    return {
      id: `pg-${targetSoal.nomor}-${Date.now().toString(36)}`,
      nomor: targetSoal.nomor,
      tipe: 'pilihan_ganda',
      stimulus: tpl.stimulus,
      pertanyaan: tpl.pertanyaan,
      pilihan: balanced.pilihan,
      kunci: balanced.kunci,
      pembahasan: balanced.pembahasan,
      levelKognitif: tpl.levelKognitif,
      indikatorSoal: tpl.indikatorSoal,
      skor: targetSoal.skor || 10,
    } as SoalPilihanGanda;
  }

  if (targetSoal.tipe === 'pilihan_ganda_kompleks') {
    const tpl = bank.pgkPool[randomOffset % bank.pgkPool.length];
    return {
      id: `pgk-${targetSoal.nomor}-${Date.now().toString(36)}`,
      nomor: targetSoal.nomor,
      tipe: 'pilihan_ganda_kompleks',
      stimulus: tpl.stimulus,
      pertanyaan: tpl.pertanyaan,
      pernyataan: tpl.pernyataan.map((p, idx) => ({
        id: `p-${targetSoal.nomor}-${idx + 1}`,
        teks: p.teks,
        isBenar: p.isBenar,
      })),
      pembahasan: tpl.pembahasan,
      levelKognitif: tpl.levelKognitif,
      indikatorSoal: tpl.indikatorSoal,
      skor: targetSoal.skor || 15,
    } as SoalPilihanGandaKompleks;
  }

  const tpl = bank.uraianPool[randomOffset % bank.uraianPool.length];
  return {
    id: `ur-${targetSoal.nomor}-${Date.now().toString(36)}`,
    nomor: targetSoal.nomor,
    tipe: 'uraian',
    stimulus: tpl.stimulus,
    pertanyaan: tpl.pertanyaan,
    pedomanPenskoran: tpl.pedomanPenskoran,
    contohJawaban: tpl.contohJawaban,
    levelKognitif: tpl.levelKognitif,
    indikatorSoal: tpl.indikatorSoal,
    skorMaksimal: (targetSoal as SoalUraian).skorMaksimal || 20,
  } as SoalUraian;
}

export function getQuestionBankForRequest(
  req: GenerationRequest,
  isSMA: boolean
): QuestionBank {
  const lowerMapel = req.mataPelajaran.toLowerCase();
  const lowerMateri = req.materiPokok.toLowerCase();
  const isSD = isSDRequest(req);

  // 1. BAHASA INGGRIS SD (Kelas 1–6)
  if (lowerMapel.includes('inggris') && isSD) {
    return buildSDEnglishQuestionBank(req);
  }

  // 2. BAHASA INGGRIS — DESCRIPTIVE TEXT (SMP / SMA / SMK)
  if (
    lowerMateri.includes('descriptive') ||
    (lowerMapel.includes('inggris') && lowerMateri.includes('deskripsi'))
  ) {
    return buildDescriptiveEnglishBank();
  }

  // 3. BAHASA INGGRIS — PROCEDURE / RECOUNT / NARRATIVE / EXPOSITION (SMP / SMA / SMK)
  if (lowerMapel.includes('inggris')) {
    return buildOtherEnglishQuestionBank(req, lowerMateri);
  }

  // 4. MATEMATIKA (SD / SMP / SMA / SMK)
  if (lowerMapel.includes('matematika')) {
    return buildMathQuestionBank(req, lowerMateri);
  }

  // 5. BAHASA INDONESIA
  if (lowerMapel.includes('indonesia')) {
    return buildIndonesianQuestionBank(req, lowerMateri);
  }

  // 6. IPA / IPAS / FISIKA / KIMIA / BIOLOGI
  if (
    lowerMapel.includes('ipa') ||
    lowerMapel.includes('fisika') ||
    lowerMapel.includes('kimia') ||
    lowerMapel.includes('biologi')
  ) {
    return buildScienceQuestionBank(req, lowerMapel, lowerMateri);
  }

  // 7. PAI & MADRASAH (FIKIH, AL-QUR'AN HADIS, AKIDAH AKHLAK, SKI, BAHASA ARAB)
  if (
    lowerMapel.includes('agama') ||
    lowerMapel.includes('pai') ||
    lowerMapel.includes('fikih') ||
    lowerMapel.includes('quran') ||
    lowerMapel.includes('hadis') ||
    lowerMapel.includes('akidah') ||
    lowerMapel.includes('kebudayaan islam') ||
    lowerMapel.includes('arab')
  ) {
    return buildIslamicMadrasahQuestionBank(req, lowerMapel, lowerMateri);
  }

  // 8. PENDIDIKAN PANCASILA / PPKn / KEWARGANEGARAAN
  if (
    lowerMapel.includes('pancasila') ||
    lowerMapel.includes('ppkn') ||
    lowerMapel.includes('kewarganegaraan') ||
    lowerMateri.includes('pancasila') ||
    lowerMateri.includes('norma') ||
    lowerMateri.includes('uud')
  ) {
    return buildPancasilaQuestionBank(req, isSD, isSMA);
  }

  // 9. PJOK / PENDIDIKAN JASMANI, OLAHRAGA, & KESEHATAN
  if (
    lowerMapel.includes('pjok') ||
    lowerMapel.includes('olahraga') ||
    lowerMapel.includes('jasmani') ||
    lowerMapel.includes('penjaskes')
  ) {
    return buildPJOKQuestionBank(req, isSD, isSMA);
  }

  // 10. SENI BUDAYA & PRAKARYA (SENI RUPA, MUSIK, TARI, SBdP)
  if (
    lowerMapel.includes('seni') ||
    lowerMapel.includes('budaya') ||
    lowerMapel.includes('prakarya') ||
    lowerMapel.includes('sbdp') ||
    lowerMapel.includes('rupa') ||
    lowerMapel.includes('musik') ||
    lowerMapel.includes('tari')
  ) {
    return buildSeniPrakaryaQuestionBank(req, isSD, isSMA);
  }

  // 11. IPS / SEJARAH / EKONOMI / GEOGRAFI / SOSIOLOGI
  if (
    lowerMapel.includes('ips') ||
    lowerMapel.includes('sejarah') ||
    lowerMapel.includes('ekonomi') ||
    lowerMapel.includes('geografi') ||
    lowerMapel.includes('sosiologi')
  ) {
    return buildIPSQuestionBank(req, isSD, isSMA);
  }

  // 12. INFORMATIKA & KEJURUAN / PKK (KEWIRAUSAHAAN)
  if (
    lowerMapel.includes('informatika') ||
    lowerMapel.includes('komputer') ||
    lowerMapel.includes('tik') ||
    lowerMapel.includes('pkk') ||
    lowerMapel.includes('kewirausahaan')
  ) {
    return buildInformatikaPKKQuestionBank(req, isSD, isSMA);
  }

  // 13. MAPEL LAINNYA (Fallback Cerdas Kontekstual Tanpa Pengecoh Aneh)
  return buildContextualGeneralQuestionBank(req, isSMA);
}

