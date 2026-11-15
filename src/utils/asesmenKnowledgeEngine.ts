import type {
  GenerationRequest,
  AsesmenDokumen,
  ButirSoal,
  SoalPilihanGanda,
  SoalPilihanGandaKompleks,
  SoalUraian,
  KriteriaRubrik,
  TPTraceabilityItem,
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
  UNIFIED_KKTP_INTERVALS,
  enrichDocWithQualityAndCognitive,
  normalizeQuestionText,
} from './assessmentQualityEngine';
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

  const { bank: domainBank, isGeneralFallback } = resolveDomainQuestionBank(req, isSMA);
  const bank = req.sourceRangkuman
    ? mergeWithRangkumanBank(req.sourceRangkuman, domainBank, req)
    : domainBank;

  const tpMap: TPTraceabilityItem[] =
    req.tpListContext && req.tpListContext.length > 0
      ? req.tpListContext
      : req.tpId || req.tujuanPembelajaranInput
        ? [
            {
              id: req.tpId || 'tp_active_1',
              kode: req.tpKode || 'TP-1',
              materiPokok: req.materiPokok,
              deskripsi: req.tujuanPembelajaranInput || bank.tujuanPembelajaranDefault,
            },
          ]
        : [];

  const resolveTPBinding = (idx: number) => {
    if (tpMap.length === 0) return {};
    const targetTp = tpMap[idx % tpMap.length];
    const subList = targetTp.subTP || [];
    const targetSub =
      subList.length > 0
        ? subList.find((s) => req.subTpIds?.includes(s.id)) || subList[idx % subList.length]
        : undefined;
    return {
      tpId: targetTp.id,
      tpKode: targetTp.kode,
      subTpId: targetSub?.id,
      subTpDeskripsi: targetSub?.deskripsi,
    };
  };

  const soalList: ButirSoal[] = [];
  let currentNo = 1;
  const fallbackReasons: string[] = [];
  if (isGeneralFallback) {
    fallbackReasons.push(
      `Mata pelajaran "${req.mataPelajaran}" memakai kerangka soal kontekstual umum (bukan bank spesifik mapel); wajib ditinjau guru.`
    );
  }

  // Deduplikasi pool agar tidak ada butir kembar identik
  const uniquePG = bank.pgPool.filter(
    (item, idx, arr) =>
      arr.findIndex((o) => normalizeQuestionText(o.pertanyaan) === normalizeQuestionText(item.pertanyaan)) === idx
  );
  const uniquePGK = bank.pgkPool.filter(
    (item, idx, arr) =>
      arr.findIndex((o) => normalizeQuestionText(o.pertanyaan) === normalizeQuestionText(item.pertanyaan)) === idx
  );
  const uniqueUraian = bank.uraianPool.filter(
    (item, idx, arr) =>
      arr.findIndex((o) => normalizeQuestionText(o.pertanyaan) === normalizeQuestionText(item.pertanyaan)) === idx
  );

  const actualPGCount = Math.min(Math.max(0, req.jumlahPG), uniquePG.length);
  const actualPGKCount = Math.min(Math.max(0, req.jumlahPGK), uniquePGK.length);
  const actualUraianCount = Math.min(Math.max(0, req.jumlahUraian), uniqueUraian.length);

  if (
    actualPGCount < req.jumlahPG ||
    actualPGKCount < req.jumlahPGK ||
    actualUraianCount < req.jumlahUraian
  ) {
    fallbackReasons.push(
      `Bank templat luring hanya memiliki ${actualPGCount}/${req.jumlahPG} PG, ${actualPGKCount}/${req.jumlahPGK} PGK, dan ${actualUraianCount}/${req.jumlahUraian} Uraian unik tanpa duplikasi. Gunakan Gemini AI untuk jumlah soal lebih besar.`
    );
  }

  // Pola rotasi kunci jawaban yang seimbang (A, C, B, D, [E])
  const rotationOrder = isSMA ? [0, 2, 1, 3, 4] : [0, 2, 1, 3];

  // 1. Susun Soal Pilihan Ganda (PG) unik tanpa duplikasi kloning modulo
  for (let i = 0; i < actualPGCount; i++) {
    const tpl = uniquePG[i];
    const targetKeyIdx = rotationOrder[i % rotationOrder.length];
    const balanced = balanceOptionAndKey(tpl, optionLetters, targetKeyIdx);
    const tpBinding = resolveTPBinding(currentNo - 1);

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
      difficultyLevel: req.difficultyLevel,
      ...tpBinding,
    } as SoalPilihanGanda);
    currentNo++;
  }

  // 2. Susun Soal Pilihan Ganda Kompleks (AKM) unik
  for (let i = 0; i < actualPGKCount; i++) {
    const tpl = uniquePGK[i];
    const tpBinding = resolveTPBinding(currentNo - 1);

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
      difficultyLevel: req.difficultyLevel,
      ...tpBinding,
    } as SoalPilihanGandaKompleks);
    currentNo++;
  }

  // 3. Susun Soal Uraian unik
  for (let i = 0; i < actualUraianCount; i++) {
    const tpl = uniqueUraian[i];
    const tpBinding = resolveTPBinding(currentNo - 1);

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
      difficultyLevel: req.difficultyLevel,
      ...tpBinding,
    } as SoalUraian);
    currentNo++;
  }

  // 4. Rubrik KKTP (hanya dibuat jika req.sertakanRubrik !== false, dengan interval standar 0-60/61-70/71-85/86-100)
  const rubrikKKTP: KriteriaRubrik[] =
    req.sertakanRubrik !== false
      ? [
          {
            tujuanPembelajaran:
              req.tujuanPembelajaranInput ||
              `Peserta didik mampu memahami struktur konsep, menganalisis informasi, dan memecahkan permasalahan kontekstual pada materi ${req.materiPokok}.`,
            buktiKetercapaian: `Ketepatan menjawab soal pemahaman konsep, ketelitian menganalisis pernyataan stimulus AKM, serta kelengkapan argumen pada soal uraian ${req.materiPokok}.`,
            perluBimbingan: `Belum mampu mengidentifikasi konsep dasar dan ciri utama pada materi ${req.materiPokok}; memerlukan pendampingan langsung dan remedial terarah (Skor ${UNIFIED_KKTP_INTERVALS.perluBimbingan}).`,
            cukup: `Mampu mengidentifikasi konsep dasar ${req.materiPokok}, namun masih kurang teliti saat menganalisis soal berbasis bacaan/kasus (Skor ${UNIFIED_KKTP_INTERVALS.cukup}).`,
            baik: `Mampu memahami struktur konsep dan menganalisis sebagian besar soal stimulus serta menyusun jawaban uraian dengan tepat dan mandiri (Skor ${UNIFIED_KKTP_INTERVALS.baik}).`,
            sangatBaik: `Sangat mahir menganalisis soal penalaran kritis (HOTS), menguasai kaidah/rumus secara tuntas, serta mampu menyusun jawaban uraian secara sistematis dan kreatif (Skor ${UNIFIED_KKTP_INTERVALS.sangatBaik}).`,
          },
        ]
      : [];

  const isEnglish = req.mataPelajaran.toLowerCase().includes('inggris');
  const tujuanList =
    tpMap.length > 0
      ? tpMap.map((tp) => tp.deskripsi).filter(Boolean)
      : [req.tujuanPembelajaranInput || bank.tujuanPembelajaranDefault];

  const baseDoc: AsesmenDokumen = {
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
    rombel: req.rombel,
    semester: req.semester,
    schoolId: req.schoolId,
    tipeAsesmen: req.tipeAsesmen,
    alokasiWaktu: req.alokasiWaktu,
    tahunAjaran: req.tahunAjaran || '2026/2027',
    namaSekolah: req.namaSekolah || 'Satuan Pendidikan Kurikulum Merdeka',
    namaPenyusun: req.namaGuru || 'Guru Mata Pelajaran',
    capaianPembelajaran: bank.capaianPembelajaran,
    tujuanPembelajaran: tujuanList,
    tpIds: tpMap.map((t) => t.id),
    subTpIds: req.subTpIds,
    tpMap,
    materiPokok: req.materiPokok,
    profilPelajarPancasila: ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
    generationSource: isGeneralFallback ? 'adaptive_fallback' : 'curated_bank',
    usedFallback: fallbackReasons.length > 0,
    fallbackReason: fallbackReasons.length > 0 ? fallbackReasons.join(' ') : undefined,
    difficultyLevel: req.difficultyLevel,
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

  return enrichDocWithQualityAndCognitive(baseDoc, {
    requestedLevel: req.levelKognitif,
  });
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
  const existingNorms = new Set(
    (assessment.soalList || []).map((s) => normalizeQuestionText(s.pertanyaan))
  );
  const randomOffset = Math.floor(Math.random() * 10) + targetSoal.nomor + 1;

  if (targetSoal.tipe === 'pilihan_ganda') {
    const unused = bank.pgPool.filter((tpl) => !existingNorms.has(normalizeQuestionText(tpl.pertanyaan)));
    const candidatePool = unused.length > 0 ? unused : bank.pgPool;
    const tpl = candidatePool[randomOffset % candidatePool.length];
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
      tpId: targetSoal.tpId,
      tpKode: targetSoal.tpKode,
      subTpId: targetSoal.subTpId,
    } as SoalPilihanGanda;
  }

  if (targetSoal.tipe === 'pilihan_ganda_kompleks') {
    const unused = bank.pgkPool.filter((tpl) => !existingNorms.has(normalizeQuestionText(tpl.pertanyaan)));
    const candidatePool = unused.length > 0 ? unused : bank.pgkPool;
    const tpl = candidatePool[randomOffset % candidatePool.length];
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
      tpId: targetSoal.tpId,
      tpKode: targetSoal.tpKode,
      subTpId: targetSoal.subTpId,
    } as SoalPilihanGandaKompleks;
  }

  const unusedUr = bank.uraianPool.filter((tpl) => !existingNorms.has(normalizeQuestionText(tpl.pertanyaan)));
  const candidateUrPool = unusedUr.length > 0 ? unusedUr : bank.uraianPool;
  const tpl = candidateUrPool[randomOffset % candidateUrPool.length];
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
    tpId: targetSoal.tpId,
    tpKode: targetSoal.tpKode,
    subTpId: targetSoal.subTpId,
  } as SoalUraian;
}

