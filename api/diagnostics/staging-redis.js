import crypto from 'node:crypto';
import { getRedisCredentials } from '../activate-license.js';
import { timingSafeEqualStrings } from '../mayar-webhook.js';

const DIAGNOSTIC_NAMESPACE_PREFIX = 'asesmerdeka:staging:diagnostics:';
const DIAGNOSTIC_TTL_SECONDS = 30;
const REDIS_PROBE_TIMEOUT_MS = 6000;

async function executeUpstashCommand(url, token, commandArgs) {
  const endpoint = String(url || '').replace(/\/$/, '');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REDIS_PROBE_TIMEOUT_MS) : null;

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandArgs),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (err) {
    const isTimeout = err?.name === 'AbortError';
    const wrapped = new Error(
      isTimeout
        ? 'Koneksi ke Upstash Redis timeout.'
        : 'Gagal menghubungi Upstash Redis REST endpoint.'
    );
    wrapped.code = 'REDIS_UNAVAILABLE';
    wrapped.statusCode = 503;
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res || !res.ok) {
    const wrapped = new Error(`Upstash Redis mengembalikan status HTTP ${res?.status || 502}.`);
    wrapped.code = 'REDIS_UNAVAILABLE';
    wrapped.statusCode = 503;
    throw wrapped;
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    const wrapped = new Error('Respons JSON Upstash Redis tidak valid.');
    wrapped.code = 'REDIS_UNAVAILABLE';
    wrapped.statusCode = 503;
    throw wrapped;
  }

  if (!payload || payload.error) {
    const wrapped = new Error('Upstash Redis menolak perintah diagnostik.');
    wrapped.code = 'REDIS_UNAVAILABLE';
    wrapped.statusCode = 503;
    throw wrapped;
  }

  return payload.result;
}

