import type { JenjangFase } from '../types/assessment';
import {
  resolveCPReferenceMetadata,
  resolveDefaultCPRegulationPreset,
  type CPRegulationPresetId,
} from '../data/kurikulumMerdekaCP';
import type {
  CPAsalSumber,
  CPReferenceMeta,
  CPStatusVerifikasi,
} from './schoolProfileStorage';
import {
  CP_STORAGE_V2_KEY,
  buildCPScopeKey,
  normalizeNamespaceSegment,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';

export interface CPAnalysisTPCandidate {
  id: string;
  kodeSaran: string;
  elemenCP: string;
  kompetensi: string;
  lingkupMateri: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  buktiKetercapaian: string[];
  prasyaratSaran?: string[];
  catatan?: string;
}

export interface CPAnalysisResult {
  id: string;
  cpEntryId?: string;
  elemenCPAsal: string;
  teksCPAsli: string;
  kompetensi: string[];
  lingkupMateri: string[];
  kkoRelevan: string[];
  contohBuktiKetercapaian: string[];
  saranPembagianTP: CPAnalysisTPCandidate[];
  sumberAnalisis: 'ai_usulan' | 'manual_guru';
  statusPersetujuan: 'usulan_belum_disetujui' | 'disetujui_guru';
  catatanGuru?: string;
  referensiCP?: CPReferenceMeta;
  dibuatPada: string;
  disetujuiPada?: string;
}

export interface SavedCPEntry {
  id: string;
  schoolId?: string;
  mataPelajaran: string;
  jenjang: string;
  fase: string;
  elemenCP: string;
  teksCP: string;
  asalCP: CPAsalSumber;
  namaDokumenSumber: string;
  nomorDokumen: string;
  tahunVersiDokumen: string;
  urlReferensi?: string;
  statusVerifikasi: CPStatusVerifikasi;
  terverifikasiResmi: boolean;
  catatan?: string;
  catatanPenyesuaianGuru?: string;
  savedAt: string;
  updatedAt: string;
  analisisTersimpan?: CPAnalysisResult;
}

export interface SaveCPEntryInput {
  id?: string;
  mataPelajaran: string;
  jenjang: string;
  fase: JenjangFase | string;
  elemenCP: string;
  teksCP: string;
  asalCP: CPAsalSumber;
  regulationPresetId?: CPRegulationPresetId;
  namaDokumenSumber?: string;
  nomorDokumen?: string;
  tahunVersiDokumen?: string;
  urlReferensi?: string;
  statusVerifikasi?: CPStatusVerifikasi;
  terverifikasiResmi?: boolean;
  catatan?: string;
  catatanPenyesuaianGuru?: string;
  analisisTersimpan?: CPAnalysisResult;
}

export function resolveCPStatusLabel(
  status?: CPStatusVerifikasi,
  terverifikasiResmi?: boolean,
  asalCP?: CPAsalSumber
): string {
  if (asalCP === 'input_guru' || status === 'input_guru') {
    return 'CP Input / Penyesuaian Guru';
  }
  if (status === 'resmi_terverifikasi' || terverifikasiResmi === true) {
    return 'Rujukan Dokumen Resmi (Terverifikasi Naskah)';
  }
  return 'Referensi Sistem (Belum Terverifikasi SK Lengkap)';
}

function readAllCPScopeMap(): Record<string, SavedCPEntry[]> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CP_STORAGE_V2_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, SavedCPEntry[]>)
      : {};
  } catch {
    return {};
  }
}

function writeAllCPScopeMap(map: Record<string, SavedCPEntry[]>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CP_STORAGE_V2_KEY, JSON.stringify(map));
}

function normalizeCPVerificationState(
  input: SaveCPEntryInput,
  resolvedNomorDokumen: string
): {
  asalCP: CPAsalSumber;
  statusVerifikasi: CPStatusVerifikasi;
  terverifikasiResmi: boolean;
} {
  // Aturan integritas Section 3: CP input guru tidak boleh berubah status menjadi CP resmi pemerintah.
  if (input.asalCP === 'input_guru') {
    return {
      asalCP: 'input_guru',
      statusVerifikasi: 'input_guru',
      terverifikasiResmi: false,
    };
  }

  const hasText = Boolean((input.teksCP || '').trim());
  const hasDocNumber = Boolean(resolvedNomorDokumen.trim());
  if (
    (input.statusVerifikasi === 'resmi_terverifikasi' || input.terverifikasiResmi === true) &&
    hasText &&
    hasDocNumber
  ) {
    return {
      asalCP: 'referensi_sistem',
      statusVerifikasi: 'resmi_terverifikasi',
      terverifikasiResmi: true,
    };
  }

  return {
    asalCP: 'referensi_sistem',
    statusVerifikasi: 'referensi_belum_verifikasi',
    terverifikasiResmi: false,
  };
}

export function getSavedCPEntries(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): SavedCPEntry[] {
  const scopeKey = buildCPScopeKey(profile, explicitFase);
  const allMap = readAllCPScopeMap();
  const list = allMap[scopeKey];
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && typeof item === 'object');
}

