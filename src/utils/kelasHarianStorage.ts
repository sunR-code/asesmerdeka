import type { SchoolProfile, CustomTPItem } from './schoolProfileStorage';
import type {
  SiswaItem,
  PresensiPertemuan,
  JurnalMengajarItem,
  NilaiSiswaItem,
  KelasHarianData,
} from '../types/kelasHarian';

const DEFAULT_SISWA_LIST: Omit<SiswaItem, 'id' | 'noUrut'>[] = [
  { nis: '2425001', nama: 'Aditia Pratama', jenisKelamin: 'L' },
  { nis: '2425002', nama: 'Aisyah Putri Rahmadani', jenisKelamin: 'P' },
  { nis: '2425003', nama: 'Ahmad Rizky Fauzan', jenisKelamin: 'L' },
  { nis: '2425004', nama: 'Amanda Salsa Bella', jenisKelamin: 'P' },
  { nis: '2425005', nama: 'Andika Bagus Setiawan', jenisKelamin: 'L' },
  { nis: '2425006', nama: 'Annisa Nurul Fadilah', jenisKelamin: 'P' },
  { nis: '2425007', nama: 'Arya Bayu Samudra', jenisKelamin: 'L' },
  { nis: '2425008', nama: 'Aurelia Citra Dewi', jenisKelamin: 'P' },
  { nis: '2425009', nama: 'Bagas Dwi Cahyono', jenisKelamin: 'L' },
  { nis: '2425010', nama: 'Cantika Maharani', jenisKelamin: 'P' },
  { nis: '2425011', nama: 'Daffa Ibnu Sina', jenisKelamin: 'L' },
  { nis: '2425012', nama: 'Dewi Ayu Lestari', jenisKelamin: 'P' },
  { nis: '2425013', nama: 'Dimas Arya Saputra', jenisKelamin: 'L' },
  { nis: '2425014', nama: 'Fadhil Muhammad', jenisKelamin: 'L' },
  { nis: '2425015', nama: 'Fatimah Zahra', jenisKelamin: 'P' },
  { nis: '2425016', nama: 'Gilang Ramadhan', jenisKelamin: 'L' },
  { nis: '2425017', nama: 'Hani Safitri', jenisKelamin: 'P' },
  { nis: '2425018', nama: 'Ilham Maulana', jenisKelamin: 'L' },
  { nis: '2425019', nama: 'Intan Permata Sari', jenisKelamin: 'P' },
  { nis: '2425020', nama: 'Kevin Ardiansyah', jenisKelamin: 'L' },
  { nis: '2425021', nama: 'Laila Ramadhani', jenisKelamin: 'P' },
  { nis: '2425022', nama: 'Muhammad Alif Haidar', jenisKelamin: 'L' },
  { nis: '2425023', nama: 'Nabila Putri Utami', jenisKelamin: 'P' },
  { nis: '2425024', nama: 'Rafi Danendra', jenisKelamin: 'L' },
  { nis: '2425025', nama: 'Raisya Nur Aini', jenisKelamin: 'P' },
  { nis: '2425026', nama: 'Rendy Wahyu Kurniawan', jenisKelamin: 'L' },
  { nis: '2425027', nama: 'Siti Nurhaliza', jenisKelamin: 'P' },
  { nis: '2425028', nama: 'Tegar Prasetyo', jenisKelamin: 'L' },
  { nis: '2425029', nama: 'Vina Novita Sari', jenisKelamin: 'P' },
  { nis: '2425030', nama: 'Zaidan Akbar', jenisKelamin: 'L' },
];

