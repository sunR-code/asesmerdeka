import { LockContentionError, RedisUnavailableError, getRedisCredentials, withDistributedLock } from '../activate-license.js';
import { reconcilePendingWebhooks, timingSafeEqualStrings } from '../mayar-webhook.js';

const CRON_GLOBAL_LOCK_KEY = 'asesmerdeka:cron:mayar_reconcile:global';

/**
 * Vercel Cron Endpoint: GET /api/cron/mayar-reconcile
 * Memproses antrean rekonsiliasi pembayaran Mayar API V2 secara aman, terbatas, dan atomik.
 *
 * Keamanan wajib:
 * - Hanya menerima Authorization: Bearer <CRON_SECRET>.
 * - Dilarang menerima secret di query string atau memakai ulang MAYAR_WEBHOOK_SECRET.
 * - Fail-closed bila CRON_SECRET belum dikonfigurasi atau Redis tidak tersedia di produksi.
 * - Dilindungi distributed lock global agar eksekusi cron bersamaan tidak pernah mengaktifkan ganda.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      reason: 'METHOD_NOT_ALLOWED',
      message: 'Endpoint cron rekonsiliasi hanya menerima metode HTTP GET.',
    });
  }

  try {
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
        message: 'CRON_SECRET tidak boleh dikirim melalui query parameter URL. Gunakan header Authorization: Bearer.',
      });
    }

    const cronSecret = String(process.env.CRON_SECRET || '').trim();
    if (!cronSecret) {
      return res.status(503).json({
        ok: false,
        reason: 'CRON_SECRET_NOT_CONFIGURED',
        message: 'CRON_SECRET wajib dikonfigurasi di environment server sebelum endpoint rekonsiliasi dapat dijalankan.',
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
        reason: 'UNAUTHORIZED_CRON',
        message: 'Header Authorization Bearer CRON_SECRET tidak valid atau tidak ditemukan.',
      });
    }

    const isProd =
      process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProd && !getRedisCredentials().configured) {
      return res.status(503).json({
        ok: false,
        reason: 'REDIS_UNAVAILABLE',
        message: 'Upstash Redis tidak tersedia di environment produksi untuk menjalankan rekonsiliasi.',
      });
    }

    const requestedLimit = Number(
      urlObj?.searchParams.get('limit') ?? req?.query?.limit ?? 20
    );
    const boundedLimit = Math.max(
      1,
      Math.min(25, Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 20)
    );

    const filterOrderId = String(
      urlObj?.searchParams.get('orderId') || req?.query?.orderId || ''
    ).trim();
    const filterMayarInvoiceId = String(
      urlObj?.searchParams.get('mayarInvoiceId') || req?.query?.mayarInvoiceId || ''
    ).trim();
    const filterWebhookEventId = String(
      urlObj?.searchParams.get('webhookEventId') || req?.query?.webhookEventId || ''
    ).trim();

    const lockResult = await withDistributedLock(
      [CRON_GLOBAL_LOCK_KEY],
      async ({ fenceToken }) => {
        const reconcileResult = await reconcilePendingWebhooks({
          orderId: filterOrderId,
          mayarInvoiceId: filterMayarInvoiceId,
          webhookEventId: filterWebhookEventId,
          limit: boundedLimit,
        });
        return {
          ...reconcileResult,
          limitApplied: boundedLimit,
          fenceToken: fenceToken || 0,
        };
      },
      { ttlMs: 30000, waitTimeoutMs: 5000 }
    );

    return res.status(200).json({
      ...lockResult,
      source: 'cron_mayar_reconcile',
    });
  } catch (err) {
    if (err instanceof RedisUnavailableError || err?.name === 'RedisUnavailableError') {
      return res.status(503).json({
        ok: false,
        reason: 'REDIS_UNAVAILABLE',
        message: err?.message || 'Penyimpanan terdistribusi Redis tidak tersedia.',
      });
    }
    if (err instanceof LockContentionError || err?.name === 'LockContentionError') {
      return res.status(409).json({
        ok: false,
        reason: 'LOCK_CONTENTION',
        message: 'Worker rekonsiliasi sedang berjalan di instance lain.',
      });
    }
    console.error('[Cron Mayar Reconcile Error]:', err);
    return res.status(500).json({
      ok: false,
      reason: 'INTERNAL_CRON_ERROR',
      message: 'Terjadi kesalahan internal saat menjalankan rekonsiliasi Mayar.',
    });
  }
}