export function saveCPEntry(
  profile: AcademicProfileLike | null | undefined,
  input: SaveCPEntryInput
): SavedCPEntry {
  const ctx = resolveAcademicContext(profile, input.fase);
  const scopeKey = buildCPScopeKey(
    {
      ...profile,
      schoolId: ctx.schoolId,
      jenjang: input.jenjang || ctx.jenjang,
      mataPelajaranUtama: input.mataPelajaran || ctx.mataPelajaran,
    },
    input.fase || ctx.fase
  );

  const preset = resolveDefaultCPRegulationPreset(
    input.mataPelajaran || ctx.mataPelajaran,
    input.regulationPresetId
  );
  const defaultMeta = resolveCPReferenceMetadata(
    input.mataPelajaran || ctx.mataPelajaran,
    (input.fase || ctx.fase) as JenjangFase,
    input.elemenCP,
    input.jenjang || ctx.jenjang
  );
  const resolvedNomorDokumen =
    (input.nomorDokumen || '').trim() ||
    (input.asalCP === 'input_guru' ? 'Input Guru / KSP Sekolah' : preset.nomorDokumen);
  const resolvedNamaDokumen =
    (input.namaDokumenSumber || '').trim() ||
    (input.asalCP === 'input_guru'
      ? 'Dokumen Satuan Pendidikan / Input Guru'
      : preset.namaDokumenSumber);
  const verification = normalizeCPVerificationState(input, resolvedNomorDokumen);
  const now = new Date().toISOString();
  const allMap = readAllCPScopeMap();
  const currentList = Array.isArray(allMap[scopeKey]) ? [...allMap[scopeKey]] : [];

  const cleanElemen = (input.elemenCP || '').trim() || 'Elemen Umum';
  const entryId =
    (input.id || '').trim() ||
    `cp_${normalizeNamespaceSegment(input.mataPelajaran || ctx.mataPelajaran, 'mapel')}_${normalizeNamespaceSegment(cleanElemen, 'elemen')}_${Date.now().toString(36)}`;

  const existingIdx = currentList.findIndex((item) => item.id === entryId);
  const existing = existingIdx >= 0 ? currentList[existingIdx] : undefined;

  const entry: SavedCPEntry = {
    id: entryId,
    schoolId: ctx.schoolId,
    mataPelajaran: (input.mataPelajaran || ctx.mataPelajaran).trim(),
    jenjang: (input.jenjang || ctx.jenjang).trim(),
    fase: (input.fase || ctx.fase).trim(),
    elemenCP: cleanElemen,
    teksCP: input.teksCP ?? '',
    asalCP: verification.asalCP,
    namaDokumenSumber: resolvedNamaDokumen,
    nomorDokumen: resolvedNomorDokumen,
    tahunVersiDokumen: (input.tahunVersiDokumen || '').trim() || preset.tahunVersiDokumen,
    urlReferensi:
      input.urlReferensi !== undefined ? input.urlReferensi.trim() || undefined : preset.urlReferensi,
    statusVerifikasi: verification.statusVerifikasi,
    terverifikasiResmi: verification.terverifikasiResmi,
    catatan: (input.catatan || '').trim() || defaultMeta.catatan,
    catatanPenyesuaianGuru: (input.catatanPenyesuaianGuru || '').trim() || undefined,
    savedAt: existing?.savedAt || now,
    updatedAt: now,
    analisisTersimpan: input.analisisTersimpan ?? existing?.analisisTersimpan,
  };

  if (existingIdx >= 0) {
    currentList[existingIdx] = entry;
  } else {
    currentList.unshift(entry);
  }

  allMap[scopeKey] = currentList;
  writeAllCPScopeMap(allMap);
  return entry;
}

export function deleteCPEntry(
  profile: AcademicProfileLike | null | undefined,
  cpEntryId: string,
  explicitFase?: string
): boolean {
  const scopeKey = buildCPScopeKey(profile, explicitFase);
  const allMap = readAllCPScopeMap();
  const list = allMap[scopeKey];
  if (!Array.isArray(list)) return false;
  const next = list.filter((item) => item.id !== cpEntryId);
  if (next.length === list.length) return false;
  allMap[scopeKey] = next;
  writeAllCPScopeMap(allMap);
  return true;
}

export function saveCPAnalysisToEntry(
  profile: AcademicProfileLike | null | undefined,
  cpEntryId: string,
  analysis: CPAnalysisResult,
  explicitFase?: string
): SavedCPEntry | null {
  const entries = getSavedCPEntries(profile, explicitFase);
  const target = entries.find((item) => item.id === cpEntryId);
  if (!target) return null;

  // Pastikan teksCP asli pada entry tidak pernah tertimpa saat menyimpan analisis.
  return saveCPEntry(profile, {
    ...target,
    analisisTersimpan: {
      ...analysis,
      cpEntryId: target.id,
      teksCPAsli: target.teksCP,
      elemenCPAsal: target.elemenCP,
    },
  });
}

export function cpEntryToReferenceMeta(entry: SavedCPEntry): CPReferenceMeta {
  return {
    sumber:
      entry.asalCP === 'input_guru'
        ? `Input / Penyesuaian Guru (${entry.namaDokumenSumber || entry.nomorDokumen})`
        : `${entry.nomorDokumen} — ${entry.namaDokumenSumber}`,
    elemenCP: entry.elemenCP,
    fase: entry.fase,
    mataPelajaran: entry.mataPelajaran,
    jenjang: entry.jenjang,
    teksCP: entry.teksCP,
    asalCP: entry.asalCP,
    namaDokumenSumber: entry.namaDokumenSumber,
    nomorDokumen: entry.nomorDokumen,
    tahunVersiDokumen: entry.tahunVersiDokumen,
    urlReferensi: entry.urlReferensi,
    statusVerifikasi: entry.statusVerifikasi,
    terverifikasiResmi: entry.terverifikasiResmi,
    catatan:
      entry.catatan ||
      resolveCPStatusLabel(entry.statusVerifikasi, entry.terverifikasiResmi, entry.asalCP),
    catatanPenyesuaianGuru: entry.catatanPenyesuaianGuru,
    cpEntryId: entry.id,
  };
}
