/**
 * Vercel Serverless Function: /api/shared-curriculum
 * Mengelola Bank Referensi Modul Ajar & LKPD Bersama (Shared Community Bank).
 * Menyediakan pembacaan (GET) dan penyimpanan sukarela (POST) di Upstash Redis
 * dengan kebijakan privasi Zero PII Leakage dan proteksi vandalisme draf.
 */

import {
  getRedisCredentials,
  isLicenseRevokedInRedis,
  verifyInternalSerialOrDeviceCode,
} from './activate-license.js';
import { OFFICIAL_SEEDED_LICENSES } from './officialSeeds.js';

// Fallback in-memory store untuk lingkungan pengujian dan dev lokal tanpa Redis
export const localSharedCurriculumStore = new Map();

/**
 * Daftar field identitas pribadi / sekolah yang wajib dihapus (Zero PII)
 */
const PII_KEYS = new Set([
  'namasekolah',
  'namaguru',
  'nip',
  'nipguru',
  'nip_guru',
  'alamatsekolah',
  'kotasekolah',
  'kontak',
  'email',
  'telepon',
  'nohp',
  'nomorhp',
  'telp',
  'kepalasekolah',
  'namakepsek',
  'namakepalasekolah',
  'nipkepsek',
  'nipkepalasekolah',
  'nip_kepala_sekolah',
  'kopsekolah',
  'logosekolah',
  'tahunajaran',
  'semester',
  'namasiswa',
  'nisn',
  'identitasguru',
  'profilguru',
]);

/**
 * Normalisasi segmen teks menjadi slug yang aman untuk kunci Redis
 */
export function slugifySegment(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s./\\+]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Membangun kunci komposit presisi untuk membedakan materi antar kelas dan TP
 * Format: asesmerdeka:shared:{type}:{jenjang}:{kelas}:{mapel}:{tpKode}:{materiPokok}:{model}
 */
export function buildSharedCurriculumKey({
  type,
  jenjang,
  kelas,
  mapel,
  tpKode,
  materiPokok,
  model,
}) {
  const segType = slugifySegment(type || 'modul_ajar');
  const segJenjang = slugifySegment(jenjang || '');
  const segKelas = slugifySegment(kelas || '');
  const segMapel = slugifySegment(mapel || '');
  const segTp = slugifySegment(tpKode || '');
  const segMateri = slugifySegment(materiPokok || '');
  const segModel = slugifySegment(model || 'pbl');

  return `asesmerdeka:shared:${segType}:${segJenjang}:${segKelas}:${segMapel}:${segTp}:${segMateri}:${segModel}`;
}

/**
 * Membersihkan data identitas guru dan sekolah sebelum disimpan ke Cloud (Zero PII)
 */
export function sanitizeCurriculumForSharing(doc) {
  if (!doc || typeof doc !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(doc)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!PII_KEYS.has(lower) && !lower.startsWith('nip')) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Validasi kualitas minimal draf kurikulum (Anti-Vandalisme / Anti-Draf Rusak)
 * Mendukung dokumen Modul Ajar dan dokumen LKPD dengan varian stimulus objek
 */
export function isValidCurriculumData(data, type) {
  if (!data || typeof data !== 'object') return false;
  const materi = String(
    data.materiPokok || data.judul || data.judulAktivitas || data.topik || ''
  ).trim();
  if (materi.length < 3) return false;

  const hasPemahaman =
    typeof data.pemahamanBermakna === 'string' && data.pemahamanBermakna.trim().length >= 5;
  const hasPemantik =
    (Array.isArray(data.pertanyaanPemantik) && data.pertanyaanPemantik.length > 0) ||
    (typeof data.pertanyaanPemantik === 'string' && data.pertanyaanPemantik.trim().length >= 5);
  const hasLangkah =
    (Array.isArray(data.langkahPembelajaran) && data.langkahPembelajaran.length > 0) ||
    (Array.isArray(data.kegiatanPembelajaran) && data.kegiatanPembelajaran.length > 0);
  const hasKegiatanInti =
    (Array.isArray(data.kegiatanInti) && data.kegiatanInti.length > 0) ||
    (typeof data.kegiatanInti === 'string' && data.kegiatanInti.trim().length >= 5);
  const hasStimulus =
    (typeof data.stimulusKasus === 'string' && data.stimulusKasus.trim().length >= 5) ||
    (data.stimulusKasus &&
      typeof data.stimulusKasus === 'object' &&
      ((typeof data.stimulusKasus.teks === 'string' && data.stimulusKasus.teks.trim().length >= 5) ||
        (typeof data.stimulusKasus.judul === 'string' &&
          data.stimulusKasus.judul.trim().length >= 3)));
  const hasPetunjuk =
    (Array.isArray(data.petunjukPengerjaan) && data.petunjukPengerjaan.length > 0) ||
    (typeof data.petunjukPengerjaan === 'string' && data.petunjukPengerjaan.trim().length >= 5);
  const hasLkpdArchetype =
    Boolean(data.eksperimenData && typeof data.eksperimenData === 'object') ||
    Boolean(data.diferensiasiData && typeof data.diferensiasiData === 'object') ||
    Boolean(data.proyekData && typeof data.proyekData === 'object');

  if (type === 'modul_ajar') {
    return Boolean((hasPemahaman || hasPemantik) && (hasLangkah || hasKegiatanInti));
  }

  if (type === 'lkpd') {
    return Boolean(hasStimulus || hasLkpdArchetype || hasPetunjuk);
  }

  return Boolean(
    hasPemahaman ||
    hasPemantik ||
    hasLangkah ||
    hasStimulus ||
    hasKegiatanInti ||
    hasPetunjuk ||
    hasLkpdArchetype
  );
}

/**
 * Memeriksa keabsahan kode lisensi resmi untuk hak publikasi ke Bank Komunitas
 * Mendukung kode serial multi-perangkat dan kode khusus 1-perangkat (ASM-DV26-...)
 */
function isAuthorizedLicense(code, deviceId) {
  if (!code || typeof code !== 'string') return false;
  const cleanCode = code
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  if (!cleanCode) return false;
  if (verifyInternalSerialOrDeviceCode(cleanCode, deviceId)) return true;
  if (OFFICIAL_SEEDED_LICENSES.some((l) => l.code === cleanCode)) return true;
  return false;
}

/**
 * Helper untuk membaca data dari Redis atau Memory Store
 */
async function fetchCurriculumFromStorage(key) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return localSharedCurriculumStore.get(key) || null;
  }

  const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return localSharedCurriculumStore.get(key) || null;
    const body = await res.json().catch(() => null);
    if (!body || !body.result) return localSharedCurriculumStore.get(key) || null;
    return typeof body.result === 'string' ? JSON.parse(body.result) : body.result;
  } catch {
    return localSharedCurriculumStore.get(key) || null;
  }
}

