import type { RangkumanDokumen } from '../types/summary';

const STORAGE_KEY_RANGKUMAN = 'asesmerdeka_bank_rangkuman';
const MAX_BANK_RANGKUMAN_ITEMS = 50;

function safeSaveRangkumanList(list: RangkumanDokumen[]): void {
  const capped = list.slice(0, MAX_BANK_RANGKUMAN_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY_RANGKUMAN, JSON.stringify(capped));
  } catch (err) {
    console.warn('Kuota localStorage hampir penuh, memangkas arsip lama Rangkuman:', err);
    try {
      const emergencyCapped = capped.slice(0, Math.max(5, Math.floor(capped.length / 2)));
      localStorage.setItem(STORAGE_KEY_RANGKUMAN, JSON.stringify(emergencyCapped));
    } catch (innerErr) {
      console.error('Gagal menyimpan ke Bank Rangkuman karena batas penyimpanan peramban:', innerErr);
    }
  }
}

export function getBankRangkuman(): RangkumanDokumen[] {
  const raw = localStorage.getItem(STORAGE_KEY_RANGKUMAN);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RangkumanDokumen[]) : [];
    } catch {
      // fallback
    }
  }
  return [];
}

export function saveToBankRangkuman(doc: RangkumanDokumen): void {
  const list = getBankRangkuman();
  const existingIdx = list.findIndex((item) => item.id === doc.id);
  let updated: RangkumanDokumen[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = doc;
  } else {
    updated = [doc, ...list];
  }
  safeSaveRangkumanList(updated);
}

export function deleteFromBankRangkuman(id: string): RangkumanDokumen[] {
  const list = getBankRangkuman();
  const updated = list.filter((item) => item.id !== id);
  safeSaveRangkumanList(updated);
  return updated;
}

export function createInitialSampleRangkuman(): RangkumanDokumen {
  return {
    id: 'RNG-FOTOSINTESIS-SAMPLE',
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    judul: '🌿 Dapur Rahasia Tumbuhan Hijau: Menyingkap Keajaiban Fotosintesis',
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    jenjangFase: 'Fase B (Kelas 3-4 SD)',
    kelas: '4',
    topik: 'Fotosintesis dan Rantai Makanan',
    sumberAsal: 'keinginan_user',
    gayaBahasa: 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)',
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
    faktaMenarik: [
      'Tahukah Kamu? Lebih dari 70% oksigen di bumi kita sebenarnya dihasilkan oleh fitoplankton (tumbuhan mikroskopis di lautan) yang juga berfotosintesis!',
      'Tahukah Kamu? Jika tidak ada fotosintesis di bumi, semua hewan dan manusia akan kehabisan makanan dan oksigen dalam waktu singkat!'
    ],
    glosarium: [
      { istilah: 'Klorofil', makna: 'Zat hijau pada daun yang bertugas menangkap sinar matahari.' },
      { istilah: 'Stomata', makna: 'Mulut kecil pada daun tempat pertukaran udara (masuknya CO2 dan keluarnya O2).' },
      { istilah: 'Glukosa', makna: 'Zat gula sederhana yang menjadi makanan dan energi bagi tumbuhan.' }
    ],
    kuisKilat: [
      { nomor: 1, pertanyaan: 'Apa 3 bahan utama yang diperlukan tumbuhan untuk fotosintesis?', jawaban: 'Air, Karbon Dioksida (CO2), dan Cahaya Matahari.' },
      { nomor: 2, pertanyaan: 'Gas apa yang dilepaskan tumbuhan dan sangat penting bagi pernapasan kita?', jawaban: 'Gas Oksigen (O2).' }
    ],
    pesanInspirasi: 'Setiap kali kamu melihat pohon rindang, ucapkan terima kasih karena mereka telah bekerja keras memasak oksigen segar untuk kita hirup setiap detik! 🌱'
  };
}

