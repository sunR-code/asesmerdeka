/**
 * Vercel Serverless Function: /api/cloud-sync
 * Menyimpan & memulihkan riwayat data pengisian Guru lintas perangkat (HP <-> Laptop/Komputer)
 * berbasis Kode Lisensi Resmi menggunakan Upstash Redis REST API (atau Vercel KV).
 *
 * Environment Variables yang didukung otomatis dari Vercel Marketplace (Upstash):
 * - UPSTASH_REDIS_REST_URL atau KV_REST_API_URL
 * - UPSTASH_REDIS_REST_TOKEN atau KV_REST_API_TOKEN
 */

// Fallback memori lokal saat dijalankan pada environment dev lokal tanpa Redis
const localDevMemoryStore = new Map();

function sanitizeKeySegment(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_')
    .slice(0, 64);
}

function isSchoolSharedCode(cleanCode) {
  return (
    cleanCode.includes('SEKOLAH') ||
    cleanCode.includes('SMAN') ||
    cleanCode.includes('SMPN') ||
    cleanCode.includes('SDN') ||
    cleanCode.includes('SCH')
  );
}

function buildRedisWorkspaceKey(licenseCode, teacherPin) {
  const cleanCode = sanitizeKeySegment(licenseCode);
  const cleanPin = sanitizeKeySegment(teacherPin || 'DEFAULT');
  if (isSchoolSharedCode(cleanCode)) {
    return `asesmerdeka:sync:v1:${cleanCode}:guru_${cleanPin}`;
  }
  // Untuk Lisensi Guru Mandiri (Individu), jika guru mengisi PIN tetap dipisah, jika kosong gunakan MAIN
  return cleanPin && cleanPin !== 'DEFAULT'
    ? `asesmerdeka:sync:v1:${cleanCode}:pin_${cleanPin}`
    : `asesmerdeka:sync:v1:${cleanCode}:MAIN`;
}

function getRedisCredentials() {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ''
  ).trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ''
  ).trim();
  return { url, token, configured: Boolean(url && token) };
}

async function redisGet(key) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return {
      configured: false,
      value: localDevMemoryStore.get(key) || null,
    };
  }

  const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Upstash Redis GET gagal (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data || data.result === null || data.result === undefined) {
    return { configured: true, value: null };
  }

  try {
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return { configured: true, value: parsed };
  } catch {
    return { configured: true, value: null };
  }
}

async function redisSet(key, payloadObj) {
  const { url, token, configured } = getRedisCredentials();
  const serialized = JSON.stringify(payloadObj);

  // Batasi ukuran payload maksimal ~1.5 MB agar hemat kuota gratis Upstash Redis
  if (serialized.length > 1_500_000) {
    throw new Error('Ukuran data sinkronisasi melebihi batas maksimal 1.5 MB.');
  }

  if (!configured) {
    localDevMemoryStore.set(key, payloadObj);
    return { configured: false, ok: true };
  }

  const endpoint = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: serialized,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Upstash Redis SET gagal (${res.status}): ${errText}`);
  }

  return { configured: true, ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      message: 'Metode HTTP tidak diizinkan. Gunakan POST.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = String(body.action || '').trim().toLowerCase();
    const rawCode = String(body.licenseCode || '').trim().toUpperCase();
    const rawPin = String(body.teacherPin || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!rawCode || rawCode.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'Kode lisensi wajib disertakan untuk sinkronisasi cloud lintas perangkat.',
      });
    }

    if (isSchoolSharedCode(rawCode) && (!rawPin || rawPin.length < 2)) {
      return res.status(400).json({
        ok: false,
        requiresPin: true,
        message:
          'Untuk Lisensi Kolektif Sekolah (25 Guru), wajib mengisi Nama Singkat / PIN Pribadi Guru agar data Anda tidak tertukar dengan guru lain.',
      });
    }

    const workspaceKey = buildRedisWorkspaceKey(rawCode, rawPin);

    if (action === 'pull') {
      const result = await redisGet(workspaceKey);
      if (!result.value) {
        return res.status(200).json({
          ok: true,
          found: false,
          cloudConfigured: result.configured,
          message: 'Belum ada riwayat tersimpan di Cloud untuk kode lisensi ini.',
        });
      }

      return res.status(200).json({
        ok: true,
        found: true,
        cloudConfigured: result.configured,
        updatedAt: result.value.updatedAt,
        lastDeviceId: result.value.deviceId,
        entries: result.value.entries || {},
        message: 'Data riwayat berhasil ditemukan dan dipulihkan dari Cloud.',
      });
    }

    if (action === 'push') {
      const entries = body.entries;
      if (!entries || typeof entries !== 'object') {
        return res.status(400).json({
          ok: false,
          message: 'Data entries tidak valid untuk disimpan ke Cloud.',
        });
      }

      const record = {
        licenseCode: rawCode,
        teacherPin: rawPin ? sanitizeKeySegment(rawPin) : undefined,
        deviceId,
        updatedAt: new Date().toISOString(),
        entries,
      };

      const saveRes = await redisSet(workspaceKey, record);
      return res.status(200).json({
        ok: true,
        cloudConfigured: saveRes.configured,
        updatedAt: record.updatedAt,
        message: saveRes.configured
          ? 'Riwayat pengisian berhasil disinkronkan ke Cloud!'
          : 'Riwayat disimpan di memori lokal (tambahkan Upstash Redis di Vercel untuk sinkronisasi antar perangkat).',
      });
    }

    return res.status(400).json({
      ok: false,
      message: 'Action tidak dikenali. Gunakan "pull" atau "push".',
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Terjadi kesalahan saat menyinkronkan data ke Cloud.',
    });
  }
}

