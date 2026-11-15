import type { RangkumanDokumen } from '../types/summary';
import {
  buildBankRangkumanStorageKey,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';
import { inferJenjangFromFaseString } from './bankSoalStorage';

export const LEGACY_BANK_RANGKUMAN_KEY = 'asesmerdeka_bank_rangkuman';
const BANK_RANGKUMAN_V2_PREFIX = 'asesmerdeka_bank_rangkuman_v2__';
const MAX_BANK_RANGKUMAN_PER_SCOPE = 50;

function readActiveProfileFromStorage(): AcademicProfileLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('asesmerdeka_school_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AcademicProfileLike) : null;
  } catch {
    return null;
  }
}

export function buildScopeForRangkumanDoc(
  doc: Partial<RangkumanDokumen>,
  profile?: AcademicProfileLike | null
): AcademicProfileLike {
  const active = profile || readActiveProfileFromStorage();
  return {
    schoolId: doc.schoolId || active?.schoolId,
    namaSekolah: active?.namaSekolah,
    tahunAjaran: doc.tahunAjaran || active?.tahunAjaran,
    jenjang:
      profile?.jenjang ||
      inferJenjangFromFaseString(doc.jenjangFase, doc.kelas) ||
      active?.jenjang,
    kelasUtama: doc.kelas || active?.kelasUtama,
    mataPelajaranUtama: doc.mataPelajaran || active?.mataPelajaranUtama,
    semester: doc.semester || active?.semester,
  };
}

function safeSaveRangkumanList(storageKey: string, list: RangkumanDokumen[]): boolean {
  const capped = list.slice(0, MAX_BANK_RANGKUMAN_PER_SCOPE);
  try {
    localStorage.setItem(storageKey, JSON.stringify(capped));
    return true;
  } catch (err) {
    console.warn('Kuota localStorage penuh saat menyimpan Bank Rangkuman:', err);
    return false;
  }
}

export function getBankRangkuman(profile?: AcademicProfileLike | null): RangkumanDokumen[] {
  if (typeof localStorage === 'undefined') return [];

  if (profile) {
    const scopedKey = buildBankRangkumanStorageKey(profile);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as RangkumanDokumen[];
      } catch {
        // ignore
      }
    }
    return [];
  }

  const active = readActiveProfileFromStorage();
  if (active) {
    const activeKey = buildBankRangkumanStorageKey(active);
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as RangkumanDokumen[];
      } catch {
        // ignore
      }
    }
  }

  const rawLegacy = localStorage.getItem(LEGACY_BANK_RANGKUMAN_KEY);
  if (rawLegacy) {
    try {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) return parsed as RangkumanDokumen[];
    } catch {
      // ignore
    }
  }
  return [];
}

