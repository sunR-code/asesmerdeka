import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { Packer } from 'docx';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
import {
  exportBackupDataJson,
  importBackupDataJson,
  saveSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  applyNewStudentRoster,
  classifyPredikatKKTP,
  computeAttendanceRecap,
  computeClassGradeSummary,
  computeERaporStudentSummary,
  computeNilaiAkhir,
  createBlankNilaiItem,
  createEmptyKelasHarianData,
  DEFAULT_BOBOT_NILAI,
  finalizeClassERapor,
  finalizeERaporStudent,
  generateAutoDeskripsiRapor,
  getFormatifScoreForTP,
  getKelasHarianData,
  loadDemoKelasHarianData,
  parseAndValidateStudentImport,
  saveKelasHarianData,
  setFormatifScoreForTP,
  syncJurnalAbsentFromPresensi,
  transferStudentRombel,
  updatePertemuanDate,
  updateStudentIdentity,
  validateBobotKebijakan,
  validateJurnalEntry,
  validateStudentInput,
} from '../kelasHarianStorage';
import { getSupervisiDocumentsReadiness } from '../supervisiStorage';
import { createStyledDocxDocument } from '../docx/docxShared';
import {
  buildDaftarNilaiElements,
  buildJurnalMengajarElements,
  buildPresensiElements,
  buildRekapRaporElements,
} from '../docx/docxKelasHarian';
import { PresensiTab } from '../../components/harian/PresensiTab';
import { JurnalMengajarTab } from '../../components/harian/JurnalMengajarTab';
import { BukuNilaiTab } from '../../components/harian/BukuNilaiTab';
import { AutoDeskripsiRaporTab } from '../../components/harian/AutoDeskripsiRaporTab';
import { ImportSiswaModal } from '../../components/harian/ImportSiswaModal';
import type { KelasHarianData, SiswaItem } from '../../types/kelasHarian';
import * as licenseManager from '../licenseManager';
import {
  pushWorkspaceToCloud,
  pullWorkspaceFromCloud,
  resolveCloudConflict,
} from '../cloudSyncManager';
// @ts-expect-error serverless JS handler tested with mocked req/res
import cloudSyncHandler, { clearLocalDevCloudSyncStore } from '../../../api/cloud-sync.js';

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_uji',
    instansiDinas: 'Dinas Pendidikan Kabupaten Sleman',
    namaSekolah: 'SMP Negeri 4 Sleman',
    alamatSekolah: 'Jl. Magelang Km. 12',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Ratna Kusumawati, S.Pd.',
    nipGuru: '198803122015022001',
    namaKepalaSekolah: 'Drs. Hendra Wijaya, M.Pd.',
    nipKepalaSekolah: '197001101995121002',
    kotaSekolah: 'Sleman',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_task6_mat_8_1',
      kode: '8.1',
      elemen: 'Aljabar',
      materiPokok: 'Sistem Persamaan Linear Dua Variabel',
      tujuanPembelajaran: 'Menyelesaikan SPLDV dengan metode substitusi, eliminasi, dan grafik.',
      arahanRangkuman: 'SPLDV',
      alokasiJP: 12,
      mingguMulai: 1,
      mingguSelesai: 4,
      subTP: [
        {
          id: 'sub_81_a',
          kode: '8.1.1',
          kompetensi: 'Memodelkan masalah SPLDV',
          fokusMateri: 'Model Matematika SPLDV',
          buktiKetercapaian: 'Siswa menuliskan dua persamaan linear dari konteks cerita.',
        },
        {
          id: 'sub_81_b',
          kode: '8.1.2',
          kompetensi: 'Menentukan himpunan penyelesaian',
          fokusMateri: 'Eliminasi dan Substitusi',
          buktiKetercapaian: 'Siswa menemukan nilai variabel secara tepat.',
        },
      ],
    },
    {
      id: 'tpid_task6_mat_8_2',
      kode: '8.2',
      elemen: 'Geometri',
      materiPokok: 'Teorema Pythagoras',
      tujuanPembelajaran: 'Membuktikan Teorema Pythagoras dan menggunakannya untuk jarak koordinat.',
      arahanRangkuman: 'Pythagoras',
      alokasiJP: 10,
      mingguMulai: 5,
      mingguSelesai: 8,
    },
  ];
}

async function extractDocxXml(docElements: ReturnType<typeof buildPresensiElements>, profile: SchoolProfile, title: string, landscape = true): Promise<string> {
  const doc = createStyledDocxDocument(profile, title, docElements, { landscape });
  const blob = await Packer.toBlob(doc);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('word/document.xml tidak ditemukan');
  return xml;
}

