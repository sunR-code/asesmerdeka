import type { AsesmenDokumen, GenerationRequest } from '../types/assessment';
import type { RangkumanDokumen } from '../types/summary';
import type { SchoolProfile } from './schoolProfileStorage';
import { getBankSoal, saveToBankSoal } from './bankSoalStorage';
import { getBankRangkuman, saveToBankRangkuman, createInitialSampleRangkuman } from './bankRangkumanStorage';
import { buildSmartCurriculumRangkuman } from './rangkumanKnowledgeEngine';
import { buildSmartCurriculumAsesmen } from './asesmenKnowledgeEngine';
import { generateAsesmen } from '../services/aiGenerator';

export function loadAndUpgradeBankSoal(): AsesmenDokumen[] {
  const rawBank = getBankSoal();
  return rawBank.map((doc) => {
    const firstQ = doc.soalList[0];
    const isOldPlaceholder =
      firstQ &&
      firstQ.tipe === 'pilihan_ganda' &&
      firstQ.pilihan.some((p) => p.teks.includes('Alternatif penyelesaian'));
    if (isOldPlaceholder) {
      const countPG = doc.soalList.filter((s) => s.tipe === 'pilihan_ganda').length || 5;
      const countPGK = doc.soalList.filter((s) => s.tipe === 'pilihan_ganda_kompleks').length || 2;
      const countUr = doc.soalList.filter((s) => s.tipe === 'uraian').length || 2;
      const rebuilt = buildSmartCurriculumAsesmen({
        mataPelajaran: doc.mataPelajaran,
        jenjangFase: doc.jenjangFase,
        kelas: doc.kelas,
        tipeAsesmen: doc.tipeAsesmen,
        materiPokok: doc.materiPokok,
        tujuanPembelajaranInput: doc.tujuanPembelajaran[0] || '',
        jumlahPG: countPG,
        jumlahPGK: countPGK,
        jumlahUraian: countUr,
        levelKognitif: 'Campuran Berimbang',
        sertakanRubrik: true,
        alokasiWaktu: doc.alokasiWaktu,
        namaSekolah: doc.namaSekolah,
        namaGuru: doc.namaPenyusun,
      });
      rebuilt.id = doc.id;
      saveToBankSoal(rebuilt);
      return rebuilt;
    }
    return doc;
  });
}

export function loadOrInitRangkuman(): RangkumanDokumen {
  const savedRangkumanList = getBankRangkuman();
  if (savedRangkumanList.length > 0) {
    const latest = savedRangkumanList[0];
    if (!latest.rumusAtauPola || !latest.contohKonkret) {
      const upgraded = buildSmartCurriculumRangkuman({
        modeInput: latest.sumberAsal,
        topik: latest.topik,
        mataPelajaran: latest.mataPelajaran,
        jenjangFase: latest.jenjangFase,
        kelas: latest.kelas,
        gayaBahasa: latest.gayaBahasa,
      });
      saveToBankRangkuman(upgraded);
      return upgraded;
    }
    return latest;
  }

  const initialSample = createInitialSampleRangkuman();
  saveToBankRangkuman(initialSample);
  return initialSample;
}

export async function createDefaultInitialAssessment(savedProfile: SchoolProfile): Promise<AsesmenDokumen> {
  const defaultRequest: GenerationRequest = {
    mataPelajaran: 'Matematika',
    jenjangFase: 'Fase D (Kelas 7-9 SMP)',
    kelas: '8',
    tipeAsesmen: 'Sumatif (Tengah Semester / STS)',
    materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
    tujuanPembelajaranInput:
      'Peserta didik dapat menyelesaikan masalah kontekstual yang berkaitan dengan sistem persamaan linear dua variabel.',
    jumlahPG: 3,
    jumlahPGK: 1,
    jumlahUraian: 1,
    levelKognitif: 'Campuran Berimbang',
    sertakanRubrik: true,
    alokasiWaktu: '80 Menit',
    namaSekolah: savedProfile.namaSekolah,
    namaGuru: savedProfile.namaGuru,
  };

  const doc = await generateAsesmen(defaultRequest);
  saveToBankSoal(doc);
  return doc;
}