export function getQuestionBankForRequest(
  req: GenerationRequest,
  isSMA: boolean
): QuestionBank {
  return resolveDomainQuestionBank(req, isSMA).bank;
}

function resolveDomainQuestionBank(
  req: GenerationRequest,
  isSMA: boolean
): { bank: QuestionBank; isGeneralFallback: boolean } {
  const lowerMapel = req.mataPelajaran.toLowerCase();
  const lowerMateri = req.materiPokok.toLowerCase();
  const isSD = isSDRequest(req);
  const isNonIslamAgama = /kristen|katolik|protestan|hindu|buddha|konghucu|khonghucu/.test(lowerMapel);

  // 1. BAHASA INGGRIS SD (Kelas 1–6)
  if (lowerMapel.includes('inggris') && isSD) {
    return { bank: buildSDEnglishQuestionBank(req), isGeneralFallback: false };
  }

  // 2. BAHASA INGGRIS — DESCRIPTIVE TEXT (SMP / SMA / SMK)
  if (
    lowerMateri.includes('descriptive') ||
    (lowerMapel.includes('inggris') && lowerMateri.includes('deskripsi'))
  ) {
    return { bank: buildDescriptiveEnglishBank(), isGeneralFallback: false };
  }

  // 3. BAHASA INGGRIS — PROCEDURE / RECOUNT / NARRATIVE / EXPOSITION (SMP / SMA / SMK)
  if (lowerMapel.includes('inggris')) {
    return { bank: buildOtherEnglishQuestionBank(req, lowerMateri), isGeneralFallback: false };
  }

  // 4. MATEMATIKA (SD / SMP / SMA / SMK)
  if (lowerMapel.includes('matematika')) {
    return { bank: buildMathQuestionBank(req, lowerMateri), isGeneralFallback: false };
  }

  // 5. BAHASA INDONESIA
  if (lowerMapel.includes('indonesia')) {
    return { bank: buildIndonesianQuestionBank(req, lowerMateri), isGeneralFallback: false };
  }

  // 6. IPA / IPAS / FISIKA / KIMIA / BIOLOGI
  if (
    lowerMapel.includes('ipa') ||
    lowerMapel.includes('fisika') ||
    lowerMapel.includes('kimia') ||
    lowerMapel.includes('biologi')
  ) {
    return { bank: buildScienceQuestionBank(req, lowerMapel, lowerMateri), isGeneralFallback: false };
  }

  // 7. PAI & MADRASAH (hanya Islam, tidak menimpa Pendidikan Agama lain)
  if (
    !isNonIslamAgama &&
    (lowerMapel.includes('agama') ||
      lowerMapel.includes('pai') ||
      lowerMapel.includes('fikih') ||
      lowerMapel.includes('quran') ||
      lowerMapel.includes('hadis') ||
      lowerMapel.includes('akidah') ||
      lowerMapel.includes('kebudayaan islam') ||
      lowerMapel.includes('arab'))
  ) {
    return { bank: buildIslamicMadrasahQuestionBank(req, lowerMapel, lowerMateri), isGeneralFallback: false };
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
    return { bank: buildPancasilaQuestionBank(req, isSD, isSMA), isGeneralFallback: false };
  }

  // 9. PJOK / PENDIDIKAN JASMANI, OLAHRAGA, & KESEHATAN
  if (
    lowerMapel.includes('pjok') ||
    lowerMapel.includes('olahraga') ||
    lowerMapel.includes('jasmani') ||
    lowerMapel.includes('penjaskes')
  ) {
    return { bank: buildPJOKQuestionBank(req, isSD, isSMA), isGeneralFallback: false };
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
    return { bank: buildSeniPrakaryaQuestionBank(req, isSD, isSMA), isGeneralFallback: false };
  }

  // 11. IPS / SEJARAH / EKONOMI / GEOGRAFI / SOSIOLOGI
  if (
    lowerMapel.includes('ips') ||
    lowerMapel.includes('sejarah') ||
    lowerMapel.includes('ekonomi') ||
    lowerMapel.includes('geografi') ||
    lowerMapel.includes('sosiologi')
  ) {
    return { bank: buildIPSQuestionBank(req, isSD, isSMA), isGeneralFallback: false };
  }

  // 12. INFORMATIKA & KEJURUAN / PKK (KEWIRAUSAHAAN)
  if (
    lowerMapel.includes('informatika') ||
    lowerMapel.includes('komputer') ||
    lowerMapel.includes('tik') ||
    lowerMapel.includes('pkk') ||
    lowerMapel.includes('kewirausahaan')
  ) {
    return { bank: buildInformatikaPKKQuestionBank(req, isSD, isSMA), isGeneralFallback: false };
  }

  // 13. MAPEL LAINNYA (Fallback Kerangka Kontekstual dengan tanda wajib tinjau)
  return { bank: buildContextualGeneralQuestionBank(req, isSMA), isGeneralFallback: true };
}