/**
 * Endpoint Diagnostik Sementara: GET /api/diagnostics/staging-redis
 * Memverifikasi konektivitas Upstash Redis pada Vercel Preview branch `staging`.
 *
 * Keamanan wajib:
 * - Mengembalikan HTTP 404 apabila VERCEL_ENV !== 'preview' (termasuk Production).
 * - Mengembalikan HTTP 403 apabila VERCEL_GIT_COMMIT_REF !== 'staging'.
 * - Mewajibkan header Authorization: Bearer <CRON_SECRET> (timing-safe).
 * - Menolak secret via query parameter URL.
 * - Hanya menulis & menghapus key ephemeral pada `asesmerdeka:staging:diagnostics:*`.
 * - Tidak pernah membocorkan URL Redis, token, secret, atau data pengguna.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      reason: 'METHOD_NOT_ALLOWED',
      message: 'Endpoint diagnostik hanya menerima metode HTTP GET.',
    });
  }

  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  if (vercelEnv !== 'preview') {
    return res.status(404).json({
      ok: false,
      reason: 'NOT_FOUND',
      message: 'Endpoint diagnostik tidak tersedia di luar environment Preview.',
    });
  }

  const gitBranch = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim();
  if (!gitBranch || gitBranch !== 'staging') {
    return res.status(403).json({
      ok: false,
      reason: 'BRANCH_NOT_ALLOWED',
      message: 'Endpoint diagnostik staging hanya diizinkan pada branch staging.',
    });
  }

  const urlObj = req.url ? new URL(String(req.url), 'http://localhost') : null;
  const forbiddenQueryKeys = ['secret', 'token', 'cron_secret', 'cronSecret', 'webhook_token'];
  const hasQuerySecret = forbiddenQueryKeys.some((key) => {
    const paramVal = urlObj?.searchParams.get(key);
    const queryVal = req?.query?.[key];
    return (
      (paramVal !== null && String(paramVal).trim() !== '') ||
      (queryVal !== undefined && String(queryVal).trim() !== '')
    );
  });

  if (hasQuerySecret) {
    return res.status(401).json({
      ok: false,
      reason: 'QUERY_SECRET_FORBIDDEN',
      message: 'Secret tidak boleh dikirim melalui query parameter URL. Gunakan Authorization: Bearer.',
    });
  }

  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (!cronSecret) {
    return res.status(503).json({
      ok: false,
      reason: 'CRON_SECRET_NOT_CONFIGURED',
      message: 'CRON_SECRET belum dikonfigurasi pada environment Preview.',
    });
  }

  const authHeader = String(
    req.headers?.authorization || req.headers?.Authorization || ''
  ).trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!bearerToken || !timingSafeEqualStrings(cronSecret, bearerToken)) {
    return res.status(401).json({
      ok: false,
      reason: 'UNAUTHORIZED_DIAGNOSTICS',
      message: 'Header Authorization Bearer CRON_SECRET tidak valid atau tidak ditemukan.',
    });
  }

  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return res.status(503).json({
      ok: false,
      reason: 'REDIS_UNAVAILABLE',
      redisCredentialsConfigured: false,
      message: 'Kredensial Upstash Redis belum tersedia pada environment Preview.',
    });
  }

  const hasUpstashPrimaryEnv = Boolean(
    String(process.env.UPSTASH_REDIS_REST_URL || '').trim() &&
      String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()
  );

  const probeNonce = crypto.randomBytes(12).toString('hex');
  const diagnosticKey = `${DIAGNOSTIC_NAMESPACE_PREFIX}${Date.now()}:${probeNonce}`;
  const expectedPayload = JSON.stringify({
    probe: 'asesmerdeka_staging_redis',
    nonce: probeNonce,
    env: 'preview',
    branch: 'staging',
    ts: new Date().toISOString(),
  });

  let keyCreated = false;
  let cleanupSucceeded = false;

  try {
    const pingStart = Date.now();
    const pingResult = await executeUpstashCommand(url, token, ['PING']);
    const pingLatencyMs = Date.now() - pingStart;
    if (String(pingResult || '').trim().toUpperCase() !== 'PONG') {
      return res.status(502).json({
        ok: false,
        reason: 'REDIS_PING_FAILED',
        redisCredentialsConfigured: true,
        message: 'Redis PING tidak mengembalikan PONG.',
      });
    }

    const setResult = await executeUpstashCommand(url, token, [
      'SET',
      diagnosticKey,
      expectedPayload,
      'EX',
      String(DIAGNOSTIC_TTL_SECONDS),
    ]);
    if (String(setResult || '').trim().toUpperCase() !== 'OK') {
      return res.status(502).json({
        ok: false,
        reason: 'REDIS_SET_FAILED',
        redisCredentialsConfigured: true,
        message: 'Redis SET key diagnostik gagal.',
      });
    }
    keyCreated = true;

    const readResult = await executeUpstashCommand(url, token, ['GET', diagnosticKey]);
    const readMatched = readResult === expectedPayload;
    if (!readMatched) {
      return res.status(502).json({
        ok: false,
        reason: 'REDIS_GET_MISMATCH',
        redisCredentialsConfigured: true,
        message: 'Nilai Redis GET tidak cocok dengan nilai yang ditulis.',
      });
    }

    const delResult = await executeUpstashCommand(url, token, ['DEL', diagnosticKey]);
    const deletedCount = Number(delResult || 0);
    if (deletedCount !== 1) {
      return res.status(502).json({
        ok: false,
        reason: 'REDIS_DELETE_FAILED',
        redisCredentialsConfigured: true,
        message: 'Redis DEL gagal menghapus key diagnostik.',
      });
    }
    keyCreated = false;

    const afterDeleteResult = await executeUpstashCommand(url, token, ['GET', diagnosticKey]);
    const confirmDeleted = afterDeleteResult === null || afterDeleteResult === undefined;
    if (!confirmDeleted) {
      return res.status(502).json({
        ok: false,
        reason: 'REDIS_DELETE_VERIFICATION_FAILED',
        redisCredentialsConfigured: true,
        message: 'Key diagnostik masih terbaca setelah DEL.',
      });
    }
    cleanupSucceeded = true;

    const commitSha = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
    return res.status(200).json({
      ok: true,
      environment: 'preview',
      branch: gitBranch,
      commitShaShort: commitSha ? commitSha.slice(0, 7) : null,
      redisCredentialsConfigured: true,
      redisCredentialSource: hasUpstashPrimaryEnv ? 'UPSTASH_REDIS_REST_*' : 'KV_REST_API_*',
      diagnosticKeyNamespace: `${DIAGNOSTIC_NAMESPACE_PREFIX}*`,
      diagnosticKeyUsed: diagnosticKey,
      ttlSeconds: DIAGNOSTIC_TTL_SECONDS,
      checks: {
        ping: { passed: true, reply: 'PONG', latencyMs: pingLatencyMs },
        setWithTtl: { passed: true, ttlSeconds: DIAGNOSTIC_TTL_SECONDS },
        getAndMatch: { passed: true, matched: true },
        deleteKey: { passed: true, deletedCount },
        confirmDeleted: { passed: true, valueAfterDelete: null },
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(Number(err?.statusCode) || 503).json({
      ok: false,
      reason: err?.code || 'REDIS_UNAVAILABLE',
      redisCredentialsConfigured: true,
      message: err?.message || 'Gagal berkomunikasi dengan Upstash Redis.',
    });
  } finally {
    if (keyCreated && !cleanupSucceeded) {
      await executeUpstashCommand(url, token, ['DEL', diagnosticKey]).catch(() => {});
    }
  }
}
