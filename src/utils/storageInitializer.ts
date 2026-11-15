import type { AsesmenDokumen, GenerationRequest, JenjangFase } from '../types/assessment';
import type { RangkumanDokumen } from '../types/summary';
import type { SchoolProfile } from './schoolProfileStorage';
import { getBankSoal, saveToBankSoal } from './bankSoalStorage';
import {
  getBankRangkuman,
  saveToBankRangkuman,
  createInitialSampleRangkuman,
} from './bankRangkumanStorage';
import { buildSmartCurriculumRangkuman } from './rangkumanKnowledgeEngine';
import { buildSmartCurriculumAsesmen } from './asesmenKnowledgeEngine';
import { deriveDefaultFase } from './storageIdentity';

export function loadAndUpgradeBankSoal(profile?: SchoolProfile): AsesmenDokumen[] {
  const rawBank = getBankSoal(profile);
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
        semester: doc.semester,
        tahunAjaran: doc.tahunAjaran,
        schoolId: doc.schoolId,
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
      rebuilt.isSimulated = doc.isSimulated;
      saveToBankSoal(rebuilt, profile);
      return rebuilt;
    }
    return doc;
  });
}

export function loadOrInitRangkuman(profile?: SchoolProfile): RangkumanDokumen {
  const savedRangkumanList = getBankRangkuman(profile);
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
        schoolId: latest.schoolId,
        tahunAjaran: latest.tahunAjaran,
        semester: latest.semester,
        tpId: latest.tpId,
        tpKode: latest.tpKode,
      });
      upgraded.id = latest.id;
      upgraded.isSimulated = latest.isSimulated;
      saveToBankRangkuman(upgraded, profile);
      return upgraded;
    }
    return latest;
  }

  // Jangan menyuntikkan contoh IPAS SD ke ruang penyimpanan kelas/mapel lain secara diam-diam.
  // Kembalikan pratinjau contoh simulasi in-memory sesuai profil aktif jika tersedia,
  // atau contoh simulasi berlabel isSimulated: true.
  if (profile && profile.mataPelajaranUtama && profile.kelasUtama) {
    const fase = deriveDefaultFase(profile.jenjang, profile.kelasUtama) as JenjangFase;
    const previewDoc = buildSmartCurriculumRangkuman({
      modeInput: 'keinginan_user',
      topik: `Pengantar Materi ${profile.mataPelajaranUtama}`,
      mataPelajaran: profile.mataPelajaranUtama,
      jenjangFase: fase,
      kelas: profile.kelasUtama,
      gayaBahasa: profile.jenjang === 'SD/MI'
        ? 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)'
        : 'Struktur Ringkas & Poin Kunci (Infografis)',
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
      semester: profile.semester,
    });
    return {
      ...previewDoc,
      id: 'RNG-PREVIEW-SIMULASI',
      draftSource: 'sample_demo',
      isSimulated: true,
    };
  }

  return createInitialSampleRangkuman();
}

export async function createDefaultInitialAssessment(
  savedProfile: SchoolProfile
): Promise<AsesmenDokumen> {
  const fase = deriveDefaultFase(savedProfile.jenjang, savedProfile.kelasUtama) as JenjangFase;
  const mapel = savedProfile.mataPelajaranUtama || 'Matematika';
  const kelas = savedProfile.kelasUtama || '8';
  const defaultRequest: GenerationRequest = {
    mataPelajaran: mapel,
    jenjangFase: fase,
    kelas,
    semester: savedProfile.semester,
    tahunAjaran: savedProfile.tahunAjaran,
    schoolId: savedProfile.schoolId,
    tipeAsesmen: 'Formatif (Proses Pembelajaran)',
    materiPokok: `Materi Inti ${mapel} Kelas ${kelas}`,
    tujuanPembelajaranInput:
      `Peserta didik mampu memahami dan menerapkan konsep inti ${mapel} pada konteks sehari-hari.`,
    jumlahPG: 3,
    jumlahPGK: 1,
    jumlahUraian: 1,
    levelKognitif: 'Campuran Berimbang',
    sertakanRubrik: true,
    alokasiWaktu: '40 Menit',
    namaSekolah: savedProfile.namaSekolah,
    namaGuru: savedProfile.namaGuru,
  };

  // Gunakan penyusun luring berlabel simulasi/sampel (tidak memanggil API AI secara otomatis saat boot)
  const doc = buildSmartCurriculumAsesmen(defaultRequest);
  return {
    ...doc,
    id: `ASM-SAMPLE-${(savedProfile.schoolId || 'local').slice(-6)}`,
    judul: `${doc.judul} (Contoh Simulasi)`,
    generationSource: 'sample_demo',
    isSimulated: true,
  };
}