/**
 * Helper untuk menyimpan data ke Redis dan Memory Store
 */
async function saveCurriculumToStorage(key, data) {
  localSharedCurriculumStore.set(key, data);

  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return { configured: false, ok: true };
  }

  const endpoint = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Upstash Redis SET gagal (${res.status}): ${errText}`);
  }

  return { configured: true, ok: true };
}

/**
 * Vercel Serverless Handler
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      let params = req.query;
      if (!params || Object.keys(params).length === 0) {
        if (typeof req.url === 'string' && req.url.includes('?')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            params = Object.fromEntries(urlObj.searchParams.entries());
          } catch {
            params = {};
          }
        }
      }
      if ((!params || Object.keys(params).length === 0) && req.body) {
        params = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
      params = params || {};

      const { type, jenjang, kelas, mapel, tpKode, materiPokok, model } = params;
      if (!type || !jenjang || !kelas || !mapel || !tpKode || !materiPokok) {
        return res.status(400).json({
          ok: false,
          found: false,
          message: 'Parameter pencarian kurikulum tidak lengkap (type, jenjang, kelas, mapel, tpKode, materiPokok wajib disertakan).',
        });
      }

      const key = buildSharedCurriculumKey({
        type,
        jenjang,
        kelas,
        mapel,
        tpKode,
        materiPokok,
        model,
      });

      const cached = await fetchCurriculumFromStorage(key);
      if (!cached) {
        return res.status(200).json({
          ok: true,
          found: false,
          message: 'Draf kurikulum belum tersedia di Bank Referensi Bersama.',
        });
      }

      return res.status(200).json({
        ok: true,
        found: true,
        data: cached,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const {
        type,
        jenjang,
        kelas,
        mapel,
        tpKode,
        materiPokok,
        model,
        licenseCode,
        deviceId,
        data,
      } = body;

      if (!type || !jenjang || !kelas || !mapel || !tpKode || !materiPokok) {
        return res.status(400).json({
          ok: false,
          message: 'Parameter kurikulum tidak lengkap.',
        });
      }

      if (!data || !isValidCurriculumData(data, type)) {
        return res.status(400).json({
          ok: false,
          message: 'Draf kurikulum tidak lengkap atau rusak.',
        });
      }

      const cleanCode = String(licenseCode || '')
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase();

      if (!isAuthorizedLicense(cleanCode, deviceId)) {
        return res.status(403).json({
          ok: false,
          message: 'Akses ditolak. Memerlukan kode lisensi resmi yang sah untuk mempublikasikan kurikulum.',
        });
      }

      const isRevoked = await isLicenseRevokedInRedis(cleanCode);
      if (isRevoked) {
        return res.status(403).json({
          ok: false,
          message: 'Kode lisensi telah dinonaktifkan atau dicabut.',
        });
      }

      const sanitizedData = sanitizeCurriculumForSharing(data);
      const key = buildSharedCurriculumKey({
        type,
        jenjang,
        kelas,
        mapel,
        tpKode,
        materiPokok,
        model,
      });

      await saveCurriculumToStorage(key, sanitizedData);

      return res.status(200).json({
        ok: true,
        message: 'Draf kurikulum berhasil dibagikan ke Bank Komunitas.',
        key,
      });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      ok: false,
      message: 'Metode HTTP tidak diizinkan. Gunakan GET atau POST.',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Terjadi kesalahan server internal pada /api/shared-curriculum.',
    });
  }
}
