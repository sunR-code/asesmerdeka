import crypto from 'node:crypto';
import { getRedisCredentials } from '../activate-license.js';
import { timingSafeEqualStrings } from '../mayar-webhook.js';

const DIAGNOSTIC_NAMESPACE_PREFIX = 'asesmerdeka:staging:diagnostics:';
const DIAGNOSTIC_TTL_SECONDS = 30;
const REDIS_PROBE_TIMEOUT_MS = 6000;

function inspectRedisEnvSafely() {
  const upstashUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const upstashToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  const kvUrl = String(process.env.KV_REST_API_URL || '').trim();
  const kvToken = String(process.env.KV_REST_API_TOKEN || '').trim();
  const creds = getRedisCredentials();

  let urlScheme = null;
  let isValidHttpsUrl = false;
  if (creds.url) {
    try {
      const parsed = new URL(creds.url);
      urlScheme = parsed.protocol || null;
      isValidHttpsUrl = parsed.protocol === 'https:' && Boolean(parsed.hostname);
    } catch {
      urlScheme = 'invalid_url';
      isValidHttpsUrl = false;
    }
  }

  return {
    creds,
    hasUpstashUrl: Boolean(upstashUrl),
    hasUpstashToken: Boolean(upstashToken),
    hasKvUrl: Boolean(kvUrl),
    hasKvToken: Boolean(kvToken),
    configured: Boolean(creds.configured),
    source: creds.source || null,
    urlScheme,
    isValidHttpsUrl,
  };
}

function logDiagnosticEvent(level, payload) {
  const safeRecord = {
    event: 'staging_redis_diagnostics',
    stage: String(payload.stage || 'unknown'),
    reason: payload.reason || null,
    httpStatus: Number(payload.httpStatus || 200),
    vercelEnv: payload.vercelEnv || null,
    commitRef: payload.commitRef || null,
    cronSecretConfigured: Boolean(payload.cronSecretConfigured),
    redisCredentialsConfigured: Boolean(payload.redisCredentialsConfigured),
    upstreamHttpStatus: payload.upstreamHttpStatus ?? null,
    safeErrorCode: payload.safeErrorCode ?? null,
    elapsedMs: Number(payload.elapsedMs || 0),
  };
  const line = JSON.stringify(safeRecord);
  if (level === 'error') {
    console.error(line);
  } else {
    console.info(line);
  }
}

function mapStageFailureReason(stage) {
  switch (stage) {
    case 'redis_ping':
      return 'REDIS_PING_FAILED';
    case 'redis_set':
      return 'REDIS_SET_FAILED';
    case 'redis_del':
    case 'redis_confirm_deleted':
      return 'REDIS_DELETE_FAILED';
    case 'redis_get':
    default:
      return 'REDIS_GET_FAILED';
  }
}

async function executeUpstashCommand(url, token, commandArgs, stage) {
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
    const rawCode = typeof err?.cause?.code === 'string' ? err.cause.code : typeof err?.code === 'string' ? err.code : '';
    const safeErrorCode = isTimeout
      ? 'ETIMEDOUT'
      : /^[A-Z0-9_]{2,32}$/.test(rawCode)
      ? rawCode
      : err?.name === 'TypeError'
      ? 'FETCH_TYPE_ERROR'
      : 'NETWORK_ERROR';
    const wrapped = new Error(
      isTimeout
        ? 'Koneksi ke Upstash Redis timeout.'
        : 'Gagal menghubungi Upstash Redis REST endpoint.'
    );
    wrapped.code = mapStageFailureReason(stage);
    wrapped.statusCode = 503;
    wrapped.upstreamHttpStatus = null;
    wrapped.safeErrorCode = safeErrorCode;
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res || !res.ok) {
    const status = Number(res?.status || 502);
    const wrapped = new Error(`Upstash Redis mengembalikan status HTTP ${status}.`);
    wrapped.code = mapStageFailureReason(stage);
    wrapped.statusCode = 503;
    wrapped.upstreamHttpStatus = status;
    wrapped.safeErrorCode = `UPSTREAM_HTTP_${status}`;
    throw wrapped;
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    const wrapped = new Error('Respons JSON Upstash Redis tidak valid.');
    wrapped.code = mapStageFailureReason(stage);
    wrapped.statusCode = 503;
    wrapped.upstreamHttpStatus = Number(res.status || 200);
    wrapped.safeErrorCode = 'INVALID_JSON_RESPONSE';
    throw wrapped;
  }

  if (!payload || payload.error) {
    const wrapped = new Error('Upstash Redis menolak perintah diagnostik.');
    wrapped.code = mapStageFailureReason(stage);
    wrapped.statusCode = 503;
    wrapped.upstreamHttpStatus = Number(res.status || 200);
    wrapped.safeErrorCode = 'UPSTASH_COMMAND_ERROR';
    throw wrapped;
  }

  return payload.result;
}