function getStorageKey(profile: SchoolProfile): string {
  const p = profile || ({} as SchoolProfile);
  const cleanSchool = (p.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMapel = (p.mataPelajaranUtama || 'mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (p.kelasUtama || '7').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanRombel = (p.rombelAktif || 'A').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSemester = (p.semester || '1').includes('2') ? 'sem2' : 'sem1';
  return `asesmerdeka_harian_${cleanSchool}_${cleanMapel}_${cleanKelas}_${cleanRombel}_${cleanSemester}`;
}

export function computeNilaiAkhir(
  nilaiFormatif: { [kodeTP: string]: number },
  sts: number,
  sas: number
): { na: number; predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan' } {
  const scores = Object.values(nilaiFormatif);
  const avgFormatif = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
  // Bobot Kurikulum Merdeka: Formatif 50%, STS 25%, SAS 25%
  const na = Math.round(avgFormatif * 0.5 + sts * 0.25 + sas * 0.25);

  let predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan' = 'Baik';
  if (na >= 86) {
    predikat = 'Sangat Baik';
  } else if (na >= 71) {
    predikat = 'Baik';
  } else if (na >= 56) {
    predikat = 'Cukup';
  } else {
    predikat = 'Perlu Bimbingan';
  }

  return { na, predikat };
}

export function generateAutoDeskripsiRapor(
  nilaiFormatif: { [kodeTP: string]: number },
  tpList: CustomTPItem[],
  namaSiswa: string
): string {
  if (tpList.length === 0) {
    return `${namaSiswa} telah mengikuti seluruh rangkaian pembelajaran semester ini dengan baik.`;
  }

  // Cari TP dengan nilai tertinggi dan terendah
  let maxScore = -1;
  let minScore = 999;
  let maxTP: CustomTPItem | null = null;
  let minTP: CustomTPItem | null = null;

  for (const tp of tpList) {
    const score = nilaiFormatif[tp.kode] ?? 75;
    if (score > maxScore) {
      maxScore = score;
      maxTP = tp;
    }
    if (score < minScore) {
      minScore = score;
      minTP = tp;
    }
  }

  // Jika tidak ada data spesifik
  if (!maxTP) maxTP = tpList[0];
  if (!minTP) minTP = tpList[tpList.length - 1];

  const ringkasanMax = maxTP.materiPokok || maxTP.tujuanPembelajaran.slice(0, 60);
  const ringkasanMin = minTP.materiPokok || minTP.tujuanPembelajaran.slice(0, 60);

  if (maxScore >= 85 && minScore >= 80) {
    return `Menunjukkan penguasaan yang sangat memuaskan dan istimewa dalam ${ringkasanMax}, serta konsisten menguasai seluruh capaian pembelajaran dengan sangat baik.`;
  } else if (maxScore >= 75 && minScore < 70) {
    return `Menunjukkan penguasaan yang sangat baik dalam memahami ${ringkasanMax}, namun perlu pendampingan dan latihan tambahan dalam penguasaan materi ${ringkasanMin}.`;
  } else if (maxScore < 70) {
    return `Mulai menunjukkan pemahaman dasar dalam materi ${ringkasanMax}, namun memerlukan bimbingan intensif dan evaluasi bertahap pada materi ${ringkasanMin}.`;
  } else {
    return `Menunjukkan penguasaan yang baik dalam materi ${ringkasanMax}, serta cukup terampil dan aktif dalam ${ringkasanMin}.`;
  }
}

export function generateDefaultPresensi(
  daftarSiswa: SiswaItem[],
  totalPertemuan: number = 16
): PresensiPertemuan[] {
  const result: PresensiPertemuan[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 2); // Set roughly around start of semester

  for (let i = 1; i <= totalPertemuan; i++) {
    const meetingDate = new Date(baseDate);
    meetingDate.setDate(meetingDate.getDate() + (i - 1) * 7); // 1 minggu sekali
    const dateStr = meetingDate.toISOString().split('T')[0];

    const statusMap: { [siswaId: string]: 'H' | 'S' | 'I' | 'A' } = {};
    daftarSiswa.forEach((s, idx) => {
      // 95% hadir secara realistis, beberapa izin/sakit
      if (i === 3 && idx === 4) statusMap[s.id] = 'S';
      else if (i === 6 && idx === 12) statusMap[s.id] = 'I';
      else if (i === 10 && idx === 18) statusMap[s.id] = 'S';
      else statusMap[s.id] = 'H';
    });

    result.push({
      id: `presensi_p${i}`,
      pertemuanKe: i,
      tanggal: dateStr,
      statusMap,
    });
  }

  return result;
}

export function generateDefaultJurnal(
  tpList: CustomTPItem[],
  totalPertemuan: number = 16
): JurnalMengajarItem[] {
  const result: JurnalMengajarItem[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 2);

  for (let i = 1; i <= totalPertemuan; i++) {
    const meetingDate = new Date(baseDate);
    meetingDate.setDate(meetingDate.getDate() + (i - 1) * 7);
    const dateStr = meetingDate.toISOString().split('T')[0];

    const tpIndex = tpList.length > 0 ? (i - 1) % tpList.length : 0;
    const currentTP = tpList[tpIndex];

    const kodeTP = currentTP ? currentTP.kode : `TP.${i}`;
    const materiPokok = currentTP ? currentTP.materiPokok : `Materi Pokok Pertemuan ${i}`;
    const tpText = currentTP ? currentTP.tujuanPembelajaran : `Mencapai tujuan pembelajaran pertemuan ke-${i}`;

    result.push({
      id: `jurnal_p${i}`,
      pertemuanKe: i,
      tanggal: dateStr,
      jamKe: '1 - 3 (07.30 - 09.30)',
      kodeTP,
      materiPokok,
      kegiatanPembelajaran: `Pembelajaran berdiferensiasi dan diskusi kelompok terarah mengenai "${materiPokok}". Siswa aktif mengeksplorasi konsep: ${tpText.slice(0, 80)}. Ditutup dengan refleksi formatif singkat.`,
      siswaTidakHadir: 'Nihil (Semua Hadir)',
      catatanRefleksi: 'Siswa antusias dan aktif berdiskusi. Sebagian siswa memerlukan pendalaman konsep dasar saat kerja kelompok.',
    });
  }

  return result;
}

export function generateDefaultNilai(
  daftarSiswa: SiswaItem[],
  tpList: CustomTPItem[]
): NilaiSiswaItem[] {
  return daftarSiswa.map((siswa, idx) => {
    // Beri variasi nilai yang realistis berkisar antara 72 hingga 95
    const baseScore = 76 + (idx % 8) * 2.5;
    const nilaiFormatif: { [kodeTP: string]: number } = {};

    tpList.forEach((tp, tIdx) => {
      const variation = ((idx + tIdx) % 5) - 2;
      const score = Math.min(98, Math.max(68, Math.round(baseScore + variation)));
      nilaiFormatif[tp.kode] = score;
    });

    const sts = Math.min(97, Math.max(70, Math.round(baseScore + ((idx % 3) - 1))));
    const sas = Math.min(98, Math.max(70, Math.round(baseScore + ((idx % 4) - 1))));
    const { na, predikat } = computeNilaiAkhir(nilaiFormatif, sts, sas);
    const deskripsi = generateAutoDeskripsiRapor(nilaiFormatif, tpList, siswa.nama);

    return {
      siswaId: siswa.id,
      nama: siswa.nama,
      nis: siswa.nis,
      nilaiFormatif,
      nilaiSTS: sts,
      nilaiSAS: sas,
      nilaiAkhir: na,
      predikatKKTP: predikat,
      deskripsiRapor: deskripsi,
    };
  });
}

export function getKelasHarianData(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  const key = getStorageKey(profile);
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      const parsed: KelasHarianData = JSON.parse(stored);
      // Validasi dan lengkapi nilai TP jika ada TP baru yang ditambahkan
      if (parsed.daftarNilai && parsed.daftarNilai.length > 0) {
        parsed.daftarNilai = parsed.daftarNilai.map((item) => {
          let updated = false;
          const formatif = { ...(item.nilaiFormatif || {}) };
          safeTPList.forEach((tp) => {
            if (formatif[tp.kode] === undefined) {
              formatif[tp.kode] = 80;
              updated = true;
            }
          });
          if (updated || !item.deskripsiRapor) {
            const { na, predikat } = computeNilaiAkhir(formatif, item.nilaiSTS || 80, item.nilaiSAS || 80);
            return {
              ...item,
              nilaiFormatif: formatif,
              nilaiAkhir: na,
              predikatKKTP: predikat,
              deskripsiRapor: generateAutoDeskripsiRapor(formatif, safeTPList, item.nama),
            };
          }
          return item;
        });
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse kelas harian data, regenerating default:', e);
    }
  }

  // Buat data default pertama kali
  const daftarSiswa: SiswaItem[] = DEFAULT_SISWA_LIST.map((s, idx) => ({
    id: `siswa_${idx + 1}`,
    noUrut: idx + 1,
    nis: s.nis,
    nama: s.nama,
    jenisKelamin: s.jenisKelamin,
  }));

  const daftarPresensi = generateDefaultPresensi(daftarSiswa, 16);
  const daftarJurnal = generateDefaultJurnal(safeTPList, 16);
  const daftarNilai = generateDefaultNilai(daftarSiswa, safeTPList);

  const initialData: KelasHarianData = {
    rombel: profile?.rombelAktif || 'A',
    mataPelajaran: profile?.mataPelajaranUtama || 'Mata Pelajaran',
    semester: profile?.semester || '1 (Ganjil)',
    tahunAjaran: profile?.tahunAjaran || '2024/2025',
    daftarSiswa,
    daftarPresensi,
    daftarJurnal,
    daftarNilai,
  };

  saveKelasHarianData(profile, initialData);
  return initialData;
}

export function saveKelasHarianData(profile: SchoolProfile, data: KelasHarianData): void {
  const key = getStorageKey(profile);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save kelas harian data:', e);
  }
}