describe('Task 6 — Academic Records & e-Rapor Integrity (19 Core Verification Scenarios)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: Tambah siswa baru (dengan NISN & inisialisasi skor kosong tanpa nilai palsu)', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const empty = createEmptyKelasHarianData(profile, tps);

    const newStudent: SiswaItem = {
      id: 'siswa_baru_1',
      noUrut: 1,
      nis: '260101',
      nisn: '0123456789',
      nama: 'Nadia Kartika Putri',
      jenisKelamin: 'P',
      statusAktif: 'aktif',
    };

    const blankNilai = createBlankNilaiItem(newStudent, tps);
    expect(blankNilai.nilaiSTS).toBeNull();
    expect(blankNilai.nilaiSAS).toBeNull();
    expect(blankNilai.nilaiAkhir).toBeNull();
    expect(blankNilai.statusNilai).toBe('belum_dinilai');
    expect(blankNilai.statusRapor).toBe('belum_lengkap');
    expect(blankNilai.nisn).toBe('0123456789');

    const updated = applyNewStudentRoster(empty, [newStudent], tps, false, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    saveKelasHarianData(profile, updated);

    const reloaded = getKelasHarianData(profile, tps);
    expect(reloaded.daftarSiswa).toHaveLength(1);
    expect(reloaded.daftarSiswa[0].nisn).toBe('0123456789');
    expect(reloaded.daftarNilai[0].nilaiSTS).toBeNull();
    expect(reloaded.daftarNilai[0].nilaiAkhir).toBeNull();
    expect(reloaded.daftarNilai[0].statusNilai).toBe('belum_dinilai');
  });

  it('Test 2: Tolak duplikasi NIS / NISN saat tambah atau edit siswa', () => {
    const existing: SiswaItem[] = [
      {
        id: 's1',
        noUrut: 1,
        nis: '260001',
        nisn: '0011223344',
        nama: 'Bima Saputra',
        jenisKelamin: 'L',
        statusAktif: 'aktif',
      },
    ];

    const dupNis = validateStudentInput(
      { nama: 'Siswa Baru', nis: '260001', nisn: '9988776655', jenisKelamin: 'L' },
      existing
    );
    expect(dupNis.valid).toBe(false);
    expect(dupNis.errors.some((e) => e.includes('NIS'))).toBe(true);

    const dupNisn = validateStudentInput(
      { nama: 'Siswa Baru', nis: '260002', nisn: '0011223344', jenisKelamin: 'L' },
      existing
    );
    expect(dupNisn.valid).toBe(false);
    expect(dupNisn.errors.some((e) => e.includes('NISN'))).toBe(true);

    // Edit diri sendiri harus diperbolehkan (editingId mengecualikan row itu sendiri)
    const selfEdit = validateStudentInput(
      { nama: 'Bima Saputra Revisi', nis: '260001', nisn: '0011223344', jenisKelamin: 'L' },
      existing,
      's1'
    );
    expect(selfEdit.valid).toBe(true);
  });

  it('Test 3: Edit identitas siswa tanpa kehilangan riwayat presensi dan nilai', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = {
      id: 'siswa_id_tetap_1',
      noUrut: 1,
      nis: '260010',
      nisn: '0055443322',
      nama: 'Dina Awal',
      jenisKelamin: 'P',
      statusAktif: 'aktif',
    };
    let data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    data.daftarPresensi[0].statusMap[s1.id] = 'S';
    data.daftarPresensi[1].statusMap[s1.id] = 'I';
    data.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP({}, tps[0], 90);
    data.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP(data.daftarNilai[0].nilaiFormatif, tps[1], 80);
    data.daftarNilai[0].nilaiSTS = 85;
    data.daftarNilai[0].nilaiSAS = 88;

    const editRes = updateStudentIdentity(
      data,
      s1.id,
      { nama: 'Dina Maharani', nis: '260011', nisn: '0055443399', jenisKelamin: 'P' },
      tps
    );
    expect(editRes.validation.valid).toBe(true);
    const updated = editRes.updated;
    expect(updated.daftarSiswa[0].nama).toBe('Dina Maharani');
    expect(updated.daftarSiswa[0].nis).toBe('260011');
    expect(updated.daftarSiswa[0].nisn).toBe('0055443399');
    expect(updated.daftarPresensi[0].statusMap[s1.id]).toBe('S');
    expect(updated.daftarPresensi[1].statusMap[s1.id]).toBe('I');
    expect(getFormatifScoreForTP(updated.daftarNilai[0].nilaiFormatif, tps[0])).toBe(90);
    expect(updated.daftarNilai[0].nilaiSTS).toBe(85);
    expect(updated.daftarNilai[0].nama).toBe('Dina Maharani');
    expect(updated.daftarNilai[0].nis).toBe('260011');
    expect(updated.daftarNilai[0].nisn).toBe('0055443399');
    expect(updated.daftarNilai[0].deskripsiRapor).toContain('Sistem Persamaan Linear Dua Variabel');
  });

  it('Test 4: Mutasi siswa ke rombel lain menjaga riwayat kelas asal & memindahkan ID imutabel ke rombel tujuan', () => {
    const profileAsal = makeProfile({ rombelAktif: 'VIII A' });
    const profileTujuan = makeProfile({ rombelAktif: 'VIII B' });
    const tps = makeSampleTPs();

    const s1: SiswaItem = {
      id: 'siswa_mutasi_1',
      noUrut: 1,
      nis: '260021',
      nisn: '1122334455',
      nama: 'Rafka Pratama',
      jenisKelamin: 'L',
      statusAktif: 'aktif',
    };
    const s2: SiswaItem = {
      id: 'siswa_tetap_2',
      noUrut: 2,
      nis: '260022',
      nisn: '1122334456',
      nama: 'Sari Dewi',
      jenisKelamin: 'P',
      statusAktif: 'aktif',
    };

    const asal = applyNewStudentRoster(createEmptyKelasHarianData(profileAsal, tps), [s1, s2], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    asal.daftarPresensi[0].statusMap[s1.id] = 'A';
    asal.daftarNilai[0].nilaiSTS = 77;
    saveKelasHarianData(profileAsal, asal);

    const res = transferStudentRombel(profileAsal, asal, s1.id, 'VIII B', tps, {
      tanggalMutasi: '2026-10-15',
      catatanMutasi: 'Pindah rombel IPA unggulan',
    });

    expect(res.error).toBeUndefined();
    expect(res.transferredStudent?.id).toBe(s1.id);
    expect(res.updated.daftarSiswa.map((s) => s.id)).toEqual(['siswa_tetap_2']);
    expect(res.updated.archivedSiswa).toHaveLength(1);
    expect(res.updated.archivedSiswa?.[0].statusAktif).toBe('pindah_rombel');
    expect(res.updated.archivedSiswa?.[0].rombelTujuan).toBe('VIII B');
    // Riwayat kelas asal tidak terhapus
    expect(res.updated.daftarPresensi[0].statusMap[s1.id]).toBe('A');
    expect(res.updated.daftarNilai.find((n) => n.siswaId === s1.id)?.nilaiSTS).toBe(77);

    // Rombel tujuan menerima siswa dengan ID imutabel yang sama dan rombelAsal
    const targetData = getKelasHarianData(profileTujuan, tps);
    const activeMoved = targetData.daftarSiswa.find((s) => s.id === s1.id);
    expect(activeMoved).toBeTruthy();
    expect(activeMoved?.rombelAsal).toBe('VIII A');
  });

  it('Test 5: Input presensi H/S/I/A dan simpan persisten ke storage', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = { id: 's_pres_1', noUrut: 1, nis: '261', nama: 'Rina', jenisKelamin: 'P' };
    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });

    data.daftarPresensi[0].statusMap[s1.id] = 'H';
    data.daftarPresensi[1].statusMap[s1.id] = 'S';
    data.daftarPresensi[2].statusMap[s1.id] = 'I';
    data.daftarPresensi[3].statusMap[s1.id] = 'A';
    saveKelasHarianData(profile, data);

    const loaded = getKelasHarianData(profile, tps);
    expect(loaded.daftarPresensi[0].statusMap[s1.id]).toBe('H');
    expect(loaded.daftarPresensi[1].statusMap[s1.id]).toBe('S');
    expect(loaded.daftarPresensi[2].statusMap[s1.id]).toBe('I');
    expect(loaded.daftarPresensi[3].statusMap[s1.id]).toBe('A');
  });

  it('Test 6: Cegah duplikasi tanggal pertemuan pada presensi', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const data = createEmptyKelasHarianData(profile, tps);
    data.daftarPresensi[0].tanggal = '2026-09-14';
    data.daftarPresensi[1].tanggal = '2026-09-21';

    const okUpdate = updatePertemuanDate(data, 3, '2026-09-28');
    expect(okUpdate.valid).toBe(true);
    expect(okUpdate.updated.daftarPresensi[2].tanggal).toBe('2026-09-28');

    const dupUpdate = updatePertemuanDate(okUpdate.updated, 3, '2026-09-14');
    expect(dupUpdate.valid).toBe(false);
    expect(dupUpdate.error).toContain('sudah tercatat');
  });

  it('Test 7: Rekap presensi bulanan dan semester (termasuk arsip siswa mutasi)', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = { id: 's_rec_1', noUrut: 1, nis: '262', nama: 'Andi', jenisKelamin: 'L' };
    const archived: SiswaItem = {
      id: 's_arch_1',
      noUrut: 99,
      nis: '263',
      nama: 'Bagus Mutasi',
      jenisKelamin: 'L',
      statusAktif: 'pindah_rombel',
      rombelTujuan: 'VIII B',
    };

    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    data.archivedSiswa = [archived];
    data.daftarPresensi = data.daftarPresensi.slice(0, 3);
    data.daftarPresensi[0].tanggal = '2026-09-10';
    data.daftarPresensi[0].statusMap = { [s1.id]: 'S', [archived.id]: 'H' };
    data.daftarPresensi[1].tanggal = '2026-09-17';
    data.daftarPresensi[1].statusMap = { [s1.id]: 'A', [archived.id]: 'I' };
    data.daftarPresensi[2].tanggal = '2026-10-01';
    data.daftarPresensi[2].statusMap = { [s1.id]: 'I', [archived.id]: 'H' };

    const septRecap = computeAttendanceRecap(data, { monthFilter: '2026-09', includeArchived: true });
    expect(septRecap.meetings).toHaveLength(2);
    expect(septRecap.perStudent[s1.id].sakit).toBe(1);
    expect(septRecap.perStudent[s1.id].alfa).toBe(1);
    expect(septRecap.perStudent[s1.id].izin).toBe(0);
    expect(septRecap.perStudent[archived.id].izin).toBe(1);

    const fullRecap = computeAttendanceRecap(data, { includeArchived: false });
    expect(fullRecap.meetings).toHaveLength(3);
    expect(fullRecap.perStudent[s1.id].sakit).toBe(1);
    expect(fullRecap.perStudent[s1.id].izin).toBe(1);
    expect(fullRecap.perStudent[s1.id].alfa).toBe(1);
    expect(fullRecap.perStudent[archived.id]).toBeUndefined();
  });

  it('Test 8: Jurnal mengajar dengan tpId, subTpIds, jumlahJP, validasi & sinkron presensi', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = { id: 's_jur_1', noUrut: 1, nis: '264', nama: 'Citra Dewi', jenisKelamin: 'P' };
    const s2: SiswaItem = { id: 's_jur_2', noUrut: 2, nis: '265', nama: 'Dani Eko', jenisKelamin: 'L' };
    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1, s2], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    data.daftarPresensi[0].tanggal = '2026-09-14';
    data.daftarPresensi[0].statusMap = { [s1.id]: 'S', [s2.id]: 'A' };

    const invalidCheck = validateJurnalEntry({ tanggal: '', materiPokok: '', jumlahJP: 0 }, [], tps);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.errors.length).toBeGreaterThanOrEqual(2);

    const syncedAbsent = syncJurnalAbsentFromPresensi(data.daftarPresensi, data.daftarSiswa, 1, '2026-09-14');
    expect(syncedAbsent).toContain('Citra Dewi (Sakit)');
    expect(syncedAbsent).toContain('Dani Eko (Alfa)');

    const candidate = {
      id: 'jur_t6_1',
      pertemuanKe: 1,
      tanggal: '2026-09-14',
      jamKe: '1 - 2',
      tpId: tps[0].id,
      subTpIds: ['sub_81_a'],
      kodeTP: tps[0].kode,
      materiPokok: tps[0].materiPokok,
      jumlahJP: 3,
      kegiatanPembelajaran: 'Diskusi kelompok model matematika SPLDV.',
      siswaTidakHadir: syncedAbsent,
      catatanRefleksi: 'Kelompok 2 butuh penguatan eliminasi.',
      statusKeterlaksanaan: 'perlu_tindak_lanjut' as const,
      tindakLanjut: 'Latihan tambahan 15 menit pada awal pertemuan berikutnya.',
    };
    const validCheck = validateJurnalEntry(candidate, [], tps);
    expect(validCheck.valid).toBe(true);
    expect(validCheck.resolvedTP?.id).toBe(tps[0].id);
  });

  it('Test 9: Persistensi jurnal mengajar lintas reload (tpId, subTpIds, jumlahJP, status, siswaTidakHadir)', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = { id: 's_jur_r1', noUrut: 1, nis: '264', nama: 'Citra Dewi', jenisKelamin: 'P' };
    const s2: SiswaItem = { id: 's_jur_r2', noUrut: 2, nis: '265', nama: 'Dani Eko', jenisKelamin: 'L' };
    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1, s2], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    const saved: KelasHarianData = {
      ...data,
      daftarJurnal: [
        {
          id: 'jur_t6_reload',
          pertemuanKe: 1,
          tanggal: '2026-09-14',
          jamKe: '1 - 2',
          tpId: tps[0].id,
          subTpIds: ['sub_81_a'],
          kodeTP: tps[0].kode,
          materiPokok: tps[0].materiPokok,
          jumlahJP: 3,
          kegiatanPembelajaran: 'Diskusi kelompok model matematika SPLDV.',
          siswaTidakHadir: 'Citra Dewi (S), Dani Eko (A)',
          catatanRefleksi: 'Kelompok 2 butuh penguatan eliminasi.',
          statusKeterlaksanaan: 'perlu_tindak_lanjut',
          tindakLanjut: 'Latihan tambahan 15 menit pada awal pertemuan berikutnya.',
        },
      ],
    };
    saveKelasHarianData(profile, saved);

    const reloaded = getKelasHarianData(profile, tps);
    expect(reloaded.daftarJurnal).toHaveLength(1);
    expect(reloaded.daftarJurnal[0].tpId).toBe(tps[0].id);
    expect(reloaded.daftarJurnal[0].subTpIds).toEqual(['sub_81_a']);
    expect(reloaded.daftarJurnal[0].jumlahJP).toBe(3);
    expect(reloaded.daftarJurnal[0].statusKeterlaksanaan).toBe('perlu_tindak_lanjut');
    expect(reloaded.daftarJurnal[0].siswaTidakHadir).toContain('Dani Eko (A)');
  });

  it('Test 10: Input nilai formatif per tpid_*, STS, SAS, Praktik & hitung nilai akhir', () => {
    const tps = makeSampleTPs();
    let formatif = setFormatifScoreForTP({}, tps[0], 90);
    formatif = setFormatifScoreForTP(formatif, tps[1], 80);
    expect(Object.keys(formatif)).toContain('tpid_task6_mat_8_1');
    expect(getFormatifScoreForTP(formatif, tps[0])).toBe(90);

    // Default policy (50% Formatif, 25% STS, 25% SAS): 0.5*85 + 0.25*84 + 0.25*88 = 42.5 + 21 + 22 = 85.5 -> 86 (Sangat Baik)
    const defRes = computeNilaiAkhir(formatif, 84, 88, tps, DEFAULT_BOBOT_NILAI);
    expect(defRes.na).toBe(86);
    expect(defRes.predikat).toBe('Sangat Baik');
    expect(defRes.statusNilai).toBe('lengkap');
    expect(defRes.isComplete).toBe(true);

    // Custom policy with Praktik (40/20/20/20): 0.4*85 + 0.2*80 + 0.2*90 + 0.2*95 = 34 + 16 + 18 + 19 = 87
    const customRes = computeNilaiAkhir(
      formatif,
      80,
      90,
      tps,
      { bobotFormatif: 40, bobotSTS: 20, bobotSAS: 20, bobotPraktik: 20, kktpMinTuntas: 71 },
      95
    );
    expect(customRes.na).toBe(87);
    expect(customRes.predikat).toBe('Sangat Baik');
  });

  it('Test 11: Klasifikasi predikat KKTP terpadu (86+, 71-85, 61-70, <=60)', () => {
    expect(classifyPredikatKKTP(86)).toBe('Sangat Baik');
    expect(classifyPredikatKKTP(85)).toBe('Baik');
    expect(classifyPredikatKKTP(71)).toBe('Baik');
    expect(classifyPredikatKKTP(70)).toBe('Cukup');
    expect(classifyPredikatKKTP(61)).toBe('Cukup');
    expect(classifyPredikatKKTP(60)).toBe('Perlu Bimbingan');
  });

  it('Test 12: Bedakan nilai kosong (null/undefined) dengan nilai 0 pada hitung NA, rata-rata kelas & kesiapan supervisi', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();

    // Siswa A: nilai kosong semua
    const blankRes = computeNilaiAkhir({}, null, null, tps, DEFAULT_BOBOT_NILAI);
    expect(blankRes.na).toBeNull();
    expect(blankRes.statusNilai).toBe('belum_dinilai');

    // Siswa B: betul-betul bernilai 0 di semua komponen
    const zeroFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 0), tps[1], 0);
    const zeroRes = computeNilaiAkhir(zeroFormatif, 0, 0, tps, DEFAULT_BOBOT_NILAI);
    expect(zeroRes.na).toBe(0);
    expect(zeroRes.statusNilai).toBe('lengkap');
    expect(zeroRes.predikat).toBe('Perlu Bimbingan');

    // Rata-rata kelas hanya membagi siswa bernilai (Siswa C = 80, Siswa B = 0 => rata-rata 40, Siswa A kosong tidak ikut membagi)
    const cFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 80), tps[1], 80);
    const summary = computeClassGradeSummary(
      [
        {
          siswaId: 'a',
          nama: 'Kosong',
          nis: '1',
          nilaiFormatif: {},
          nilaiSTS: null,
          nilaiSAS: null,
          nilaiAkhir: null,
          predikatKKTP: 'Perlu Bimbingan',
          deskripsiRapor: '',
        },
        {
          siswaId: 'b',
          nama: 'Nol',
          nis: '2',
          nilaiFormatif: zeroFormatif,
          nilaiSTS: 0,
          nilaiSAS: 0,
          nilaiAkhir: 0,
          predikatKKTP: 'Perlu Bimbingan',
          deskripsiRapor: '',
        },
        {
          siswaId: 'c',
          nama: 'DelapanPuluh',
          nis: '3',
          nilaiFormatif: cFormatif,
          nilaiSTS: 80,
          nilaiSAS: 80,
          nilaiAkhir: 80,
          predikatKKTP: 'Baik',
          deskripsiRapor: '',
        },
      ],
      tps,
      DEFAULT_BOBOT_NILAI
    );
    expect(summary.gradedCount).toBe(2);
    expect(summary.belumDinilaiCount).toBe(1);
    expect(summary.avgKelas).toBe(40);

    // Kesiapan Supervisi: kelas kosong nilaiSTS=null -> nilaiTerisiCount=0; siswa nilai=0 -> nilaiTerisiCount=1
    const emptyData = createEmptyKelasHarianData(profile, tps);
    const sBlank = createBlankNilaiItem({ id: 'a', noUrut: 1, nis: '1', nama: 'Kosong', jenisKelamin: 'L' }, tps);
    emptyData.daftarSiswa = [{ id: 'a', noUrut: 1, nis: '1', nama: 'Kosong', jenisKelamin: 'L' }];
    emptyData.daftarNilai = [sBlank];
    const readinessBlank = getSupervisiDocumentsReadiness(profile, tps, emptyData).find((item) => item.id === 9);
    expect(readinessBlank?.ringkasan).toContain('0/1 nilai terisi');

    emptyData.daftarNilai[0].nilaiSTS = 0;
    const readinessZero = getSupervisiDocumentsReadiness(profile, tps, emptyData).find((item) => item.id === 9);
    expect(readinessZero?.ringkasan).toContain('1/1 nilai terisi');
  });

  it('Test 13: Validasi konfigurasi bobot nilai menolak total != 100% atau negatif', () => {
    expect(validateBobotKebijakan({ bobotFormatif: 60, bobotSTS: 20, bobotSAS: 30, bobotPraktik: 0 }).valid).toBe(false);
    expect(validateBobotKebijakan({ bobotFormatif: -10, bobotSTS: 60, bobotSAS: 50, bobotPraktik: 0 }).valid).toBe(false);
    expect(validateBobotKebijakan({ bobotFormatif: 40, bobotSTS: 20, bobotSAS: 20, bobotPraktik: 20 }).valid).toBe(true);
    expect(validateBobotKebijakan({ bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, bobotPraktik: 0 }).total).toBe(100);
  });

  it('Test 14: Generate deskripsi e-Rapor jujur dari nilai aktual (0 TP, 1 TP tanpa kontradiksi, >= 2 TP min != max)', () => {
    const tps = makeSampleTPs();

    // 0 TP terisi -> jujur belum diinput, tidak mengarang nilai 75
    const noScoreDesc = generateAutoDeskripsiRapor({}, tps, 'Ali');
    expect(noScoreDesc).toContain('belum diinput');
    expect(noScoreDesc).not.toContain('75');

    // 1 TP terisi -> tidak memuji dan sekaligus mengkritik TP yang sama!
    const singleScore = setFormatifScoreForTP({}, tps[0], 92);
    const singleDesc = generateAutoDeskripsiRapor(singleScore, tps, 'Budi');
    expect(singleDesc).toContain('Sistem Persamaan Linear Dua Variabel');
    expect(singleDesc).not.toContain('pendampingan dalam Sistem Persamaan Linear Dua Variabel');

    // 2 TP terisi -> pujian tertinggi & pembinaan terendah berbeda TP
    const multiScore = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 92), tps[1], 62);
    const multiDesc = generateAutoDeskripsiRapor(multiScore, tps, 'Citra');
    expect(multiDesc).toContain('Sistem Persamaan Linear Dua Variabel');
    expect(multiDesc).toContain('Teorema Pythagoras');
  });

  it('Test 15: Sinkronisasi H/S/I/A & ringkasan kesiapan e-Rapor per siswa', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const sIncomplete: SiswaItem = { id: 's_inc', noUrut: 1, nis: '301', nisn: '1000000001', nama: 'Belum Lengkap', jenisKelamin: 'L' };
    const sComplete: SiswaItem = { id: 's_cmp', noUrut: 2, nis: '302', nisn: '1000000002', nama: 'Sudah Lengkap', jenisKelamin: 'P' };

    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [sIncomplete, sComplete], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    data.daftarPresensi = data.daftarPresensi.slice(0, 4);
    data.daftarPresensi[0].statusMap = { [sIncomplete.id]: 'H', [sComplete.id]: 'S' };
    data.daftarPresensi[1].statusMap = { [sIncomplete.id]: 'A', [sComplete.id]: 'I' };
    data.daftarPresensi[2].statusMap = { [sIncomplete.id]: 'H', [sComplete.id]: 'H' };
    data.daftarPresensi[3].statusMap = { [sIncomplete.id]: 'H', [sComplete.id]: 'H' };

    let fCmp = setFormatifScoreForTP({}, tps[0], 90);
    fCmp = setFormatifScoreForTP(fCmp, tps[1], 84);
    data.daftarNilai[1].nilaiFormatif = fCmp;
    data.daftarNilai[1].nilaiSTS = 86;
    data.daftarNilai[1].nilaiSAS = 88;
    data.daftarNilai[1].deskripsiRapor = generateAutoDeskripsiRapor(fCmp, tps, sComplete.nama);
    data.daftarNilai[1].catatanGuru = 'Aktif membantu teman sebaya di kelas.';

    const incSummary = computeERaporStudentSummary(sIncomplete, data.daftarNilai[0], data.daftarPresensi, tps, data.bobotNilai);
    expect(incSummary.canFinalize).toBe(false);
    expect(incSummary.missingComponents).toContain('Formatif 8.1');
    expect(incSummary.missingComponents).toContain('STS');
    expect(incSummary.kehadiran.alfa).toBe(1);

    const cmpSummary = computeERaporStudentSummary(sComplete, data.daftarNilai[1], data.daftarPresensi, tps, data.bobotNilai);
    expect(cmpSummary.canFinalize).toBe(true);
    expect(cmpSummary.kehadiran.sakit).toBe(1);
    expect(cmpSummary.kehadiran.izin).toBe(1);
    expect(cmpSummary.kehadiran.hadir).toBe(2);
    expect(cmpSummary.kehadiran.persentaseHadir).toBe(50);
  });

  it('Test 16: Guard blokir finalisasi individu & kelas saat nilai/deskripsi belum lengkap', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const sIncomplete: SiswaItem = { id: 's_inc_g', noUrut: 1, nis: '301', nisn: '1000000001', nama: 'Belum Lengkap', jenisKelamin: 'L' };
    const sComplete: SiswaItem = { id: 's_cmp_g', noUrut: 2, nis: '302', nisn: '1000000002', nama: 'Sudah Lengkap', jenisKelamin: 'P' };

    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [sIncomplete, sComplete], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    let fCmp = setFormatifScoreForTP({}, tps[0], 90);
    fCmp = setFormatifScoreForTP(fCmp, tps[1], 84);
    data.daftarNilai[1].nilaiFormatif = fCmp;
    data.daftarNilai[1].nilaiSTS = 86;
    data.daftarNilai[1].nilaiSAS = 88;
    data.daftarNilai[1].deskripsiRapor = generateAutoDeskripsiRapor(fCmp, tps, sComplete.nama);

    // Cegah finalisasi individu yg belum lengkap
    const failSingle = finalizeERaporStudent(data.daftarNilai[0], data.daftarPresensi, tps, data.bobotNilai);
    expect(failSingle.success).toBe(false);
    expect(failSingle.updated.statusRapor).toBe('belum_lengkap');

    // Finalisasi kelas hanya memfinalisasi siswa lengkap & melaporkan siswa terblokir
    const classRes = finalizeClassERapor(data, tps);
    expect(classRes.finalizedCount).toBe(1);
    expect(classRes.blockedStudents).toHaveLength(1);
    expect(classRes.blockedStudents[0].nama).toBe('Belum Lengkap');
    expect(classRes.updated.daftarNilai[1].statusRapor).toBe('final');
    expect(classRes.updated.daftarNilai[0].statusRapor).toBe('belum_lengkap');
  });

  it('Test 17: Import siswa dengan preview validasi baris, batal tanpa efek, & mode merge/replace', () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const existing: SiswaItem[] = [
      { id: 'ex1', noUrut: 1, nis: '260001', nisn: '0011223344', nama: 'Siswa Eksisting', jenisKelamin: 'L' },
    ];
    const rawCsv = [
      'No\tNIS\tNISN\tNama Lengkap\tL/P',
      '1\t260001\t0011223355\tDuplikat NIS Lama\tL',
      '2\t260099\t0011223344\tDuplikat NISN Lama\tP',
      '3\t260050\t0099887766\tSiswa Baru Valid\tP',
      '4\t260050\t0099887767\tDuplikat NIS Dalam File\tL',
      '5\t260051\t0099887768\tA\tL', // nama terlalu pendek
    ].join('\n');

    const preview = parseAndValidateStudentImport(rawCsv, existing);
    expect(preview.totalRows).toBe(5);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0].siswa.nama).toBe('Siswa Baru Valid');
    expect(preview.duplicateRows).toHaveLength(3);
    expect(preview.invalidRows).toHaveLength(1);

    // Uji mode Merge (menggabungkan siswa eksisting + siswa valid baru dan mempertahankan nilai eksisting)
    const baseData = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), existing, tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    const mergedRoster = [...baseData.daftarSiswa, ...preview.validRows.map((r) => r.siswa)];
    const merged = applyNewStudentRoster(
      baseData,
      mergedRoster,
      tps,
      false,
      { source: 'user_imported', initializeEmptyScores: true }
    );
    expect(merged.daftarSiswa.map((s) => s.nama)).toEqual(['Siswa Eksisting', 'Siswa Baru Valid']);

    // Uji mode Replace (true) mengganti roster dengan baris valid hasil import
    const replaced = applyNewStudentRoster(
      baseData,
      preview.validRows.map((r) => r.siswa),
      tps,
      true,
      { source: 'user_imported', initializeEmptyScores: true }
    );
    expect(replaced.daftarSiswa.map((s) => s.nama)).toEqual(['Siswa Baru Valid']);

    // Uji render modal ImportSiswaModal (dengan tombol Batal & pilihan mode merge/replace, tanpa mutasi saat render)
    const onImportMock = vi.fn();
    const onCloseMock = vi.fn();
    const modalHtml = renderToStaticMarkup(
      React.createElement(ImportSiswaModal, {
        isOpen: true,
        onClose: onCloseMock,
        onImport: onImportMock,
        currentCount: existing.length,
        rombelName: 'VIII A',
        existingStudents: existing,
      })
    );
    expect(modalHtml).toContain('Batal');
    expect(modalHtml).toContain('VIII A');
    expect(onImportMock).not.toHaveBeenCalled();
  });

  it('Test 18: Export DOCX Presensi, Jurnal, Buku Nilai, dan e-Rapor sesuai data tampil (termasuk null vs 0, S/I/A, bobot, & TP)', async () => {
    const profile = makeProfile();
    const tps = makeSampleTPs();
    const s1: SiswaItem = {
      id: 'docx_s1',
      noUrut: 1,
      nis: '268801',
      nisn: '9988776655',
      nama: 'Zahra Aliyah',
      jenisKelamin: 'P',
    };
    const data = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    data.bobotNilai = { bobotFormatif: 40, bobotSTS: 20, bobotSAS: 20, bobotPraktik: 20, kktpMinTuntas: 71 };
    data.daftarPresensi[0].tanggal = '2026-09-14';
    data.daftarPresensi[0].statusMap[s1.id] = 'I';
    data.daftarJurnal = [
      {
        id: 'j1',
        pertemuanKe: 1,
        tanggal: '2026-09-14',
        jamKe: '1 - 2',
        tpId: tps[0].id,
        subTpIds: ['sub_81_a'],
        kodeTP: '8.1',
        materiPokok: tps[0].materiPokok,
        jumlahJP: 4,
        kegiatanPembelajaran: 'Eksplorasi SPLDV kontekstual',
        siswaTidakHadir: 'Zahra Aliyah (I)',
        catatanRefleksi: 'Aktif diskusi',
        statusKeterlaksanaan: 'terlaksana',
      },
    ];
    // Uji 0 vs null: TP 8.1 = 0 (tampil '0'), TP 8.2 undefined (tampil '-'), Praktik = 90
    data.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP({}, tps[0], 0);
    data.daftarNilai[0].nilaiSTS = 80;
    data.daftarNilai[0].nilaiSAS = null;
    data.daftarNilai[0].nilaiPraktik = 90;
    data.daftarNilai[0].catatanGuru = 'Perlu melengkapi ujian SAS susulan.';

    const presensiXml = await extractDocxXml(buildPresensiElements(profile, data), profile, 'Presensi');
    expect(presensiXml).toContain('Zahra Aliyah');
    expect(presensiXml).toContain('9988776655');
    expect(presensiXml).toContain('I');

    const jurnalXml = await extractDocxXml(buildJurnalMengajarElements(profile, data, tps), profile, 'Jurnal', false);
    expect(jurnalXml).toContain('AGENDA &amp; JURNAL MENGAJAR GURU');
    expect(jurnalXml).toContain('TP 8.1');
    expect(jurnalXml).toContain('4 JP');
    expect(jurnalXml).toContain('8.1.1');

    const nilaiXml = await extractDocxXml(buildDaftarNilaiElements(profile, data, tps), profile, 'Nilai');
    expect(nilaiXml).toContain('DAFTAR NILAI ASESMEN FORMATIF &amp; SUMATIF');
    expect(nilaiXml).toContain('Praktik/Proyek 20%');
    expect(nilaiXml).toContain('61 - 70 : Cukup');
    expect(nilaiXml).toContain('0 - 60 : Perlu Bimbingan');

    const raporXml = await extractDocxXml(buildRekapRaporElements(profile, data, tps), profile, 'Rapor');
    expect(raporXml).toContain('REKAPITULASI CAPAIAN KOMPETENSI (e-RAPOR)');
    expect(raporXml).toContain('Perlu melengkapi ujian SAS susulan.');
    expect(raporXml).toContain('[Belum Lengkap]');
  });

  it('Test 19: Backup & Restore JSON menjaga integritas seluruh relasi data akademik + UI Tabs render tanpa crash', () => {
    const profile = makeProfile();
    saveSchoolProfile(profile);
    const tps = makeSampleTPs();
    const sim = loadDemoKelasHarianData(profile, tps);
    const s1: SiswaItem = {
      id: 'bak_s1',
      noUrut: 1,
      nis: '269001',
      nisn: '5544332211',
      nama: 'Hana Bakti',
      jenisKelamin: 'P',
    };
    const actual = applyNewStudentRoster(sim, [s1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    actual.bobotNilai = { bobotFormatif: 45, bobotSTS: 25, bobotSAS: 30, bobotPraktik: 0, kktpMinTuntas: 71 };
    actual.daftarPresensi[0].statusMap[s1.id] = 'S';
    actual.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 88), tps[1], 92);
    actual.daftarNilai[0].nilaiSTS = 85;
    actual.daftarNilai[0].nilaiSAS = 90;
    actual.daftarNilai[0].deskripsiRapor = generateAutoDeskripsiRapor(actual.daftarNilai[0].nilaiFormatif, tps, s1.nama);
    actual.daftarNilai[0].catatanGuru = 'Siap mengikuti olimpiade matematika.';
    const finalized = finalizeClassERapor(actual, tps).updated;
    saveKelasHarianData(profile, finalized);

    // Smoke-render ke-4 tab dengan data final sebelum backup
    const noop = () => {};
    expect(renderToStaticMarkup(React.createElement(PresensiTab, { schoolProfile: profile, kelasHarian: finalized, tpList: tps, onUpdateKelasHarian: noop, onToast: noop }))).toContain('5544332211');
    expect(renderToStaticMarkup(React.createElement(JurnalMengajarTab, { schoolProfile: profile, kelasHarian: finalized, tpList: tps, onUpdateKelasHarian: noop, onToast: noop }))).toContain('Jurnal mengajar harian');
    expect(renderToStaticMarkup(React.createElement(BukuNilaiTab, { schoolProfile: profile, kelasHarian: finalized, tpList: tps, onUpdateKelasHarian: noop, onToast: noop }))).toContain('86–100 (Sangat Baik)');
    const raporHtml = renderToStaticMarkup(React.createElement(AutoDeskripsiRaporTab, { schoolProfile: profile, kelasHarian: finalized, tpList: tps, onUpdateKelasHarian: noop, onToast: noop }));
    expect(raporHtml).toContain('Hana Bakti');
    expect(raporHtml).toContain('Finalisasi Rapor Kelas');

    // Backup & clear & Restore
    const backupJson = exportBackupDataJson();
    localStorage.clear();
    const restoreRes = importBackupDataJson(backupJson);
    expect(restoreRes.success).toBe(true);

    const restored = getKelasHarianData(profile, tps);
    expect(restored.daftarSiswa).toHaveLength(1);
    expect(restored.daftarSiswa[0].nisn).toBe('5544332211');
    expect(restored.daftarPresensi[0].statusMap[s1.id]).toBe('S');
    expect(restored.bobotNilai?.bobotFormatif).toBe(45);
    expect(restored.daftarNilai[0].statusRapor).toBe('final');
    expect(restored.daftarNilai[0].catatanGuru).toBe('Siap mengikuti olimpiade matematika.');
  });

  it('Test 20: Archive mode menjaga histori nilai & presensi siswa keluar setelah tambah siswa, reload, dan finalisasi e-Rapor kelas', () => {
    const profile = makeProfile({ rombelAktif: 'VIII A' });
    saveSchoolProfile(profile);
    const tps = makeSampleTPs();
    const s1: SiswaItem = { id: 'arc_s1', noUrut: 1, nis: '26001', nisn: '1010101011', nama: 'Siswa Diarsipkan', jenisKelamin: 'P' };
    const s2: SiswaItem = { id: 'arc_s2', noUrut: 2, nis: '26002', nisn: '1010101012', nama: 'Siswa Aktif Utama', jenisKelamin: 'L' };

    const seeded = applyNewStudentRoster(loadDemoKelasHarianData(profile, tps), [s1, s2], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    seeded.daftarPresensi[0].statusMap[s1.id] = 'S';
    seeded.daftarPresensi[0].statusMap[s2.id] = 'H';
    seeded.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP({}, tps[0], 84);
    seeded.daftarNilai[0].nilaiSTS = 82;
    seeded.daftarNilai[0].nilaiSAS = 86;
    seeded.daftarNilai[1].nilaiFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 90), tps[1], 92);
    seeded.daftarNilai[1].nilaiSTS = 88;
    seeded.daftarNilai[1].nilaiSAS = 94;

    // Arsipkan s1 dengan mode 'archive'
    const archRes = transferStudentRombel(profile, seeded, s1.id, '__ARCHIVE__', tps, {
      mode: 'archive',
      tanggalMutasi: '2026-09-10',
      catatanMutasi: 'Pindah domisili keluar daerah',
    });
    expect(archRes.error).toBeUndefined();
    expect(archRes.transferredStudent?.statusAktif).toBe('keluar');
    expect(archRes.transferredStudent?.rombelTujuan).toBeUndefined();
    expect(archRes.updated.daftarSiswa.map((s) => s.id)).toEqual([s2.id]);
    expect(archRes.updated.archivedSiswa?.find((s) => s.id === s1.id)?.statusAktif).toBe('keluar');
    expect(archRes.updated.daftarNilai.find((n) => n.siswaId === s1.id)?.nilaiSAS).toBe(86);

    // Tambah siswa baru s3 setelah archive — histori s1 di daftarNilai & daftarPresensi tidak boleh terhapus
    const s3: SiswaItem = { id: 'arc_s3', noUrut: 3, nis: '26003', nisn: '1010101013', nama: 'Siswa Baru Masuk', jenisKelamin: 'P' };
    const afterAdd = applyNewStudentRoster(archRes.updated, [s2, s3], tps, false, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    const n3 = afterAdd.daftarNilai.find((n) => n.siswaId === s3.id)!;
    n3.nilaiFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 78), tps[1], 80);
    n3.nilaiSTS = 80;
    n3.nilaiSAS = 82;
    n3.deskripsiRapor = generateAutoDeskripsiRapor(n3.nilaiFormatif, tps, s3.nama);

    // Finalisasi e-Rapor kelas hanya memeriksa siswa aktif (s2 & s3), nilai s1 tetap utuh
    const finRes = finalizeClassERapor(afterAdd, tps);
    expect(finRes.blockedStudents).toHaveLength(0);
    expect(finRes.finalizedCount).toBe(2);
    saveKelasHarianData(profile, finRes.updated);

    // Simulasi reload dari localStorage (termasuk syncKelasHarianWithClassRoster)
    const reloaded = getKelasHarianData(profile, tps);
    expect(reloaded.daftarSiswa.map((s) => s.id)).toEqual([s2.id, s3.id]);
    expect(reloaded.archivedSiswa?.find((s) => s.id === s1.id)?.statusAktif).toBe('keluar');
    expect(reloaded.daftarNilai.find((n) => n.siswaId === s1.id)?.nilaiSAS).toBe(86);
    expect(reloaded.daftarPresensi[0].statusMap[s1.id]).toBe('S');
    expect(reloaded.daftarNilai.find((n) => n.siswaId === s2.id)?.statusRapor).toBe('final');
    expect(reloaded.daftarNilai.find((n) => n.siswaId === s3.id)?.statusRapor).toBe('final');
  });

  it('Test 21: Transfer student ke rombel target uninitialized tidak membocorkan 30 siswa demo dan menjaga histori asal setelah reload', () => {
    const profileA = makeProfile({ rombelAktif: 'VIII A' });
    const profileB = makeProfile({ rombelAktif: 'VIII B' });
    saveSchoolProfile(profileA);
    const tps = makeSampleTPs();

    const sMove: SiswaItem = { id: 'trf_s1', noUrut: 1, nis: '26101', nisn: '2020202011', nama: 'Murid Pindah Bersih', jenisKelamin: 'L' };
    const sStay: SiswaItem = { id: 'trf_s2', noUrut: 2, nis: '26102', nisn: '2020202012', nama: 'Murid Tinggal VIII A', jenisKelamin: 'P' };
    const dataA = applyNewStudentRoster(loadDemoKelasHarianData(profileA, tps), [sMove, sStay], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    dataA.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP({}, tps[0], 91);
    dataA.daftarNilai[0].nilaiSTS = 89;
    dataA.daftarNilai[0].nilaiSAS = 93;
    saveKelasHarianData(profileA, dataA);

    // VIII B belum pernah diinisialisasi sebelumnya!
    const trfRes = transferStudentRombel(profileA, dataA, sMove.id, 'VIII B', tps, {
      mode: 'transfer',
      tanggalMutasi: '2026-09-15',
      catatanMutasi: 'Mutasi rombel',
    });
    expect(trfRes.error).toBeUndefined();
    expect(trfRes.transferredStudent?.statusAktif).toBe('aktif');
    expect(trfRes.transferredStudent?.rombelAsal).toBe('VIII A');
    const sourceArchive = trfRes.updated.archivedSiswa?.find((s) => s.id === sMove.id);
    expect(sourceArchive?.statusAktif).toBe('pindah_rombel');
    expect(sourceArchive?.rombelTujuan).toBe('VIII B');

    const reloadedA = getKelasHarianData(profileA, tps);
    expect(reloadedA.daftarSiswa.map((s) => s.id)).toEqual([sStay.id]);
    expect(reloadedA.archivedSiswa?.find((s) => s.id === sMove.id)?.rombelTujuan).toBe('VIII B');
    expect(reloadedA.daftarNilai.find((n) => n.siswaId === sMove.id)?.nilaiSAS).toBe(93);

    const reloadedB = getKelasHarianData(profileB, tps);
    expect(reloadedB.daftarSiswa).toHaveLength(1);
    expect(reloadedB.daftarSiswa[0].nisn).toBe('2020202011');
    // Nilai di rombel tujuan mulai kosong, tidak membawa nilai VIII A dan tidak tercampur 30 siswa demo
    expect(reloadedB.daftarNilai[0].nilaiSTS).toBeNull();
    expect(reloadedB.daftarNilai[0].nilaiSAS).toBeNull();
  });

  it('Test 22: Isolasi Sekolah, Rombel, Tahun Ajaran, dan Semester mempertahankan e-Rapor final Semester 1 saat berpindah ke Semester 2', () => {
    const sem1 = makeProfile({
      schoolId: 'sch_nusantara_1',
      namaSekolah: 'SMPN 1 Nusantara',
      tahunAjaran: '2026/2027',
      semester: '1 (Ganjil)',
      rombelAktif: 'VIII A',
    });
    const sem2 = makeProfile({
      schoolId: 'sch_nusantara_1',
      namaSekolah: 'SMPN 1 Nusantara',
      tahunAjaran: '2026/2027',
      semester: '2 (Genap)',
      rombelAktif: 'VIII A',
    });
    const otherSchool = makeProfile({
      schoolId: 'sch_berbeda_9',
      namaSekolah: 'SMPN 9 Berbeda',
      tahunAjaran: '2026/2027',
      semester: '1 (Ganjil)',
      rombelAktif: 'VIII A',
    });
    const tps = makeSampleTPs();

    const sSem1: SiswaItem = { id: 'iso_s1', noUrut: 1, nis: '27001', nisn: '3030303011', nama: 'Siswa Rapor Sem 1', jenisKelamin: 'P' };
    saveSchoolProfile(sem1);
    const dataSem1 = applyNewStudentRoster(createEmptyKelasHarianData(sem1, tps), [sSem1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    dataSem1.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP(setFormatifScoreForTP({}, tps[0], 88), tps[1], 90);
    dataSem1.daftarNilai[0].nilaiSTS = 86;
    dataSem1.daftarNilai[0].nilaiSAS = 92;
    dataSem1.daftarNilai[0].deskripsiRapor = generateAutoDeskripsiRapor(dataSem1.daftarNilai[0].nilaiFormatif, tps, sSem1.nama);
    const finSem1 = finalizeClassERapor(dataSem1, tps).updated;
    saveKelasHarianData(sem1, finSem1);

    // Pindah ke Semester 2 dan ubah nilai Semester 2
    saveSchoolProfile(sem2);
    const dataSem2 = applyNewStudentRoster(getKelasHarianData(sem2, tps), [sSem1], tps, true, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    dataSem2.daftarNilai[0].nilaiSTS = 74;
    saveKelasHarianData(sem2, dataSem2);

    // Cek sekolah lain tetap terisolasi kosong / bukan data SMPN 1 Nusantara
    const dataOtherSchool = getKelasHarianData(otherSchool, tps);
    expect(dataOtherSchool.daftarSiswa.find((s) => s.nisn === '3030303011')).toBeUndefined();

    // Kembali ke Semester 1: e-Rapor final Semester 1 harus tetap utuh
    saveSchoolProfile(sem1);
    const restoredSem1 = getKelasHarianData(sem1, tps);
    expect(restoredSem1.daftarNilai[0].statusRapor).toBe('final');
    expect(restoredSem1.daftarNilai[0].nilaiSAS).toBe(92);

    const restoredSem2 = getKelasHarianData(sem2, tps);
    expect(restoredSem2.daftarNilai[0].nilaiSTS).toBe(74);
    expect(restoredSem2.daftarNilai[0].statusRapor).not.toBe('final');
  });

  it('Test 23: Cloud Sync (/api/cloud-sync) fallback memori lokal, syarat PIN lisensi sekolah, pemulihan penuh, deteksi konflik OCC (409), dan resolusi konflik', async () => {
    clearLocalDevCloudSyncStore();
    const prevUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevKvUrl = process.env.KV_REST_API_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (!urlStr.includes('/api/cloud-sync')) {
        throw new Error(`Unexpected fetch URL in test: ${urlStr}`);
      }
      let statusCode = 200;
      let jsonBody: unknown = null;
      const headers = new Map<string, string>();
      const mockReq = {
        method: init?.method || 'POST',
        body: init?.body ? String(init.body) : '{}',
      };
      const mockRes = {
        setHeader(k: string, v: string) {
          headers.set(k, v);
        },
        status(code: number) {
          statusCode = code;
          return mockRes;
        },
        json(payload: unknown) {
          jsonBody = payload;
          return mockRes;
        },
      };
      await cloudSyncHandler(mockReq, mockRes);
      return new Response(JSON.stringify(jsonBody), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const schoolCode = licenseManager.computeSerialLicenseCode('SEKOLAH2026A');
      const noPinRes = await pushWorkspaceToCloud(schoolCode, '');
      expect(noPinRes.ok).toBe(false);
      expect(noPinRes.message).toContain('PIN Pribadi Guru');

      const devCodeA = licenseManager.computeSerialLicenseCode('PROAITESTDEV');
      licenseManager.activateLicense(devCodeA);

      // Device A menyimpan data siswa & nilai lalu Push ke Cloud (Revisi #1)
      const profile = makeProfile({ namaSekolah: 'SMP Cloud Sync A' });
      saveSchoolProfile(profile);
      const tps = makeSampleTPs();
      const sDevA: SiswaItem = { id: 'cld_a', noUrut: 1, nis: '28001', nisn: '4040404011', nama: 'Siswa Device A', jenisKelamin: 'P' };
      const dataA = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [sDevA], tps, true, {
        source: 'user_manual',
        initializeEmptyScores: true,
      });
      dataA.daftarNilai[0].nilaiSTS = 88;
      saveKelasHarianData(profile, dataA);

      const pushA1 = await pushWorkspaceToCloud(devCodeA);
      expect(pushA1.ok).toBe(true);
      expect(pushA1.cloudConfigured).toBe(false);
      expect(pushA1.revision).toBe(1);

      // Simpan snapshot state Device A agar bisa lanjut mendorong Revisi #2 secara independen
      const savedDevAStateRev1 = exportBackupDataJson();

      // Device B memulihkan dari Cloud setelah localStorage bersih (berbasis Revisi #1)
      localStorage.clear();
      licenseManager.activateLicense(devCodeA);
      const pullB = await pullWorkspaceFromCloud(devCodeA);
      expect(pullB.ok).toBe(true);
      expect(pullB.found).toBe(true);
      expect(pullB.revision).toBe(1);
      expect(pullB.restoredCount).toBeGreaterThan(0);
      expect(getKelasHarianData(profile, tps).daftarNilai[0].nilaiSTS).toBe(88);

      const savedDevBStateAfterPull = new Map<string, string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        savedDevBStateAfterPull.set(k, localStorage.getItem(k)!);
      }

      // Device A kembali online dan mendorong Revisi #2 (nilaiSTS = 91)
      localStorage.clear();
      licenseManager.activateLicense(devCodeA);
      importBackupDataJson(savedDevAStateRev1);
      const dataA2 = getKelasHarianData(profile, tps);
      dataA2.daftarNilai[0].nilaiSTS = 91;
      saveKelasHarianData(profile, dataA2);
      const pushA2 = await pushWorkspaceToCloud(devCodeA, undefined, { baseRevisionOverride: 1 });
      expect(pushA2.ok).toBe(true);
      expect(pushA2.revision).toBe(2);

      // Device B mencoba push dengan basis usang (Revisi #1) -> wajib ditolak 409 Conflict!
      localStorage.clear();
      savedDevBStateAfterPull.forEach((v, k) => localStorage.setItem(k, v));
      const dataB = getKelasHarianData(profile, tps);
      dataB.daftarNilai[0].nilaiSTS = 95;
      saveKelasHarianData(profile, dataB);
      localStorage.setItem('asesmerdeka_device_id', 'DEV-BROWSER-B');

      const pushBStale = await pushWorkspaceToCloud(devCodeA);
      expect(pushBStale.ok).toBe(false);
      expect(pushBStale.conflict).toBe(true);
      expect(pushBStale.statusCode).toBe(409);
      expect(pushBStale.serverRevision).toBe(2);
      expect((pushBStale.conflicts || []).length).toBeGreaterThan(0);

      // Selesaikan konflik dengan memilih nilai Device B (95) secara eksplisit -> menjadi Revisi #3
      const choices: Record<string, 'local' | 'server'> = {};
      for (const c of pushBStale.conflicts || []) {
        choices[c.id] = 'local';
      }
      const resolved = await resolveCloudConflict('merge_safe', { choices });
      expect(resolved.ok).toBe(true);
      expect(resolved.revision).toBe(3);

      // Pull ulang pada perangkat bersih harus mengembalikan Revisi #3 (95)
      localStorage.clear();
      const pullAfterResolve = await pullWorkspaceFromCloud(devCodeA);
      expect(pullAfterResolve.ok).toBe(true);
      expect(pullAfterResolve.revision).toBe(3);
      expect(getKelasHarianData(profile, tps).daftarNilai[0].nilaiSTS).toBe(95);
    } finally {
      globalThis.fetch = originalFetch;
      clearLocalDevCloudSyncStore();
      if (prevUpstashUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUpstashUrl;
      if (prevKvUrl !== undefined) process.env.KV_REST_API_URL = prevKvUrl;
    }
  });
});
