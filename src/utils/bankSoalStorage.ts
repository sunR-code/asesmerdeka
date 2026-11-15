import type { AsesmenDokumen, ButirSoal } from '../types/assessment';
import { requireActiveLicenseForAction } from './licenseManager';
import {
  buildBankSoalStorageKey,
  type AcademicProfileLike,
  resolveAcademicContext,
} from './storageIdentity';

export const LEGACY_BANK_SOAL_KEY = 'asesmerdeka_bank_soal';
const BANK_SOAL_V2_PREFIX = 'asesmerdeka_bank_soal_v2__';
const MAX_BANK_SOAL_PER_SCOPE = 50;

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

export function inferJenjangFromFaseString(jenjangFase?: string, kelas?: string): string {
  const f = (jenjangFase || '').toLowerCase();
  const k = parseInt((kelas || '').replace(/[^0-9]/g, ''), 10);
  if (f.includes('smk')) return 'SMK';
  if (f.includes('sma') || f.includes('fase e') || f.includes('fase f') || (k >= 10 && k <= 12)) {
    return 'SMA/MA';
  }
  if (f.includes('sd') || f.includes('mi') || f.includes('fase a') || f.includes('fase b') || f.includes('fase c') || (k >= 1 && k <= 6)) {
    return 'SD/MI';
  }
  return 'SMP/MTs';
}

export function buildScopeForAsesmenDoc(
  doc: Partial<AsesmenDokumen>,
  profile?: AcademicProfileLike | null
): AcademicProfileLike {
  const active = profile || readActiveProfileFromStorage();
  return {
    schoolId: doc.schoolId || active?.schoolId,
    namaSekolah: doc.namaSekolah || active?.namaSekolah,
    tahunAjaran: doc.tahunAjaran || active?.tahunAjaran,
    jenjang: profile?.jenjang || inferJenjangFromFaseString(doc.jenjangFase, doc.kelas) || active?.jenjang,
    kelasUtama: doc.kelas || active?.kelasUtama,
    rombelAktif: doc.rombel || active?.rombelAktif,
    mataPelajaranUtama: doc.mataPelajaran || active?.mataPelajaranUtama,
    semester: doc.semester || active?.semester,
  };
}

export interface SaveBankResult {
  saved: boolean;
  storageKey: string;
  warning?: string;
}

function safeSaveScopedBankList(storageKey: string, list: AsesmenDokumen[]): SaveBankResult {
  let warning: string | undefined;
  let listToSave = list;
  if (listToSave.length > MAX_BANK_SOAL_PER_SCOPE) {
    listToSave = listToSave.slice(0, MAX_BANK_SOAL_PER_SCOPE);
    warning = `Arsip Bank Soal pada ruang lingkup ini mencapai batas (${MAX_BANK_SOAL_PER_SCOPE} dokumen). Item terlama tidak disertakan; pertimbangkan ekspor backup JSON.`;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(listToSave));
    return { saved: true, storageKey, warning };
  } catch (err) {
    console.warn('Kuota localStorage penuh saat menyimpan Bank Soal:', err);
    return {
      saved: false,
      storageKey,
      warning:
        'Penyimpanan peramban penuh (QuotaExceededError). Hapus arsip lama secara manual atau unduh backup JSON terlebih dahulu agar data baru tersimpan.',
    };
  }
}

export function getBankSoal(profile?: AcademicProfileLike | null): AsesmenDokumen[] {
  if (typeof localStorage === 'undefined') return [];

  if (profile) {
    const scopedKey = buildBankSoalStorageKey(profile);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as AsesmenDokumen[];
      } catch {
        // ignore malformed JSON
      }
    }
    return [];
  }

  const active = readActiveProfileFromStorage();
  if (active) {
    const activeKey = buildBankSoalStorageKey(active);
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as AsesmenDokumen[];
      } catch {
        // ignore
      }
    }
  }

  // Fallback kompatibilitas bila profil belum diset atau migrasi belum dijalankan
  const rawLegacy = localStorage.getItem(LEGACY_BANK_SOAL_KEY);
  if (rawLegacy) {
    try {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) return parsed as AsesmenDokumen[];
    } catch {
      // ignore
    }
  }
  return [];
}