export function resetKelasHarianData(profile: SchoolProfile, tpList: CustomTPItem[]): KelasHarianData {
  const key = getStorageKey(profile);
  localStorage.removeItem(key);
  return getKelasHarianData(profile, tpList);
}

export function applyNewStudentRoster(
  currentData: KelasHarianData,
  newStudents: SiswaItem[],
  tpList: CustomTPItem[],
  resetExistingScores: boolean = false
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  const daftarSiswa = newStudents.map((s, idx) => ({
    ...s,
    noUrut: idx + 1,
  }));

  // Update presensi: ganti penuh dengan daftar siswa baru (hapus semua ID siswa dummy lama)
  const updatedPresensi = currentData.daftarPresensi.map((p) => {
    const newStatusMap: { [siswaId: string]: 'H' | 'S' | 'I' | 'A' } = {};
    daftarSiswa.forEach((s) => {
      newStatusMap[s.id] = resetExistingScores ? 'H' : p.statusMap[s.id] || 'H';
    });
    return {
      ...p,
      statusMap: newStatusMap,
    };
  });

  // Update nilai: ganti penuh dengan daftar siswa baru (hapus semua nilai siswa dummy lama)
  let updatedNilai: NilaiSiswaItem[] = [];
  if (resetExistingScores) {
    updatedNilai = generateDefaultNilai(daftarSiswa, safeTPList);
  } else {
    updatedNilai = daftarSiswa.map((siswa) => {
      // Hanya pertahankan nilai lama jika ID sama ATAU (NIS & Nama sama persis, bukan bentrok NIS dummy)
      const existing = currentData.daftarNilai.find(
        (n) =>
          n.siswaId === siswa.id ||
          (n.nis === siswa.nis && n.nama.trim().toLowerCase() === siswa.nama.trim().toLowerCase())
      );
      if (existing) {
        return {
          ...existing,
          siswaId: siswa.id,
          nama: siswa.nama,
          nis: siswa.nis,
          deskripsiRapor: generateAutoDeskripsiRapor(existing.nilaiFormatif || {}, safeTPList, siswa.nama),
        };
      }
      const defaultFormatif: { [kode: string]: number } = {};
      safeTPList.forEach((tp) => {
        defaultFormatif[tp.kode] = 80;
      });
      const sts = 80;
      const sas = 80;
      const { na, predikat } = computeNilaiAkhir(defaultFormatif, sts, sas);
      return {
        siswaId: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        nilaiFormatif: defaultFormatif,
        nilaiSTS: sts,
        nilaiSAS: sas,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        deskripsiRapor: generateAutoDeskripsiRapor(defaultFormatif, safeTPList, siswa.nama),
      };
    });
  }

  // Bersihkan nama siswa dummy pada kolom siswaTidakHadir di Jurnal Mengajar jika masih bawaan default
  const updatedJurnal = (currentData.daftarJurnal || []).map((j) => {
    if (
      j.siswaTidakHadir === 'Andika Bagus (Sakit)' ||
      j.siswaTidakHadir === 'Dimas Arya (Izin)'
    ) {
      return {
        ...j,
        siswaTidakHadir: 'Nihil (Semua Hadir)',
      };
    }
    return j;
  });

  return {
    ...currentData,
    daftarSiswa,
    daftarPresensi: updatedPresensi,
    daftarNilai: updatedNilai,
    daftarJurnal: updatedJurnal,
  };
}
