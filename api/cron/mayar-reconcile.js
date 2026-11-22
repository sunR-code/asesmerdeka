import { timingSafeEqualStrings } from '../activate-license.js';

/**
 * Retired Vercel Cron Endpoint: GET /api/cron/mayar-reconcile
 * Permanently decommissioned (HTTP 410 Gone).
 * Keeps GET-only, query-secret rejection, and CRON_SECRET verification (when configured)
 * without touching Redis, reading MAYAR_* env vars, or contacting Mayar.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req?.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      reason: 'METHOD_NOT_ALLOWED',
      message: 'Endpoint cron rekonsiliasi hanya menerima metode HTTP GET.',
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
      message: 'CRON_SECRET tidak boleh dikirim melalui query parameter URL. Gunakan header Authorization: Bearer.',
    });
  }

  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (cronSecret) {
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
  }

  return res.status(410).json({
    ok: false,
    retired: true,
    provider: 'mayar',
    reason: 'MAYAR_DECOMMISSIONED',
    source: 'cron_mayar_reconcile',
    message:
      'Endpoint cron rekonsiliasi Mayar (/api/cron/mayar-reconcile) telah dipensiunkan permanen dan tidak lagi menjalankan rekonsiliasi maupun menghubungi Mayar.',
  });
}