/**
 * Endpoint Diagnostik Sementara: GET /api/diagnostics/staging-redis
 * Memverifikasi konektivitas Upstash Redis pada Vercel Preview branch `staging`.
 *
 * Keamanan & Observabilitas Wajib:
 * - Mengembalikan HTTP 404 apabila VERCEL_ENV !== 'preview' (termasuk Production).
 * - Mengembalikan HTTP 403 apabila VERCEL_GIT_COMMIT_REF !== 'staging'.
 * - Mewajibkan header Authorization: Bearer <CRON_SECRET> (timing-safe).
 * - Menolak secret via query parameter URL.
 * - Menggunakan reason code spesifik & structured log tersanitasi (tanpa URL/token/secret).
 */
export default async function handler(req, res) {
  const startMs = Date.now();
  res.setHeader('Cache-Control', 'no-store');

  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  const gitBranch = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim();
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  const cronSecretConfigured = Boolean(cronSecret);

  let currentStage = 'init';
  let redisInfo = {
    creds: { url: '', token: '', configured: false, source: null },
    hasUpstashUrl: false,
    hasUpstashToken: false,
    hasKvUrl: false,
    hasKvToken: false,
    configured: false,
    source: null,
    urlScheme: null,
    isValidHttpsUrl: false,
  };

  try {
    currentStage = 'method_check';
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      logDiagnosticEvent('info', {
        stage: currentStage,
        reason: 'METHOD_NOT_ALLOWED',
        httpStatus: 405,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(405).json({
        ok: false,
        stage: currentStage,
        reason: 'METHOD_NOT_ALLOWED',
        message: 'Endpoint diagnostik hanya menerima metode HTTP GET.',
      });
    }

    currentStage = 'env_guard';
    if (vercelEnv !== 'preview') {
      logDiagnosticEvent('info', {
        stage: currentStage,
        reason: 'NOT_FOUND',
        httpStatus: 404,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(404).json({
        ok: false,
        stage: currentStage,
        reason: 'NOT_FOUND',
        message: 'Endpoint diagnostik tidak tersedia di luar environment Preview.',
      });
    }

    currentStage = 'branch_guard';
    if (!gitBranch || gitBranch !== 'staging') {
      logDiagnosticEvent('info', {
        stage: currentStage,
        reason: 'BRANCH_NOT_ALLOWED',
        httpStatus: 403,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(403).json({
        ok: false,
        stage: currentStage,
        reason: 'BRANCH_NOT_ALLOWED',
        message: 'Endpoint diagnostik staging hanya diizinkan pada branch staging.',
      });
    }

    currentStage = 'query_secret_check';
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
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason: 'QUERY_SECRET_FORBIDDEN',
        httpStatus: 401,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(401).json({
        ok: false,
        stage: currentStage,
        reason: 'QUERY_SECRET_FORBIDDEN',
        message: 'Secret tidak boleh dikirim melalui query parameter URL. Gunakan Authorization: Bearer.',
      });
    }

    currentStage = 'cron_secret_check';
    if (!cronSecretConfigured) {
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason: 'CRON_SECRET_NOT_CONFIGURED',
        httpStatus: 503,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: false,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(503).json({
        ok: false,
        stage: currentStage,
        reason: 'CRON_SECRET_NOT_CONFIGURED',
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: false,
        message: 'CRON_SECRET belum dikonfigurasi pada runtime Preview.',
      });
    }

    currentStage = 'auth_check';
    const authHeader = String(
      req.headers?.authorization || req.headers?.Authorization || ''
    ).trim();
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!bearerToken || !timingSafeEqualStrings(cronSecret, bearerToken)) {
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason: 'UNAUTHORIZED_DIAGNOSTICS',
        httpStatus: 401,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: false,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(401).json({
        ok: false,
        stage: currentStage,
        reason: 'UNAUTHORIZED_DIAGNOSTICS',
        message: 'Header Authorization Bearer CRON_SECRET tidak valid atau tidak ditemukan.',
      });
    }

    currentStage = 'redis_credentials_check';
    redisInfo = inspectRedisEnvSafely();
    if (!redisInfo.configured) {
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason: 'REDIS_CREDENTIALS_NOT_CONFIGURED',
        httpStatus: 503,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: false,
        safeErrorCode: redisInfo.hasUpstashUrl || redisInfo.hasUpstashToken ? 'PARTIAL_UPSTASH_PAIR' : 'MISSING_ENV_PAIR',
        elapsedMs: Date.now() - startMs,
      });
      return res.status(503).json({
        ok: false,
        stage: currentStage,
        reason: 'REDIS_CREDENTIALS_NOT_CONFIGURED',
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: false,
        hasUpstashRestUrl: redisInfo.hasUpstashUrl,
        hasUpstashRestToken: redisInfo.hasUpstashToken,
        message:
          'Kredensial Upstash Redis REST (UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN) belum tersedia lengkap pada runtime Preview.',
      });
    }

    currentStage = 'redis_url_check';
    if (!redisInfo.isValidHttpsUrl) {
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason: 'REDIS_CREDENTIALS_NOT_CONFIGURED',
        httpStatus: 503,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        safeErrorCode: `INVALID_URL_SCHEME_${String(redisInfo.urlScheme || 'UNKNOWN').replace(/[^A-Z0-9_]/gi, '_').toUpperCase()}`,
        elapsedMs: Date.now() - startMs,
      });
      return res.status(503).json({
        ok: false,
        stage: currentStage,
        reason: 'REDIS_CREDENTIALS_NOT_CONFIGURED',
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        urlScheme: redisInfo.urlScheme,
        message:
          'Format UPSTASH_REDIS_REST_URL harus berupa endpoint HTTPS REST Upstash (bukan redis:// atau URL tidak valid).',
      });
    }

    const { url, token, source: credentialSource } = redisInfo.creds;
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
      currentStage = 'redis_ping';
      const pingStart = Date.now();
      const pingResult = await executeUpstashCommand(url, token, ['PING'], currentStage);
      const pingLatencyMs = Date.now() - pingStart;
      if (String(pingResult || '').trim().toUpperCase() !== 'PONG') {
        logDiagnosticEvent('error', {
          stage: currentStage,
          reason: 'REDIS_PING_FAILED',
          httpStatus: 502,
          vercelEnv,
          commitRef: gitBranch,
          cronSecretConfigured: true,
          redisCredentialsConfigured: true,
          upstreamHttpStatus: 200,
          safeErrorCode: 'UNEXPECTED_PING_REPLY',
          elapsedMs: Date.now() - startMs,
        });
        return res.status(502).json({
          ok: false,
          stage: currentStage,
          reason: 'REDIS_PING_FAILED',
          redisCredentialsConfigured: true,
          message: 'Redis PING tidak mengembalikan PONG.',
        });
      }

      currentStage = 'redis_set';
      const setResult = await executeUpstashCommand(
        url,
        token,
        ['SET', diagnosticKey, expectedPayload, 'EX', String(DIAGNOSTIC_TTL_SECONDS)],
        currentStage
      );
      if (String(setResult || '').trim().toUpperCase() !== 'OK') {
        logDiagnosticEvent('error', {
          stage: currentStage,
          reason: 'REDIS_SET_FAILED',
          httpStatus: 502,
          vercelEnv,
          commitRef: gitBranch,
          cronSecretConfigured: true,
          redisCredentialsConfigured: true,
          upstreamHttpStatus: 200,
          safeErrorCode: 'UNEXPECTED_SET_REPLY',
          elapsedMs: Date.now() - startMs,
        });
        return res.status(502).json({
          ok: false,
          stage: currentStage,
          reason: 'REDIS_SET_FAILED',
          redisCredentialsConfigured: true,
          message: 'Redis SET key diagnostik gagal.',
        });
      }
      keyCreated = true;

      currentStage = 'redis_get';
      const readResult = await executeUpstashCommand(url, token, ['GET', diagnosticKey], currentStage);

      currentStage = 'redis_compare';
      const readMatched = readResult === expectedPayload;
      if (!readMatched) {
        logDiagnosticEvent('error', {
          stage: currentStage,
          reason: 'REDIS_VALUE_MISMATCH',
          httpStatus: 502,
          vercelEnv,
          commitRef: gitBranch,
          cronSecretConfigured: true,
          redisCredentialsConfigured: true,
          upstreamHttpStatus: 200,
          safeErrorCode: 'VALUE_MISMATCH',
          elapsedMs: Date.now() - startMs,
        });
        return res.status(502).json({
          ok: false,
          stage: currentStage,
          reason: 'REDIS_VALUE_MISMATCH',
          redisCredentialsConfigured: true,
          message: 'Nilai Redis GET tidak cocok dengan nilai yang ditulis.',
        });
      }

      currentStage = 'redis_del';
      const delResult = await executeUpstashCommand(url, token, ['DEL', diagnosticKey], currentStage);
      const deletedCount = Number(delResult || 0);
      if (deletedCount !== 1) {
        logDiagnosticEvent('error', {
          stage: currentStage,
          reason: 'REDIS_DELETE_FAILED',
          httpStatus: 502,
          vercelEnv,
          commitRef: gitBranch,
          cronSecretConfigured: true,
          redisCredentialsConfigured: true,
          upstreamHttpStatus: 200,
          safeErrorCode: 'DELETE_COUNT_MISMATCH',
          elapsedMs: Date.now() - startMs,
        });
        return res.status(502).json({
          ok: false,
          stage: currentStage,
          reason: 'REDIS_DELETE_FAILED',
          redisCredentialsConfigured: true,
          message: 'Redis DEL gagal menghapus key diagnostik.',
        });
      }
      keyCreated = false;

      currentStage = 'redis_confirm_deleted';
      const afterDeleteResult = await executeUpstashCommand(
        url,
        token,
        ['GET', diagnosticKey],
        currentStage
      );
      const confirmDeleted = afterDeleteResult === null || afterDeleteResult === undefined;
      if (!confirmDeleted) {
        logDiagnosticEvent('error', {
          stage: currentStage,
          reason: 'REDIS_DELETE_FAILED',
          httpStatus: 502,
          vercelEnv,
          commitRef: gitBranch,
          cronSecretConfigured: true,
          redisCredentialsConfigured: true,
          upstreamHttpStatus: 200,
          safeErrorCode: 'KEY_STILL_EXISTS_AFTER_DELETE',
          elapsedMs: Date.now() - startMs,
        });
        return res.status(502).json({
          ok: false,
          stage: currentStage,
          reason: 'REDIS_DELETE_FAILED',
          redisCredentialsConfigured: true,
          message: 'Key diagnostik masih terbaca setelah DEL.',
        });
      }
      cleanupSucceeded = true;

      const commitSha = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
      const totalElapsedMs = Date.now() - startMs;
      logDiagnosticEvent('info', {
        stage: 'completed',
        reason: 'OK',
        httpStatus: 200,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        upstreamHttpStatus: 200,
        elapsedMs: totalElapsedMs,
      });

      return res.status(200).json({
        ok: true,
        environment: 'preview',
        branch: gitBranch,
        commitShaShort: commitSha ? commitSha.slice(0, 7) : null,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        redisCredentialSource: credentialSource || 'UPSTASH_REDIS_REST_*',
        diagnosticKeyNamespace: `${DIAGNOSTIC_NAMESPACE_PREFIX}*`,
        diagnosticKeyUsed: diagnosticKey,
        ttlSeconds: DIAGNOSTIC_TTL_SECONDS,
        elapsedMs: totalElapsedMs,
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
      const httpStatus = Number(err?.statusCode) || 503;
      const reason = err?.code || mapStageFailureReason(currentStage);
      const totalElapsedMs = Date.now() - startMs;
      logDiagnosticEvent('error', {
        stage: currentStage,
        reason,
        httpStatus,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        upstreamHttpStatus: err?.upstreamHttpStatus ?? null,
        safeErrorCode: err?.safeErrorCode || 'REDIS_UPSTREAM_ERROR',
        elapsedMs: totalElapsedMs,
      });
      return res.status(httpStatus).json({
        ok: false,
        stage: currentStage,
        reason,
        vercelEnv,
        commitRef: gitBranch,
        cronSecretConfigured: true,
        redisCredentialsConfigured: true,
        upstreamHttpStatus: err?.upstreamHttpStatus ?? null,
        safeErrorCode: err?.safeErrorCode || 'REDIS_UPSTREAM_ERROR',
        elapsedMs: totalElapsedMs,
        message: err?.message || 'Gagal berkomunikasi dengan Upstash Redis.',
      });
    } finally {
      if (keyCreated && !cleanupSucceeded) {
        await executeUpstashCommand(url, token, ['DEL', diagnosticKey], 'redis_del_cleanup').catch(
          () => {}
        );
      }
    }
  } catch (err) {
    const safeErrorCode =
      typeof err?.code === 'string' && /^[A-Z0-9_]{2,32}$/.test(err.code)
        ? err.code
        : err?.name
        ? String(err.name).slice(0, 32)
        : 'INTERNAL_EXCEPTION';
    const totalElapsedMs = Date.now() - startMs;
    logDiagnosticEvent('error', {
      stage: currentStage,
      reason: 'DIAGNOSTIC_INTERNAL_ERROR',
      httpStatus: 500,
      vercelEnv,
      commitRef: gitBranch,
      cronSecretConfigured,
      redisCredentialsConfigured: Boolean(redisInfo.configured),
      safeErrorCode,
      elapsedMs: totalElapsedMs,
    });
    return res.status(500).json({
      ok: false,
      stage: currentStage,
      reason: 'DIAGNOSTIC_INTERNAL_ERROR',
      vercelEnv,
      commitRef: gitBranch,
      cronSecretConfigured,
      redisCredentialsConfigured: Boolean(redisInfo.configured),
      safeErrorCode,
      elapsedMs: totalElapsedMs,
      message: 'Terjadi kesalahan internal saat menjalankan diagnostik Redis staging.',
    });
  }
}