export function getAllScopedBankSoal(): AsesmenDokumen[] {
  if (typeof localStorage === 'undefined') return [];
  const byId = new Map<string, AsesmenDokumen>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BANK_SOAL_V2_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) {
        for (const doc of parsed as AsesmenDokumen[]) {
          if (doc && doc.id && !byId.has(doc.id)) {
            byId.set(doc.id, doc);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Sertakan legacy bila ada yang belum termigrasi
  try {
    const legacyParsed = JSON.parse(localStorage.getItem(LEGACY_BANK_SOAL_KEY) || '[]');
    if (Array.isArray(legacyParsed)) {
      for (const doc of legacyParsed as AsesmenDokumen[]) {
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

export function saveToBankSoal(
  doc: AsesmenDokumen,
  profile?: AcademicProfileLike | null
): SaveBankResult {
  if (!doc || !doc.id || !Array.isArray(doc.soalList)) {
    return { saved: false, storageKey: '', warning: 'Struktur dokumen asesmen tidak valid.' };
  }

  const effectiveProfile = profile || buildScopeForAsesmenDoc(doc, readActiveProfileFromStorage());
  const ctx = resolveAcademicContext(effectiveProfile);
  const stampedDoc: AsesmenDokumen = {
    ...doc,
    schoolId: doc.schoolId || ctx.schoolId,
    tahunAjaran: doc.tahunAjaran || ctx.tahunAjaran,
    semester: doc.semester || ctx.semester,
    rombel: doc.rombel || ctx.rombel,
  };

  const storageKey = buildBankSoalStorageKey(effectiveProfile);
  let currentList: AsesmenDokumen[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) currentList = parsed;
    }
  } catch {
    currentList = [];
  }

  const existingIdx = currentList.findIndex((item) => item.id === stampedDoc.id);
  let updated: AsesmenDokumen[];
  if (existingIdx >= 0) {
    updated = [...currentList];
    updated[existingIdx] = stampedDoc;
  } else {
    updated = [stampedDoc, ...currentList];
  }

  return safeSaveScopedBankList(storageKey, updated);
}

export function deleteFromBankSoal(
  id: string,
  profile?: AcademicProfileLike | null
): AsesmenDokumen[] {
  if (typeof localStorage === 'undefined') return [];

  if (profile) {
    const storageKey = buildBankSoalStorageKey(profile);
    const list = getBankSoal(profile);
    const updated = list.filter((item) => item.id !== id);
    safeSaveScopedBankList(storageKey, updated);
    return updated;
  }

  // Hapus dari scope aktif dan periksa bucket v2 lainnya jika ada kecocokan ID
  const active = readActiveProfileFromStorage();
  if (active) {
    const activeKey = buildBankSoalStorageKey(active);
    const activeList = getBankSoal(active);
    const filteredActive = activeList.filter((item) => item.id !== id);
    if (filteredActive.length !== activeList.length) {
      safeSaveScopedBankList(activeKey, filteredActive);
      return filteredActive;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BANK_SOAL_V2_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) {
        const filtered = (parsed as AsesmenDokumen[]).filter((item) => item.id !== id);
        if (filtered.length !== parsed.length) {
          safeSaveScopedBankList(key, filtered);
          return filtered;
        }
      }
    } catch {
      // ignore
    }
  }

  return getBankSoal();
}

export function getPeerQuestionsFromBankSoal(
  profile?: AcademicProfileLike | null,
  excludeDocId?: string
): ButirSoal[] {
  const docs = getBankSoal(profile);
  const peers: ButirSoal[] = [];
  for (const doc of docs) {
    if (excludeDocId && doc.id === excludeDocId) continue;
    for (const s of doc.soalList || []) {
      peers.push(s);
    }
  }
  return peers;
}

export function downloadJsonAssessment(doc: AsesmenDokumen): boolean {
  if (!requireActiveLicenseForAction('mengunduh cadangan JSON asesmen')) {
    return false;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${doc.judul.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  return true;
}