export function getAllScopedBankRangkuman(): RangkumanDokumen[] {
  if (typeof localStorage === 'undefined') return [];
  const byId = new Map<string, RangkumanDokumen>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BANK_RANGKUMAN_V2_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) {
        for (const doc of parsed as RangkumanDokumen[]) {
          if (doc && doc.id && !byId.has(doc.id)) {
            byId.set(doc.id, doc);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_BANK_RANGKUMAN_KEY) || '[]');
    if (Array.isArray(legacy)) {
      for (const doc of legacy as RangkumanDokumen[]) {
        if (doc && doc.id && !byId.has(doc.id)) {
          byId.set(doc.id, doc);
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(byId.values());
}

export function saveToBankRangkuman(
  doc: RangkumanDokumen,
  profile?: AcademicProfileLike | null
): void {
  if (!doc || !doc.id) return;
  const effectiveProfile = profile || buildScopeForRangkumanDoc(doc, readActiveProfileFromStorage());
  const ctx = resolveAcademicContext(effectiveProfile);

  const stampedDoc: RangkumanDokumen = {
    ...doc,
    schoolId: doc.schoolId || ctx.schoolId,
    tahunAjaran: doc.tahunAjaran || ctx.tahunAjaran,
    semester: doc.semester || ctx.semester,
  };

  const storageKey = buildBankRangkumanStorageKey(effectiveProfile);
  const currentList = getBankRangkuman(effectiveProfile);
  const existingIdx = currentList.findIndex((item) => item.id === stampedDoc.id);
  let updated: RangkumanDokumen[];
  if (existingIdx >= 0) {
    updated = [...currentList];
    updated[existingIdx] = stampedDoc;
  } else {
    updated = [stampedDoc, ...currentList];
  }
  safeSaveRangkumanList(storageKey, updated);
}

export function deleteFromBankRangkuman(
  id: string,
  profile?: AcademicProfileLike | null
): RangkumanDokumen[] {
  if (typeof localStorage === 'undefined') return [];

  if (profile) {
    const storageKey = buildBankRangkumanStorageKey(profile);
    const list = getBankRangkuman(profile);
    const updated = list.filter((item) => item.id !== id);
    safeSaveRangkumanList(storageKey, updated);
    return updated;
  }

  const active = readActiveProfileFromStorage();
  if (active) {
    const activeKey = buildBankRangkumanStorageKey(active);
    const activeList = getBankRangkuman(active);
    const filtered = activeList.filter((item) => item.id !== id);
    if (filtered.length !== activeList.length) {
      safeSaveRangkumanList(activeKey, filtered);
      return filtered;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BANK_RANGKUMAN_V2_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) {
        const filtered = (parsed as RangkumanDokumen[]).filter((item) => item.id !== id);
        if (filtered.length !== parsed.length) {
          safeSaveRangkumanList(key, filtered);
          return filtered;
        }
      }
    } catch {
      // ignore
    }
  }

  return getBankRangkuman();
}

export function createInitialSampleRangkuman(): RangkumanDokumen {
  return {
    id: 'RNG-FOTOSINTESIS-SAMPLE',
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    judul: '🌿 Dapur Rahasia Tumbuhan Hijau: Menyingkap Keajaiban Fotosintesis (Contoh Simulasi)',
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    jenjangFase: 'Fase B (Kelas 3-4 SD)',
    kelas: '4',
    topik: 'Fotosintesis dan Rantai Makanan',
    sumberAsal: 'keinginan_user',
    gayaBahasa: 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)',
    draftSource: 'sample_demo',
    usedFallback: false,
    isSimulated: true,
    ringkasanSatuKalimat: 'Tumbuhan adalah koki alam semesta yang memasak makanannya sendiri menggunakan sinar matahari, air dari tanah, dan udara karbon dioksida!',
    petaKonsep: [
      '1. Bahan Baku (Air + CO2)',
      '2. Kompor Alami (Cahaya Matahari)',
      '3. Klorofil Si Panci Hijau',
      '4. Hidangan Jadi (Glukosa + Oksigen)'
    ],
    poinUtama: [
      {
        judul: '1. Apa Saja Bahan Belanjaan Tumbuhan?',
        penjelasan: 'Untuk bisa "memasak", tumbuhan membutuhkan 3 bahan utama yang diambil langsung dari alam sekitarnya.',
        analogi: 'Mirip seperti Ibu yang butuh beras, air, dan api untuk memasak nasi di dapur!',
        poinKunci: [
          'Air (H2O): Diserap oleh akar dari dalam tanah lalu dialirkan ke daun.',
          'Karbon Dioksida (CO2): Gas dari udara yang dihirup lewat mulut daun (stomata).',
          'Cahaya Matahari: Sumber energi yang menyalakan proses memasak.'
        ]
      },
      {
        judul: '2. Di Mana Dapur Tumbuhan Berada?',
        penjelasan: 'Proses memasak ini terjadi di dalam daun, khususnya pada bagian sel yang memiliki zat hijau daun bernama Klorofil.',
        analogi: 'Klorofil itu seperti panel surya mini canggih di atap rumah yang menangkap sinar matahari.',
        poinKunci: [
          'Klorofil menyerap cahaya matahari dan mengubahnya menjadi energi kimia.',
          'Daun memiliki pori-pori kecil bernama stomata untuk keluar-masuk udara.'
        ]
      },
      {
        judul: '3. Apa Makanan yang Dihasilkan?',
        penjelasan: 'Hasil dari fotosintesis adalah Karbohidrat (Glukosa/Gula) sebagai sumber energi tumbuhan, dan Oksigen (O2) yang dilepaskan ke udara.',
        analogi: 'Tumbuhan makan kue buatannya sendiri untuk tumbuh besar, dan memberi bonus oksigen gratis agar kita dan hewan bisa bernapas!',
        poinKunci: [
          'Glukosa disimpan sebagai cadangan makanan di buah, biji, umbi, atau batang.',
          'Oksigen dilepaskan ke udara sehingga bumi tetap sejuk dan manusia bisa bernapas.'
        ]
      }
    ],
    rumusAtauPola: [
      { label: 'Reaksi Sederhana', isi: 'Air (H2O) + Karbon Dioksida (CO2) --(Cahaya + Klorofil)--> Glukosa + Oksigen' },
      { label: 'Jalur Masuk Bahan', isi: 'Air masuk dari akar, CO2 masuk melalui stomata daun.' }
    ],
    contohKonkret: {
      judulContoh: 'Mengapa daun yang ditutup kertas timah tidak membentuk pati?',
      teksContoh: 'Bagian daun yang tidak terkena sinar matahari tidak menerima energi cahaya untuk mengubah air dan CO2 menjadi glukosa.',
      bedahAnalisis: [
        'Klorofil tetap ada, air dan CO2 tersedia, tetapi energi pemicu (cahaya) terhalang.',
        'Percobaan Sachs membuktikan bagian daun terkena cahaya berubah biru kehitaman saat ditetesi iodin.'
      ]
    },
    tipsUjian: [
      'Ingat bahwa fotosintesis menghasilkan glukosa sebagai makanan tumbuhan dan oksigen sebagai hasil samping.',
      'Bedakan stomata (tempat keluar-masuk gas) dan klorofil (penangkap energi cahaya).'
    ],
    faktaMenarik: [
      'Fitoplankton di lautan berperan menghasilkan sebagian besar oksigen di atmosfer Bumi bersama tumbuhan darat.',
      'Warna hijau daun tampak karena klorofil memantulkan spektrum cahaya hijau dan menyerap cahaya merah serta biru.'
    ],
    glosarium: [
      { istilah: 'Klorofil', makna: 'Zat hijau daun yang menyerap energi cahaya matahari.' },
      { istilah: 'Stomata', makna: 'Pori-pori mikroskopis di daun sebagai jalur pertukaran gas.' },
      { istilah: 'Glukosa', makna: 'Gula sederhana hasil fotosintesis sebagai sumber energi tumbuhan.' }
    ],
    kuisKilat: [
      {
        nomor: 1,
        pertanyaan: 'Dari manakah tumbuhan menyerap air dan karbon dioksida untuk fotosintesis?',
        jawaban: 'Air diserap oleh akar dari tanah, sedangkan karbon dioksida diserap melalui stomata daun.'
      },
      {
        nomor: 2,
        pertanyaan: 'Mengapa fotosintesis umumnya tidak berlangsung optimal pada malam hari?',
        jawaban: 'Karena reaksi terang fotosintesis memerlukan energi cahaya matahari.'
      }
    ],
    pesanInspirasi: 'Seperti tumbuhan yang tekun memasak manfaat bagi sekitarnya, belajar setiap hari akan menumbuhkan ilmu dan kebaikan!'
  };
}
