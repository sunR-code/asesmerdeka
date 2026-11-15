import crypto from 'node:crypto';
import {
  FencedWriteConflictError,
  LockContentionError,
  REGISTRY_REDIS_KEY,
  RedisUnavailableError,
  appendSanitizedWebhookAudit,
  autoRegisterLicenseInAdminRegistry,
  buildPaymentOrderKey,
  buildSeatRedisKey,
  buildWebhookEventKey,
  buildWebhookTxKey,
  enqueueReconcileJob,
  evalRedisScript,
  generateOrderLicenseCodeServer,
  getOrderIdByMayarInvoiceId,
  getPaymentOrderRecord,
  getReconcileQueueRecords,
  getRedisCredentials,
  getSanitizedWebhookAuditLog,
  getSeatRecordFromRedis,
  getWebhookEventRecord,
  getWebhookTransactionRecord,
  isLicenseRevokedInRedis,
  localMayarInvoiceIndexStore,
  localReconcileQueueStore,
  localWebhookAuditLog,
  localWebhookEventStore,
  localWebhookTransactionStore,
  normalizeLicenseCode,
  parseMayarV2ResponseEnvelope,
  removeReconcileJob,
  resolveMayarApiV2Config,
  saveMayarInvoiceIndex,
  savePaymentOrderRecord,
  saveSeatRecordToRedis,
  saveWebhookEventRecord,
  saveWebhookTransactionRecord,
  verifyInternalSerialOrDeviceCode,
  withDistributedLock,
} from './activate-license.js';

export {
  buildWebhookEventKey,
  buildWebhookTxKey,
  getReconcileQueueRecords,
  getSanitizedWebhookAuditLog,
  localMayarInvoiceIndexStore,
  localReconcileQueueStore,
  localWebhookAuditLog,
  localWebhookEventStore,
  localWebhookTransactionStore,
  timingSafeEqualStrings,
  withDistributedLock,
};

export async function withTransactionLock(lockKeyOrKeys, task, options = {}) {
  const keys = Array.isArray(lockKeyOrKeys)
    ? lockKeyOrKeys
    : lockKeyOrKeys
    ? [String(lockKeyOrKeys)]
    : [];
  if (keys.length === 0) {
    return task({ distributed: false, lockKeys: [], ownerToken: '', fenceToken: 0 });
  }
  return await withDistributedLock(keys, task, options);
}

export const LUA_COMMIT_WEBHOOK_SETTLEMENT_SCRIPT = `
-- ASESMERDEKA_COMMIT_SETTLEMENT_V1
local owner = ARGV[1] or ''
local expectedFence = tonumber(ARGV[2]) or 0
local hasEvent = ARGV[3] == '1'
local hasOrder = ARGV[4] == '1'
local cleanCode = ARGV[5] or ''
local txId = ARGV[6] or ''
local orderId = ARGV[7] or ''
local txJson = ARGV[8]
local eventJson = ARGV[9]
local orderJson = ARGV[10]
local seatPatchJson = ARGV[11]
local adminPatchJson = ARGV[12]

if owner ~= '' and KEYS[1] ~= '' and KEYS[1] ~= 'asesmerdeka:noop:lock' then
  if redis.call('GET', KEYS[1]) ~= owner then
    return {'LOCK_LOST', KEYS[1]}
  end
end

local txCommitted = false
local curTxRaw = redis.call('GET', KEYS[2])
if curTxRaw then
  local okTx, curTx = pcall(cjson.decode, curTxRaw)
  if okTx and type(curTx) == 'table' then
    local curTxFence = tonumber(curTx.fenceToken) or 0
    if expectedFence > 0 and curTxFence > expectedFence then
      return {'STALE_FENCE', 'tx'}
    end
    local existingCode = tostring(curTx.licenseCode or '')
    local existingOrd = tostring(curTx.orderId or curTx.invoiceId or '')
    if (cleanCode ~= '' and existingCode ~= '' and existingCode ~= cleanCode)
      or (orderId ~= '' and existingOrd ~= '' and existingOrd ~= orderId) then
      return {'TRANSACTION_ALREADY_BOUND', 'tx'}
    end
    if curTx.status == 'paid' and curTx.consistencyState == 'committed' then
      txCommitted = true
    end
  end
end

if hasEvent then
  local curEvRaw = redis.call('GET', KEYS[3])
  if curEvRaw then
    local okEv, curEv = pcall(cjson.decode, curEvRaw)
    if okEv and type(curEv) == 'table' then
      local curEvFence = tonumber(curEv.fenceToken) or 0
      if expectedFence > 0 and curEvFence > expectedFence then
        return {'STALE_FENCE', 'event'}
      end
      if curEv.status == 'paid' or curEv.consistencyState == 'committed' then
        local evCode = tostring(curEv.licenseCode or '')
        local evOrd = tostring(curEv.orderId or curEv.invoiceId or '')
        local evTx = tostring(curEv.transactionId or '')
        if (cleanCode ~= '' and evCode ~= '' and evCode ~= cleanCode)
          or (orderId ~= '' and evOrd ~= '' and evOrd ~= orderId)
          or (txId ~= '' and evTx ~= '' and evTx ~= txId) then
          return {'TRANSACTION_ALREADY_BOUND', 'event'}
        end
        if curEv.consistencyState == 'committed' and txCommitted then
          return {'IDEMPOTENT', 'webhook_event', curEvRaw}
        end
      end
    end
  end
end

if hasOrder then
  local curOrdRaw = redis.call('GET', KEYS[4])
  if curOrdRaw then
    local okOrd, curOrd = pcall(cjson.decode, curOrdRaw)
    if okOrd and type(curOrd) == 'table' then
      local curOrdFence = tonumber(curOrd.fenceToken) or 0
      if expectedFence > 0 and curOrdFence > expectedFence then
        return {'STALE_FENCE', 'order'}
      end
      local ordTx = tostring(curOrd.transactionId or '')
      if ordTx ~= '' and txId ~= '' and ordTx ~= txId then
        return {'TRANSACTION_ALREADY_BOUND', 'order'}
      end
    end
  end
end

if txCommitted then
  if hasOrder then
    local curOrdCheckRaw = redis.call('GET', KEYS[4])
    local curOrdPaid = false
    if curOrdCheckRaw then
      local okOC, ordOC = pcall(cjson.decode, curOrdCheckRaw)
      if okOC and type(ordOC) == 'table' and ordOC.status == 'paid' and ordOC.consistencyState == 'committed' then
        curOrdPaid = true
      end
    end
    local curSeatExists = redis.call('GET', KEYS[5]) ~= false
    if curOrdPaid and curSeatExists then
      if hasEvent then
        redis.call('SET', KEYS[3], eventJson)
      end
      return {'IDEMPOTENT', 'transaction', curTxRaw}
    end
  else
    if redis.call('GET', KEYS[5]) ~= false then
      if hasEvent then
        redis.call('SET', KEYS[3], eventJson)
      end
      return {'IDEMPOTENT', 'transaction', curTxRaw}
    end
  end
end

local seatObj = {}
local curSeatRaw = redis.call('GET', KEYS[5])
local nextSeatRev = 1
if curSeatRaw then
  local okSeat, curSeat = pcall(cjson.decode, curSeatRaw)
  if okSeat and type(curSeat) == 'table' then
    local curSeatFence = tonumber(curSeat.fenceToken) or 0
    if expectedFence > 0 and curSeatFence > expectedFence then
      return {'STALE_FENCE', 'seat'}
    end
    seatObj = curSeat
    nextSeatRev = (tonumber(curSeat.seatRevision) or 0) + 1
  end
end

local _, seatPatch = pcall(cjson.decode, seatPatchJson)
local preservedDevices = (type(seatObj.devices) == 'table') and seatObj.devices or {}
local computedLifecycle = (#preservedDevices > 0) and 'active' or 'paid'
seatObj.licenseCode = seatPatch.licenseCode
seatObj.planType = seatPatch.planType
seatObj.tier = seatPatch.tier
seatObj.maxSeats = seatObj.maxSeats or seatPatch.maxSeats
seatObj.devices = preservedDevices
if seatPatch.hasExpiresAt then seatObj.expiresAt = seatPatch.expiresAt end
if seatPatch.transactionId and seatPatch.transactionId ~= '' then seatObj.transactionId = seatPatch.transactionId end
seatObj.lifecycleState = computedLifecycle
seatObj.consistencyState = 'committed'
seatObj.seatRevision = nextSeatRev
seatObj.fenceToken = expectedFence
seatObj.updatedAt = seatPatch.updatedAt
if seatPatch.buyerName then seatObj.buyerName = seatPatch.buyerName end
if seatPatch.buyerEmail then seatObj.buyerEmail = seatPatch.buyerEmail end

local _, adminPatch = pcall(cjson.decode, adminPatchJson)
local regList = {}
local curRegRaw = redis.call('GET', KEYS[6])
if curRegRaw then
  local okReg, decodedReg = pcall(cjson.decode, curRegRaw)
  if okReg and type(decodedReg) == 'table' then
    regList = decodedReg
  end
end
local foundIdx = -1
for i = 1, #regList do
  if regList[i] and regList[i].code == adminPatch.code then
    foundIdx = i
    break
  end
end
if foundIdx > 0 then
  local target = regList[foundIdx]
  target.updatedAt = adminPatch.updatedAt
  if adminPatch.label and adminPatch.label ~= '' then target.label = adminPatch.label end
  if adminPatch.planType and adminPatch.planType ~= '' then target.planType = adminPatch.planType end
  if adminPatch.tier and adminPatch.tier ~= '' then target.tier = adminPatch.tier end
  if adminPatch.hasExpiresAt then target.expiresAt = adminPatch.expiresAt end
  if adminPatch.transactionId and adminPatch.transactionId ~= '' then target.transactionId = adminPatch.transactionId end
  target.lifecycleState = computedLifecycle
  regList[foundIdx] = target
else
  table.insert(regList, 1, adminPatch.newEntry)
end

redis.call('SET', KEYS[2], txJson)
if hasEvent then
  redis.call('SET', KEYS[3], eventJson)
end
if hasOrder then
  redis.call('SET', KEYS[4], orderJson)
end
redis.call('SET', KEYS[5], cjson.encode(seatObj))
redis.call('SET', KEYS[6], cjson.encode(regList))
return {'COMMITTED', computedLifecycle}
`.trim();

function timingSafeEqualStrings(aStr, bStr) {
  const rawA = String(aStr ?? '');
  const rawB = String(bStr ?? '');
  const aHash = crypto.createHash('sha256').update(rawA, 'utf8').digest();
  const bHash = crypto.createHash('sha256').update(rawB, 'utf8').digest();
  const equalDigest = crypto.timingSafeEqual(aHash, bHash);
  return equalDigest && rawA.length > 0 && rawA.length === rawB.length;
}

export function redactWebhookUrlForLog(rawUrl) {
  const input = String(rawUrl || '').trim();
  if (!input) return '';
  const sensitiveKeys = new Set(['token', 'webhook_token', 'secret', 'key', 'signature']);
  const qIdx = input.indexOf('?');
  if (qIdx < 0) return input;
  const base = input.slice(0, qIdx);
  const query = input.slice(qIdx + 1);
  const redactedPairs = query.split('&').map((part) => {
    if (!part) return '';
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) {
      return sensitiveKeys.has(part.toLowerCase()) ? `${part}=[REDACTED]` : part;
    }
    const paramName = part.slice(0, eqIdx);
    let decodedName = paramName;
    try {
      decodedName = decodeURIComponent(paramName);
    } catch {
      // keep original
    }
    if (sensitiveKeys.has(decodedName.toLowerCase())) {
      return `${paramName}=[REDACTED]`;
    }
    return part;
  });
  return `${base}?${redactedPairs.filter(Boolean).join('&')}`;
}

export function extractMayarWebhookIdentifiers(payload = {}, data = {}, headers = {}) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const safeData = data && typeof data === 'object' ? data : {};
  const safeHeaders = headers && typeof headers === 'object' ? headers : {};

  const eventNormalized = String(safePayload.event || safePayload.type || '')
    .trim()
    .toUpperCase();

  const headerDeliveryId = String(
    safeHeaders['x-mayar-delivery-id'] ||
      safeHeaders['X-Mayar-Delivery-Id'] ||
      safeHeaders['x-mayar-event-id'] ||
      safeHeaders['X-Mayar-Event-Id'] ||
      safeHeaders['x-webhook-id'] ||
      safeHeaders['X-Webhook-Id'] ||
      ''
  )
    .trim()
    .toUpperCase();

  const webhookDataId = String(safeData.id || '').trim().toUpperCase();
  const rawPayloadTopId = String(
    safePayload.eventId ||
      safePayload.event_id ||
      safePayload.webhookEventId ||
      safePayload.deliveryId ||
      safePayload.delivery_id ||
      (safePayload.id && String(safePayload.id).trim().toUpperCase() !== webhookDataId
        ? safePayload.id
        : '') ||
      safeData.webhookEventId ||
      safeData.webhook_id ||
      safeData.eventId ||
      safeData.event_id ||
      safeData.deliveryId ||
      safeData.delivery_id ||
      ''
  )
    .trim()
    .toUpperCase();

  const primaryTxField = String(
    safeData.transactionId ||
      safeData.transaction_id ||
      safeData.paymentLinkTransactionId ||
      safeData.payment_link_transaction_id ||
      safeData.transaction?.id ||
      (Array.isArray(safeData.transactions) && safeData.transactions.length === 1
        ? safeData.transactions[0]?.id || ''
        : '') ||
      ''
  ).trim();

  const secondaryRefField = String(
    safeData.paymentId ||
      safeData.payment_id ||
      safeData.referenceId ||
      safeData.reference_id ||
      safeData.txId ||
      ''
  ).trim();

  let transactionIdSource = 'none';
  if (primaryTxField) {
    transactionIdSource = 'explicit_transaction_id';
  } else if (secondaryRefField) {
    transactionIdSource = 'explicit_payment_reference';
  }

  // DILARANG keras mempromosikan data.id atau payload.id menjadi transactionId secara otomatis!
  const transactionId = String(primaryTxField || secondaryRefField || '').trim().toUpperCase();

  const orderId = String(
    safeData.orderId ||
      safeData.order_id ||
      safeData.invoiceId ||
      safeData.invoice_id ||
      safeData.extraData?.order_id ||
      safeData.extraData?.orderId ||
      safeData.extraData?.invoice_id ||
      safeData.extraData?.invoiceId ||
      safeData.metadata?.order_id ||
      safeData.metadata?.orderId ||
      safeData.metadata?.invoice_id ||
      safeData.metadata?.invoiceId ||
      safePayload.orderId ||
      safePayload.invoiceId ||
      ''
  )
    .trim()
    .toUpperCase();

  // Mayar Invoice / Payment Link UUID hanya diambil dari field invoice Mayar eksplisit.
  // DILARANG keras menggunakan webhook data.id (webhookDataId) maupun internal INV-* orderId sebagai Mayar Invoice UUID!
  const mayarInvoiceId = String(
    safeData.mayarInvoiceId ||
      safeData.mayar_invoice_id ||
      safeData.invoiceUuid ||
      safeData.invoice_uuid ||
      safeData.paymentLinkId ||
      safeData.payment_link_id ||
      safeData.invoice?.id ||
      ''
  )
    .trim()
    .toUpperCase();

  const explicitDeliveryId = headerDeliveryId || rawPayloadTopId || '';
  const dataIdSameAsTransactionId = Boolean(
    webhookDataId && transactionId && webhookDataId === transactionId
  );

  let webhookEventId = '';
  let webhookEventIdSource = 'none';
  if (explicitDeliveryId && explicitDeliveryId !== transactionId && explicitDeliveryId !== webhookDataId) {
    webhookEventId = explicitDeliveryId;
    webhookEventIdSource = headerDeliveryId ? 'header_delivery_id' : 'explicit_event_id';
  } else {
    // Pada payload webhook V2 (termasuk payment.reminder di mana data.id === data.transactionId),
    // gunakan composite idempotency key berbasis tipe event agar event berbeda pada transaksi yang sama
    // tidak saling memblokir, sementara retry event yang sama tetap idempoten.
    const entitySuffix =
      explicitDeliveryId ||
      webhookDataId ||
      mayarInvoiceId ||
      transactionId ||
      orderId ||
      crypto
        .createHash('sha256')
        .update(JSON.stringify(safePayload))
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();
    const eventTag = eventNormalized || 'WEBHOOK';
    webhookEventId = `V2:${eventTag}:${entitySuffix}`;
    webhookEventIdSource = explicitDeliveryId
      ? 'event_typed_delivery_id'
      : webhookDataId
      ? 'event_typed_data_id'
      : 'event_typed_entity';
  }

  return {
    webhookEventId,
    webhookEventIdSource,
    webhookDeliveryId: explicitDeliveryId || null,
    webhookDataId,
    transactionId,
    orderId,
    invoiceId: orderId,
    mayarInvoiceId,
    mayarLookupId: mayarInvoiceId,
    transactionIdSource,
    dataIdSameAsTransactionId,
    ambiguousTransactionIdentity: !transactionId,
    hasDistinctEventAndTransactionId: Boolean(
      webhookEventId && transactionId && webhookEventId !== transactionId
    ),
    webhookIdSameAsInvoiceId: Boolean(
      webhookEventId && mayarInvoiceId && webhookEventId === mayarInvoiceId
    ),
  };
}

export async function correlateMayarTransactionViaApi({
  mayarInvoiceId = '',
  lookupId = '',
  expectedAmount = 0,
  expectedTransactionId = '',
  allowedProductIds = [],
  timeoutMs = 8000,
} = {}) {
  const v2Config = resolveMayarApiV2Config();
  if (!v2Config.ok) {
    return {
      resolved: false,
      terminal: true,
      retryable: false,
      httpStatus: 500,
      reason: v2Config.reason || 'DEPRECATED_MAYAR_V1_URL',
      message: v2Config.message,
    };
  }

  const apiKey = String(process.env.MAYAR_API_KEY || '').trim();
  const targetId = String(mayarInvoiceId || lookupId || '').trim();
  if (!apiKey || !targetId) {
    return {
      resolved: false,
      retryable: true,
      httpStatus: 202,
      reason: !apiKey ? 'MAYAR_API_KEY_NOT_CONFIGURED' : 'MISSING_MAYAR_INVOICE_ID',
    };
  }

  const endpoint = `${v2Config.hlV2BaseUrl}/invoices/${encodeURIComponent(targetId)}`;
  const effectiveTimeoutMs = Math.max(50, Number(process.env.MAYAR_API_TIMEOUT_MS) || timeoutMs);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), effectiveTimeoutMs) : null;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });

    const body = response ? await response.json().catch(() => null) : null;
    const envelope = parseMayarV2ResponseEnvelope(response, body);
    if (!envelope.ok) {
      return {
        resolved: false,
        reason: envelope.reason,
        httpStatus: envelope.httpStatus,
        retryable: envelope.retryable,
      };
    }

    const apiData = envelope.data;
    const returnedInvoiceId = String(apiData.id || '').trim().toUpperCase();
    if (!returnedInvoiceId || returnedInvoiceId !== targetId.toUpperCase()) {
      return {
        resolved: false,
        reason: 'INVOICE_CORRELATION_MISMATCH',
        terminal: true,
        httpStatus: 409,
      };
    }

    const rawCurr = apiData.currency;
    if (rawCurr && String(rawCurr).trim().toUpperCase() !== 'IDR') {
      return { resolved: false, reason: 'CURRENCY_MISMATCH', terminal: true, httpStatus: 400 };
    }

    const apiProductId = String(apiData.productId || apiData.product_id || '').trim();
    if (allowedProductIds.length > 0 && apiProductId && !allowedProductIds.includes(apiProductId)) {
      return { resolved: false, reason: 'PRODUCT_MISMATCH', terminal: true, httpStatus: 400 };
    }

    const effectiveApiAmount =
      apiData.amountPaid !== undefined && apiData.amountPaid !== null
        ? apiData.amountPaid
        : apiData.amount;
    if (expectedAmount > 0) {
      if (effectiveApiAmount === undefined || effectiveApiAmount === null || effectiveApiAmount === '') {
        return {
          resolved: false,
          reason: 'MAYAR_API_INCOMPLETE_ENVELOPE',
          retryable: true,
          httpStatus: 502,
        };
      }
      const numericApiAmount = Number(effectiveApiAmount);
      if (!Number.isFinite(numericApiAmount) || numericApiAmount !== Number(expectedAmount)) {
        return {
          resolved: false,
          reason: 'AMOUNT_MISMATCH',
          terminal: true,
          httpStatus: 400,
          amount: numericApiAmount,
        };
      }
    }

    const statusStr = String(apiData.status ?? '').trim().toLowerCase();
    if (['failed', 'cancelled', 'canceled', 'expired', 'closed', 'refunded'].includes(statusStr)) {
      return {
        resolved: false,
        reason: 'MAYAR_API_PAYMENT_FAILED',
        status: statusStr,
        terminal: true,
        httpStatus: 422,
      };
    }

    if (statusStr !== 'paid') {
      return {
        resolved: false,
        reason: 'MAYAR_API_PAYMENT_NOT_SETTLED',
        status: statusStr || 'unpaid',
        isUnpaid: true,
        retryable: true,
        httpStatus: 202,
      };
    }

    const cleanExpectedTx = String(expectedTransactionId || '').trim().toUpperCase();
    const primaryApiTxId = String(
      apiData.transactionId ||
        apiData.transaction_id ||
        apiData.paymentLinkTransactionId ||
        apiData.payment_link_transaction_id ||
        ''
    )
      .trim()
      .toUpperCase();
    const txList = Array.isArray(apiData.transactions)
      ? Array.from(
          new Set(
            apiData.transactions
              .map((tx) =>
                String(tx?.id || tx?.transactionId || tx?.transaction_id || '')
                  .trim()
                  .toUpperCase()
              )
              .filter(Boolean)
          )
        )
      : [];

    if (primaryApiTxId && txList.length > 0 && !txList.includes(primaryApiTxId)) {
      return {
        resolved: false,
        reason: 'INVOICE_CORRELATION_MISMATCH',
        terminal: true,
        httpStatus: 409,
      };
    }

    let resolvedTxId = '';
    if (cleanExpectedTx) {
      if (primaryApiTxId && cleanExpectedTx !== primaryApiTxId) {
        return {
          resolved: false,
          reason: 'INVOICE_CORRELATION_MISMATCH',
          terminal: true,
          httpStatus: 409,
        };
      }
      if (txList.length > 0 && !txList.includes(cleanExpectedTx)) {
        return {
          resolved: false,
          reason: 'INVOICE_CORRELATION_MISMATCH',
          terminal: true,
          httpStatus: 409,
        };
      }
      if (primaryApiTxId === cleanExpectedTx || txList.includes(cleanExpectedTx)) {
        resolvedTxId = cleanExpectedTx;
      }
    } else if (primaryApiTxId) {
      resolvedTxId = primaryApiTxId;
    } else if (txList.length === 1) {
      resolvedTxId = txList[0];
    } else if (txList.length > 1) {
      return {
        resolved: false,
        reason: 'AMBIGUOUS_MULTI_TRANSACTION_INVOICE',
        retryable: true,
        httpStatus: 202,
      };
    }

    if (!resolvedTxId) {
      return {
        resolved: false,
        reason: 'MAYAR_API_MISSING_TRANSACTION_ID',
        retryable: true,
        httpStatus: 202,
      };
    }

    return {
      resolved: true,
      transactionId: resolvedTxId,
      transactionIdSource: 'mayar_api_v2_detail',
      mayarInvoiceId: returnedInvoiceId,
      mayarApiVersion: 'hl/v2',
      amount: Number(effectiveApiAmount),
      productId: apiProductId || null,
      customerEmail: String(apiData.customer?.email || apiData.customerEmail || '').trim(),
      customerName: String(apiData.customer?.name || apiData.customerName || '').trim(),
    };
  } catch (err) {
    const isTimeout =
      err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    return {
      resolved: false,
      reason: isTimeout ? 'MAYAR_API_TIMEOUT' : 'MAYAR_API_NETWORK_ERROR',
      retryable: true,
      httpStatus: isTimeout ? 504 : 502,
      error: err?.message || 'Network failure querying Mayar API V2',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Vercel Serverless Function: /api/mayar-webhook
 * Menerima webhook notifikasi transaksi dari Mayar.id secara real-time dengan pengamanan:
 * 1. Verifikasi Token Query (?token=) / Callback Token / HMAC-SHA256 (fail-closed di produksi atau saat secret aktif).
 * 2. Validasi status pembayaran (hanya paid/settled/completed/true yang mengaktifkan lisensi; pending/failed/false ditolak).
 * 3. Validasi nominal pembayaran, mata uang IDR, dan Product ID agar tidak dimanipulasi.
 * 4. Pemisahan webhookEventId, transactionId, & orderId serta idempotensi lintas serverless isolate.
 */

export function computeMayarHmacSignature(rawBody, secret) {
  const payloadStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
  return crypto.createHmac('sha256', String(secret)).update(payloadStr).digest('hex');
}

export function verifyMayarWebhookSignature(req, rawPayloadString, payloadObj) {
  const headers = req?.headers || {};
  const providedSig = String(
    headers['x-mayar-signature'] ||
      headers['X-Mayar-Signature'] ||
      headers['x-callback-token'] ||
      headers['X-Callback-Token'] ||
      ''
  ).trim();
  const authHeader = String(headers['authorization'] || headers['Authorization'] || '').trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  let queryToken = String(req?.query?.token || req?.query?.webhook_token || '').trim();
  if (!queryToken && typeof req?.url === 'string' && req.url.includes('?')) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      queryToken = String(
        parsed.searchParams.get('token') || parsed.searchParams.get('webhook_token') || ''
      ).trim();
    } catch {
      // ignore
    }
  }

  const primarySecret = String(
    process.env.MAYAR_WEBHOOK_SECRET || process.env.MAYAR_WEBHOOK_TOKEN || ''
  ).trim();
  const previousSecret = String(process.env.MAYAR_WEBHOOK_SECRET_PREVIOUS || '').trim();
  const secretCandidates = [
    ...(primarySecret ? [{ value: primarySecret, rotated: false }] : []),
    ...(previousSecret && previousSecret !== primarySecret
      ? [{ value: previousSecret, rotated: true }]
      : []),
  ];

  const isProd =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  // Di produksi tanpa secret, fail-closed
  if (isProd && secretCandidates.length === 0) {
    return {
      ok: false,
      status: 503,
      reason: 'WEBHOOK_SECRET_MISSING',
      message: 'MAYAR_WEBHOOK_SECRET wajib dikonfigurasi di environment produksi.',
    };
  }

  // Jika pemanggil mengirim token/signature eksplisit meskipun di dev tanpa secret, tolak signature palsu
  if (secretCandidates.length === 0) {
    if (queryToken || providedSig || bearerToken) {
      return {
        ok: false,
        status: 401,
        reason: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Tanda tangan webhook tidak valid atau belum terotorisasi.',
      };
    }
    return { ok: true, mode: 'dev-unconfigured', rotatedFromPreviousSecret: false };
  }

  if (!queryToken && !providedSig && !bearerToken) {
    return {
      ok: false,
      status: 401,
      reason: 'MISSING_WEBHOOK_SIGNATURE',
      message: 'Token atau tanda tangan webhook (query ?token= / x-callback-token / x-mayar-signature) tidak ditemukan.',
    };
  }

  for (const candidateSecret of secretCandidates) {
    // 1. Cek query parameter ?token= (sesuai pola URL Webhook resmi Mayar)
    if (queryToken && timingSafeEqualStrings(candidateSecret.value, queryToken)) {
      return {
        ok: true,
        mode: 'query-token',
        rotatedFromPreviousSecret: candidateSecret.rotated,
      };
    }

    const candidateToken = providedSig || bearerToken;
    // 2. Cek kecocokan exact callback token (x-callback-token / x-mayar-signature / Bearer)
    if (candidateToken && timingSafeEqualStrings(candidateSecret.value, candidateToken)) {
      return {
        ok: true,
        mode: 'callback-token',
        rotatedFromPreviousSecret: candidateSecret.rotated,
      };
    }

    // 3. Cek kecocokan HMAC-SHA256 hex (baik raw string maupun canonical JSON)
    if (candidateToken) {
      const normalizedHex = candidateToken.replace(/^sha256=/i, '').toLowerCase();
      const candidatesToSign = [];
      if (typeof rawPayloadString === 'string' && rawPayloadString.length > 0) {
        candidatesToSign.push(rawPayloadString);
      }
      if (payloadObj && typeof payloadObj === 'object') {
        candidatesToSign.push(JSON.stringify(payloadObj));
      }

      for (const bodyCandidate of candidatesToSign) {
        const expectedHmac = computeMayarHmacSignature(bodyCandidate, candidateSecret.value).toLowerCase();
        if (timingSafeEqualStrings(expectedHmac, normalizedHex)) {
          return {
            ok: true,
            mode: 'hmac-sha256',
            rotatedFromPreviousSecret: candidateSecret.rotated,
          };
        }
      }
    }
  }

  return {
    ok: false,
    status: 401,
    reason: 'INVALID_WEBHOOK_SIGNATURE',
    message: 'Verifikasi tanda tangan webhook Mayar gagal.',
  };
}

function getConfiguredMayarProductIds() {
  const individuProductId =
    process.env.MAYAR_PRODUCT_ID ||
    process.env.VITE_MAYAR_PRODUCT_ID ||
    'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';
  const schoolProductId =
    process.env.MAYAR_SCHOOL_PRODUCT_ID ||
    process.env.VITE_MAYAR_SCHOOL_PRODUCT_ID ||
    '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';
  return {
    individuProductId,
    schoolProductId,
    allowedProductIds: [individuProductId, schoolProductId],
  };
}

function resolvePlanMetadata({
  productId = '',
  productName = '',
  rawLicenseCode = '',
  serverOrder = null,
}) {
  const { individuProductId, schoolProductId } = getConfiguredMayarProductIds();
  const normalizedName = String(productName || '').trim().toLowerCase();
  const cleanLicenseUpper = String(rawLicenseCode || '').trim().toUpperCase();
  const licenseCodeIsSchool =
    cleanLicenseUpper.startsWith('ASM-SK26-') || cleanLicenseUpper.startsWith('ASM-SP26-');

  const isSchool =
    serverOrder?.planType === 'sekolah' ||
    serverOrder?.planType === 'sekolah_pro' ||
    normalizedName.includes('sekolah') ||
    normalizedName.includes('kolektif') ||
    productId === schoolProductId ||
    licenseCodeIsSchool;

  const isProAi =
    serverOrder?.planType === 'pro' ||
    serverOrder?.planType === 'sekolah_pro' ||
    (normalizedName.includes('pro') && !normalizedName.includes('guru mandiri')
      ? normalizedName.includes('ai') ||
        cleanLicenseUpper.startsWith('ASM-GP26-') ||
        cleanLicenseUpper.startsWith('ASM-SP26-')
      : cleanLicenseUpper.startsWith('ASM-GP26-') || cleanLicenseUpper.startsWith('ASM-SP26-'));

  const planType = isSchool
    ? isProAi
      ? 'sekolah_pro'
      : 'sekolah'
    : isProAi
    ? 'pro'
    : 'individu';
  const tier = isSchool
    ? isProAi
      ? 'sekolah_pro'
      : 'sekolah'
    : isProAi
    ? 'pro'
    : 'guru';
  const maxSeats = isSchool ? 25 : 2;
  let minExpectedAmount =
    planType === 'sekolah_pro'
      ? 1499000
      : planType === 'sekolah'
      ? 749000
      : planType === 'pro'
      ? 199000
      : 99000;
  if (serverOrder?.baseAmount) {
    minExpectedAmount = Math.max(minExpectedAmount, Number(serverOrder.baseAmount) || minExpectedAmount);
  }
  const resolvedPlanType =
    planType === 'pro' || planType === 'sekolah_pro' ? planType : isSchool ? 'sekolah' : 'individu';
  const resolvedPlanId =
    serverOrder?.planId ||
    (planType === 'sekolah_pro'
      ? 'sekolah_pro'
      : planType === 'sekolah'
      ? 'pro_sekolah'
      : planType === 'pro'
      ? 'pro_ai'
      : 'pro_individu');

  return {
    individuProductId,
    schoolProductId,
    licenseCodeIsSchool,
    isSchool,
    planType,
    tier,
    maxSeats,
    minExpectedAmount,
    resolvedPlanType,
    resolvedPlanId,
  };
}

function isEventCommitted(eventRecord) {
  if (!eventRecord || typeof eventRecord !== 'object') return false;
  return (
    eventRecord.idempotencyStatus === 'committed' ||
    (eventRecord.status === 'paid' && eventRecord.consistencyState === 'committed')
  );
}

async function persistWebhookEventLifecycle({
  webhookEventId = '',
  event = '',
  orderId = '',
  mayarInvoiceId = '',
  transactionId = '',
  transactionIdSource = 'none',
  idempotencyStatus = 'pending_reconciliation',
  reason = '',
  message = '',
  httpStatus = 202,
  retryable = false,
  enqueueReconcile = false,
  source = 'webhook',
  verifiedBy = 'webhook',
  serverOrder = null,
  planType = 'individu',
  tier = 'guru',
  minExpectedAmount = 99000,
  productId = '',
  rawLicenseCode = '',
  customerName = '',
  customerEmail = '',
  expiresAt = null,
  txDeviceId = '',
} = {}) {
  const nowIso = new Date().toISOString();
  const cleanOrderId = String(orderId || serverOrder?.orderId || serverOrder?.invoiceId || '')
    .trim()
    .toUpperCase();
  const cleanMayarInvId = String(mayarInvoiceId || serverOrder?.mayarInvoiceId || '')
    .trim()
    .toUpperCase();

  if (webhookEventId) {
    const existingEvent = await getWebhookEventRecord(webhookEventId);
    if (!isEventCommitted(existingEvent)) {
      await saveWebhookEventRecord(webhookEventId, {
        ...(existingEvent || {}),
        webhookEventId,
        event: event || existingEvent?.event || 'payment.received',
        orderId: cleanOrderId || existingEvent?.orderId || null,
        mayarInvoiceId: cleanMayarInvId || existingEvent?.mayarInvoiceId || null,
        transactionId: transactionId || existingEvent?.transactionId || null,
        transactionIdSource: transactionIdSource || existingEvent?.transactionIdSource || 'none',
        status: idempotencyStatus === 'terminal_rejected' ? 'rejected' : 'pending_payment',
        idempotencyStatus,
        consistencyState: idempotencyStatus,
        reason,
        message,
        httpStatus,
        retryable: Boolean(retryable),
        verifiedBy,
        attemptCount: (Number(existingEvent?.attemptCount) || 0) + 1,
        updatedAt: nowIso,
      });
    }
  }

  if (enqueueReconcile) {
    if (cleanOrderId && (!serverOrder || serverOrder.status === 'pending_payment')) {
      await savePaymentOrderRecord(cleanOrderId, {
        ...(serverOrder || {}),
        orderId: serverOrder?.orderId || cleanOrderId,
        invoiceId: serverOrder?.invoiceId || cleanOrderId,
        ...(cleanMayarInvId ? { mayarInvoiceId: cleanMayarInvId } : {}),
        status: 'pending_payment',
        idempotencyStatus: 'pending_reconciliation',
        pendingReason: reason || 'PENDING_RECONCILIATION',
        lastWebhookEventId: webhookEventId || serverOrder?.lastWebhookEventId || null,
        updatedAt: nowIso,
      });
    }

    if (cleanMayarInvId && cleanOrderId) {
      await saveMayarInvoiceIndex(cleanMayarInvId, cleanOrderId, serverOrder?.licenseCode || '');
    }

    const jobKey = cleanOrderId || cleanMayarInvId || webhookEventId;
    if (jobKey) {
      await enqueueReconcileJob({
        jobKey,
        webhookEventId: webhookEventId || null,
        event: event || 'payment.received',
        orderId: cleanOrderId || null,
        mayarInvoiceId: cleanMayarInvId || null,
        rawLicenseCode: rawLicenseCode || null,
        productId: productId || null,
        planType,
        tier,
        minExpectedAmount,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        expiresAt: expiresAt || null,
        txDeviceId: txDeviceId || null,
        reason: reason || 'PENDING_RECONCILIATION',
        lastError: message || '',
        httpStatus,
        verifiedBy,
        idempotencyStatus: 'pending_reconciliation',
        lastAttemptAt: nowIso,
      });
    }
  }

  await appendSanitizedWebhookAudit({
    webhookEventId: webhookEventId || null,
    orderId: cleanOrderId || null,
    mayarInvoiceId: cleanMayarInvId || null,
    transactionId: transactionId || null,
    outcome: enqueueReconcile ? 'pending_reconciliation' : idempotencyStatus,
    idempotencyStatus,
    reason,
    httpStatus,
    source,
  });
}

async function commitAuthorizedSettlement({
  event = 'payment.received',
  webhookEventId = '',
  transactionId = '',
  transactionIdSource = 'explicit_transaction_id',
  hasDistinctEventAndTransactionId = false,
  effectiveInvoiceId = '',
  authoritativeMayarInvoiceId = '',
  cleanCode = '',
  planType = 'individu',
  tier = 'guru',
  resolvedPlanType = 'individu',
  resolvedPlanId = 'pro_individu',
  maxSeats = 2,
  minExpectedAmount = 99000,
  resolvedAmount = 99000,
  productId = '',
  txDeviceId = '',
  customerName = '',
  customerEmail = '',
  buyerLabel = 'Pembelian Mayar.id',
  expiresAt = null,
  verifiedBy = 'webhook',
  serverOrder = null,
  isRenewal = false,
  auditSource = 'webhook',
}) {
  if (await isLicenseRevokedInRedis(cleanCode)) {
    await persistWebhookEventLifecycle({
      webhookEventId,
      event,
      orderId: effectiveInvoiceId,
      mayarInvoiceId: authoritativeMayarInvoiceId,
      transactionId,
      transactionIdSource,
      idempotencyStatus: 'terminal_rejected',
      reason: 'LICENSE_REVOKED',
      message: `Lisensi ${cleanCode} telah dicabut permanen dan tidak dapat diaktifkan via webhook.`,
      httpStatus: 403,
      source: auditSource,
      verifiedBy,
      serverOrder,
    });
    return {
      httpStatus: 403,
      body: {
        ok: false,
        activated: false,
        revoked: true,
        idempotencyStatus: 'terminal_rejected',
        reason: 'LICENSE_REVOKED',
        message: `Lisensi ${cleanCode} telah dicabut permanen dan tidak dapat diaktifkan via webhook.`,
      },
    };
  }

  const lockTargets = [
    transactionId ? `tx:${transactionId}` : '',
    webhookEventId ? `event:${webhookEventId}` : '',
    effectiveInvoiceId ? `order:${effectiveInvoiceId}` : '',
    authoritativeMayarInvoiceId ? `mayar_inv:${authoritativeMayarInvoiceId}` : '',
    `seat:${cleanCode}`,
  ].filter(Boolean);

  return await withTransactionLock(lockTargets, async (lockCtx) => {
    const primaryLockKey = lockCtx.primaryLockKey || lockCtx.lockKeys?.[0] || 'asesmerdeka:noop:lock';
    const ownerToken = lockCtx.ownerToken || '';
    const fenceToken = Number(lockCtx.fenceToken) || 0;

    // 4A. Cek Idempotency / Replay & Binding Protection berbasis webhookEventId
    let existingEvent = null;
    if (webhookEventId) {
      existingEvent = await getWebhookEventRecord(webhookEventId);
      if (isEventCommitted(existingEvent)) {
        const existingEvOrderId = String(existingEvent.orderId || existingEvent.invoiceId || '')
          .trim()
          .toUpperCase();
        const existingEvTxId = String(existingEvent.transactionId || '').trim().toUpperCase();
        if (
          (cleanCode && existingEvent.licenseCode && existingEvent.licenseCode !== cleanCode) ||
          (effectiveInvoiceId && existingEvOrderId && existingEvOrderId !== effectiveInvoiceId) ||
          (transactionId && existingEvTxId && existingEvTxId !== transactionId)
        ) {
          return {
            httpStatus: 409,
            body: {
              ok: false,
              transactionAlreadyBound: true,
              reason: 'TRANSACTION_ALREADY_BOUND',
              message: `Event webhook ${webhookEventId} sudah terikat pada pesanan/transaksi/lisensi lain dan tidak dapat digunakan ulang.`,
            },
          };
        }
      }
    }

    // 4B. Cek Idempotency / Replay & Binding Protection berbasis transactionId
    const existingTx = await getWebhookTransactionRecord(transactionId);
    if (existingTx) {
      const existingTxOrderId = String(existingTx.orderId || existingTx.invoiceId || '')
        .trim()
        .toUpperCase();
      if (
        (cleanCode && existingTx.licenseCode && existingTx.licenseCode !== cleanCode) ||
        (effectiveInvoiceId && existingTxOrderId && existingTxOrderId !== effectiveInvoiceId)
      ) {
        return {
          httpStatus: 409,
          body: {
            ok: false,
            transactionAlreadyBound: true,
            reason: 'TRANSACTION_ALREADY_BOUND',
            message: `ID transaksi ${transactionId} sudah terikat pada pesanan/lisensi lain dan tidak dapat digunakan ulang.`,
          },
        };
      }
    }

    const freshOrder = effectiveInvoiceId ? await getPaymentOrderRecord(effectiveInvoiceId) : null;
    if (freshOrder?.transactionId && String(freshOrder.transactionId).trim().toUpperCase() !== transactionId) {
      return {
        httpStatus: 409,
        body: {
          ok: false,
          transactionAlreadyBound: true,
          reason: 'TRANSACTION_ALREADY_BOUND',
          message: `Pesanan ${effectiveInvoiceId} sudah terikat pada transaksi ${freshOrder.transactionId}.`,
        },
      };
    }
    if (
      freshOrder?.mayarInvoiceId &&
      authoritativeMayarInvoiceId &&
      String(freshOrder.mayarInvoiceId).trim().toUpperCase() !== authoritativeMayarInvoiceId
    ) {
      return {
        httpStatus: 409,
        body: {
          ok: false,
          reason: 'INVOICE_CORRELATION_MISMATCH',
          message: `Pesanan ${effectiveInvoiceId} sudah terikat pada invoice Mayar ${freshOrder.mayarInvoiceId}.`,
        },
      };
    }
    if (freshOrder?.fenceToken && fenceToken > 0 && Number(freshOrder.fenceToken) > fenceToken) {
      throw new FencedWriteConflictError();
    }

    const existingSeatRecord = await getSeatRecordFromRedis(cleanCode);
    if (existingSeatRecord?.fenceToken && fenceToken > 0 && Number(existingSeatRecord.fenceToken) > fenceToken) {
      throw new FencedWriteConflictError();
    }

    const txFullyCommitted = Boolean(
      existingTx &&
        existingTx.status === 'paid' &&
        existingTx.consistencyState === 'committed' &&
        existingSeatRecord &&
        (!effectiveInvoiceId || (freshOrder && freshOrder.status === 'paid' && freshOrder.consistencyState === 'committed'))
    );

    if (isEventCommitted(existingEvent) && txFullyCommitted) {
      await removeReconcileJob(effectiveInvoiceId || authoritativeMayarInvoiceId || webhookEventId);
      return {
        httpStatus: 200,
        body: {
          ok: true,
          idempotentReplay: true,
          idempotencyStatus: 'committed',
          replayType: 'webhook_event',
          webhookEventId: webhookEventId || null,
          transactionId: existingEvent.transactionId || transactionId || null,
          orderId: existingEvent.orderId || effectiveInvoiceId || null,
          mayarInvoiceId: authoritativeMayarInvoiceId || existingEvent.mayarInvoiceId || null,
          message: `Event webhook ${webhookEventId} sudah pernah diproses sebelumnya (idempotent replay aman).`,
          code: existingEvent.licenseCode || cleanCode,
          planType,
          maxSeats,
        },
      };
    }

    if (txFullyCommitted && existingTx) {
      const existingTxOrderId = String(existingTx.orderId || existingTx.invoiceId || '')
        .trim()
        .toUpperCase();
      if (webhookEventId) {
        await saveWebhookEventRecord(
          webhookEventId,
          {
            webhookEventId,
            event,
            transactionId,
            transactionIdSource,
            orderId: effectiveInvoiceId || existingTxOrderId || null,
            mayarInvoiceId: authoritativeMayarInvoiceId || freshOrder?.mayarInvoiceId || null,
            licenseCode: existingTx.licenseCode || cleanCode,
            status: 'paid',
            idempotencyStatus: 'committed',
            consistencyState: 'committed',
            fenceToken,
            verifiedBy,
            processedAt: existingTx.processedAt || new Date().toISOString(),
          },
          {
            lockKey: primaryLockKey,
            ownerToken,
            expectedFenceToken: fenceToken,
          }
        );
      }
      await removeReconcileJob(effectiveInvoiceId || existingTxOrderId || authoritativeMayarInvoiceId || webhookEventId);
      return {
        httpStatus: 200,
        body: {
          ok: true,
          idempotentReplay: true,
          idempotencyStatus: 'committed',
          replayType: 'transaction',
          webhookEventId: webhookEventId || null,
          transactionId,
          orderId: effectiveInvoiceId || existingTxOrderId || null,
          mayarInvoiceId: authoritativeMayarInvoiceId || freshOrder?.mayarInvoiceId || null,
          message: `Webhook transaksi ${transactionId} untuk ${cleanCode} sudah pernah diproses sebelumnya (idempotent replay aman).`,
          code: existingTx.licenseCode || cleanCode,
          planType,
          maxSeats,
        },
      };
    }

    if (event === 'license.renewed' || isRenewal) {
      if (!existingSeatRecord && !verifyInternalSerialOrDeviceCode(cleanCode)) {
        return {
          httpStatus: 400,
          body: {
            ok: false,
            activated: false,
            idempotencyStatus: 'terminal_rejected',
            reason: 'INVALID_RENEWAL_TARGET',
            message: `Target perpanjangan lisensi ${cleanCode} tidak ditemukan atau tidak sah.`,
          },
        };
      }
    }

    const nowIso = new Date().toISOString();
    const preservedDevices = Array.isArray(existingSeatRecord?.devices)
      ? existingSeatRecord.devices
      : [];
    const preservedTeacherSeats = existingSeatRecord?.teacherSeats;
    const lifecycleState = preservedDevices.length > 0 ? 'active' : 'paid';
    const effectiveMaxSeats = existingSeatRecord?.maxSeats || maxSeats;

    const txRecordPayload = {
      transactionId,
      transactionIdSource,
      webhookEventId: webhookEventId || existingTx?.webhookEventId || null,
      orderId: effectiveInvoiceId || null,
      invoiceId: effectiveInvoiceId || null,
      mayarInvoiceId: authoritativeMayarInvoiceId || freshOrder?.mayarInvoiceId || null,
      licenseCode: cleanCode,
      planId: resolvedPlanId,
      planType,
      processedAt: existingTx?.processedAt || nowIso,
      amount: resolvedAmount,
      productId: productId || null,
      deviceId: txDeviceId || null,
      customerEmail: customerEmail || freshOrder?.buyerEmail || serverOrder?.buyerEmail || null,
      customerName: customerName || freshOrder?.buyerName || serverOrder?.buyerName || null,
      currency: 'IDR',
      status: 'paid',
      consistencyState: 'committed',
      fenceToken,
      verifiedBy,
    };

    const eventRecordPayload = webhookEventId
      ? {
          webhookEventId,
          event,
          transactionId,
          transactionIdSource,
          orderId: effectiveInvoiceId || null,
          mayarInvoiceId: authoritativeMayarInvoiceId || freshOrder?.mayarInvoiceId || null,
          licenseCode: cleanCode,
          status: 'paid',
          idempotencyStatus: 'committed',
          consistencyState: 'committed',
          fenceToken,
          verifiedBy,
          processedAt: nowIso,
        }
      : null;

    const orderRecordPayload = effectiveInvoiceId
      ? {
          ...(freshOrder || serverOrder || {}),
          orderId: effectiveInvoiceId,
          invoiceId: effectiveInvoiceId,
          mayarInvoiceId: authoritativeMayarInvoiceId || freshOrder?.mayarInvoiceId || serverOrder?.mayarInvoiceId || null,
          planId: resolvedPlanId,
          planType: freshOrder?.planType || serverOrder?.planType || planType,
          tier: freshOrder?.tier || serverOrder?.tier || tier,
          baseAmount: freshOrder?.baseAmount || serverOrder?.baseAmount || minExpectedAmount,
          paidAmount: resolvedAmount,
          amount: resolvedAmount,
          status: 'paid',
          idempotencyStatus: 'committed',
          consistencyState: 'committed',
          pendingReason: null,
          fenceToken,
          paidAt: freshOrder?.paidAt || serverOrder?.paidAt || nowIso,
          transactionId,
          webhookEventId: webhookEventId || freshOrder?.webhookEventId || serverOrder?.webhookEventId || null,
          licenseCode: cleanCode,
          deviceId: txDeviceId || freshOrder?.deviceId || serverOrder?.deviceId || null,
          buyerEmail: customerEmail || freshOrder?.buyerEmail || serverOrder?.buyerEmail || null,
          buyerName: customerName || freshOrder?.buyerName || serverOrder?.buyerName || null,
          verifiedBy,
          updatedAt: nowIso,
        }
      : null;

    const { configured: redisConfigured } = getRedisCredentials();
    if (redisConfigured) {
      const seatPatch = {
        licenseCode: cleanCode,
        planType,
        tier,
        maxSeats: effectiveMaxSeats,
        hasExpiresAt: Boolean(expiresAt),
        expiresAt: expiresAt || null,
        transactionId,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        updatedAt: nowIso,
        buyerName: customerName || existingSeatRecord?.buyerName || null,
        buyerEmail: customerEmail || existingSeatRecord?.buyerEmail || null,
      };
      const adminPatch = {
        code: cleanCode,
        updatedAt: nowIso,
        label: buyerLabel,
        planType: resolvedPlanType,
        tier,
        hasExpiresAt: Boolean(expiresAt),
        expiresAt: expiresAt || null,
        transactionId,
        newEntry: {
          code: cleanCode,
          label: buyerLabel,
          planType: resolvedPlanType,
          tier,
          maxSeats: effectiveMaxSeats,
          createdAt: nowIso,
          updatedAt: nowIso,
          usedSeats: preservedTeacherSeats
            ? Object.values(preservedTeacherSeats).filter((t) => t && t.status === 'active').length
            : preservedDevices.length,
          devices: preservedDevices,
          ...(preservedTeacherSeats ? { teacherSeats: preservedTeacherSeats } : {}),
          status: preservedDevices.length > 0 ? 'aktif' : 'belum_aktif',
          lifecycleState,
          ...(expiresAt ? { expiresAt } : {}),
          transactionId,
        },
      };

      const commitRes = await evalRedisScript(
        LUA_COMMIT_WEBHOOK_SETTLEMENT_SCRIPT,
        [
          primaryLockKey,
          buildWebhookTxKey(transactionId),
          webhookEventId ? buildWebhookEventKey(webhookEventId) : 'asesmerdeka:noop:event',
          effectiveInvoiceId ? buildPaymentOrderKey(effectiveInvoiceId) : 'asesmerdeka:noop:order',
          buildSeatRedisKey(cleanCode),
          REGISTRY_REDIS_KEY,
        ],
        [
          ownerToken,
          String(fenceToken),
          webhookEventId ? '1' : '0',
          effectiveInvoiceId ? '1' : '0',
          cleanCode,
          transactionId,
          effectiveInvoiceId,
          JSON.stringify(txRecordPayload),
          eventRecordPayload ? JSON.stringify(eventRecordPayload) : '{}',
          orderRecordPayload ? JSON.stringify(orderRecordPayload) : '{}',
          JSON.stringify(seatPatch),
          JSON.stringify(adminPatch),
        ]
      );

      const commitArr = Array.isArray(commitRes.result) ? commitRes.result : [];
      const commitStatus = commitArr[0];
      if (commitStatus === 'LOCK_LOST' || commitStatus === 'STALE_FENCE') {
        throw new FencedWriteConflictError();
      }
      if (commitStatus === 'TRANSACTION_ALREADY_BOUND') {
        return {
          httpStatus: 409,
          body: {
            ok: false,
            transactionAlreadyBound: true,
            reason: 'TRANSACTION_ALREADY_BOUND',
            message: `Transaksi ${transactionId} atau event ${webhookEventId || '-'} sudah terikat pada pesanan/lisensi lain.`,
          },
        };
      }
      if (commitStatus === 'IDEMPOTENT') {
        await removeReconcileJob(effectiveInvoiceId || authoritativeMayarInvoiceId || webhookEventId);
        return {
          httpStatus: 200,
          body: {
            ok: true,
            idempotentReplay: true,
            idempotencyStatus: 'committed',
            replayType: commitArr[1] || 'transaction',
            webhookEventId: webhookEventId || null,
            transactionId,
            orderId: effectiveInvoiceId || null,
            mayarInvoiceId: authoritativeMayarInvoiceId || null,
            message: `Webhook transaksi ${transactionId} untuk ${cleanCode} sudah pernah diproses sebelumnya (idempotent replay aman).`,
            code: cleanCode,
            planType,
            maxSeats,
          },
        };
      }

      if (authoritativeMayarInvoiceId && effectiveInvoiceId) {
        await saveMayarInvoiceIndex(authoritativeMayarInvoiceId, effectiveInvoiceId, cleanCode);
      }
      await removeReconcileJob(effectiveInvoiceId || authoritativeMayarInvoiceId || webhookEventId);
      await appendSanitizedWebhookAudit({
        webhookEventId: webhookEventId || null,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        transactionId,
        outcome: 'committed',
        idempotencyStatus: 'committed',
        reason: 'SETTLEMENT_COMMITTED',
        httpStatus: 200,
        source: auditSource,
      });

      return {
        httpStatus: 200,
        body: {
          ok: true,
          activated: true,
          idempotencyStatus: 'committed',
          recoveredFromPartialState: Boolean(existingTx && existingTx.consistencyState !== 'committed'),
          webhookEventId: webhookEventId || null,
          transactionId,
          orderId: effectiveInvoiceId || null,
          mayarInvoiceId: authoritativeMayarInvoiceId || null,
          transactionIdSource,
          hasDistinctEventAndTransactionId,
          lifecycleState: commitArr[1] || lifecycleState,
          fenceToken,
          message: `Lisensi ${cleanCode} untuk ${buyerLabel} berhasil didaftarkan ke Portal Admin secara atomik.`,
          code: cleanCode,
          planType,
          maxSeats,
        },
      };
    }

    // Jalur dev/test lokal tanpa Redis (fenced + serial + idempotent recovery)
    await saveWebhookTransactionRecord(
      transactionId,
      { ...txRecordPayload, consistencyState: 'settling' },
      { lockKey: primaryLockKey, ownerToken, expectedFenceToken: fenceToken }
    );
    await autoRegisterLicenseInAdminRegistry({
      code: cleanCode,
      maxSeats: effectiveMaxSeats,
      label: buyerLabel,
      planType: resolvedPlanType,
      tier,
      ...(preservedTeacherSeats ? { teacherSeats: preservedTeacherSeats } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      transactionId,
    });
    await saveSeatRecordToRedis(
      cleanCode,
      {
        ...(existingSeatRecord || {}),
        licenseCode: cleanCode,
        planType,
        tier,
        maxSeats: effectiveMaxSeats,
        devices: preservedDevices,
        ...(preservedTeacherSeats ? { teacherSeats: preservedTeacherSeats } : {}),
        lifecycleState,
        consistencyState: 'committed',
        seatRevision: (Number(existingSeatRecord?.seatRevision) || 0) + 1,
        fenceToken,
        ...(expiresAt ? { expiresAt } : {}),
        transactionId,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        updatedAt: nowIso,
        buyerName: customerName || existingSeatRecord?.buyerName || null,
        buyerEmail: customerEmail || existingSeatRecord?.buyerEmail || null,
      },
      { lockKey: primaryLockKey, ownerToken, expectedFenceToken: fenceToken }
    );
    if (orderRecordPayload) {
      await savePaymentOrderRecord(effectiveInvoiceId, orderRecordPayload, {
        lockKey: primaryLockKey,
        ownerToken,
        expectedFenceToken: fenceToken,
      });
    }
    if (eventRecordPayload) {
      await saveWebhookEventRecord(webhookEventId, eventRecordPayload, {
        lockKey: primaryLockKey,
        ownerToken,
        expectedFenceToken: fenceToken,
      });
    }
    await saveWebhookTransactionRecord(transactionId, txRecordPayload, {
      lockKey: primaryLockKey,
      ownerToken,
      expectedFenceToken: fenceToken,
    });
    if (authoritativeMayarInvoiceId && effectiveInvoiceId) {
      await saveMayarInvoiceIndex(authoritativeMayarInvoiceId, effectiveInvoiceId, cleanCode);
    }
    await removeReconcileJob(effectiveInvoiceId || authoritativeMayarInvoiceId || webhookEventId);
    await appendSanitizedWebhookAudit({
      webhookEventId: webhookEventId || null,
      orderId: effectiveInvoiceId || null,
      mayarInvoiceId: authoritativeMayarInvoiceId || null,
      transactionId,
      outcome: 'committed',
      idempotencyStatus: 'committed',
      reason: 'SETTLEMENT_COMMITTED',
      httpStatus: 200,
      source: auditSource,
    });

    return {
      httpStatus: 200,
      body: {
        ok: true,
        activated: true,
        idempotencyStatus: 'committed',
        recoveredFromPartialState: Boolean(existingTx && existingTx.consistencyState !== 'committed'),
        webhookEventId: webhookEventId || null,
        transactionId,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        transactionIdSource,
        hasDistinctEventAndTransactionId,
        lifecycleState,
        fenceToken,
        message: `Lisensi ${cleanCode} untuk ${buyerLabel} berhasil didaftarkan ke Portal Admin.`,
        code: cleanCode,
        planType,
        maxSeats,
      },
    };
  });
}

export async function reconcilePendingWebhooks({
  orderId = '',
  mayarInvoiceId = '',
  webhookEventId = '',
  limit = 20,
} = {}) {
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 20));
  const queue = await getReconcileQueueRecords();
  const filterOrderId = String(orderId || '').trim().toUpperCase();
  const filterMayarInvoiceId = String(mayarInvoiceId || '').trim().toUpperCase();
  const filterEventId = String(webhookEventId || '').trim().toUpperCase();

  const targets = queue
    .filter((job) => {
      if (!job) return false;
      if (filterOrderId && String(job.orderId || '').trim().toUpperCase() !== filterOrderId) return false;
      if (filterMayarInvoiceId && String(job.mayarInvoiceId || '').trim().toUpperCase() !== filterMayarInvoiceId) {
        return false;
      }
      if (filterEventId && String(job.webhookEventId || '').trim().toUpperCase() !== filterEventId) {
        return false;
      }
      return true;
    })
    .slice(0, safeLimit);

  const { allowedProductIds } = getConfiguredMayarProductIds();
  const results = [];
  let committedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const job of targets) {
    let jobOrderId = String(job.orderId || '').trim().toUpperCase();
    const jobEventId = String(job.webhookEventId || job.eventId || '').trim().toUpperCase();
    let jobMayarInvoiceId = String(job.mayarInvoiceId || '').trim().toUpperCase();
    const jobRawLicenseCode = String(job.rawLicenseCode || job.licenseCode || '').trim();
    const jobEventName = String(job.event || job.payloadEvent || 'payment.received').trim().toLowerCase();
    const jobDeviceId = String(job.txDeviceId || job.deviceId || '').trim().toUpperCase();

    if (!jobOrderId && jobMayarInvoiceId) {
      jobOrderId = await getOrderIdByMayarInvoiceId(jobMayarInvoiceId);
    }

    const serverOrder = jobOrderId ? await getPaymentOrderRecord(jobOrderId) : null;
    if (serverOrder?.mayarInvoiceId) {
      if (jobMayarInvoiceId && String(serverOrder.mayarInvoiceId).trim().toUpperCase() !== jobMayarInvoiceId) {
        await persistWebhookEventLifecycle({
          webhookEventId: jobEventId,
          event: job.event || 'payment.received',
          orderId: jobOrderId,
          mayarInvoiceId: jobMayarInvoiceId,
          idempotencyStatus: 'terminal_rejected',
          reason: 'INVOICE_CORRELATION_MISMATCH',
          message: `Konflik mayarInvoiceId saat rekonsiliasi untuk ${jobOrderId}.`,
          httpStatus: 409,
          source: 'reconcile_worker',
          serverOrder,
        });
        await removeReconcileJob(job.jobKey || jobOrderId || jobEventId);
        rejectedCount += 1;
        results.push({ jobKey: job.jobKey, outcome: 'terminal_rejected', reason: 'INVOICE_CORRELATION_MISMATCH' });
        continue;
      }
      jobMayarInvoiceId = String(serverOrder.mayarInvoiceId).trim().toUpperCase();
    }

    if (serverOrder?.status === 'paid' && serverOrder?.consistencyState === 'committed') {
      await removeReconcileJob(job.jobKey || jobOrderId || jobMayarInvoiceId || jobEventId);
      results.push({ jobKey: job.jobKey, outcome: 'already_committed', orderId: jobOrderId });
      continue;
    }

    const existingEvent = jobEventId ? await getWebhookEventRecord(jobEventId) : null;
    if (existingEvent?.idempotencyStatus === 'terminal_rejected') {
      await removeReconcileJob(job.jobKey || jobOrderId || jobEventId);
      rejectedCount += 1;
      results.push({ jobKey: job.jobKey, outcome: 'terminal_rejected', reason: existingEvent.reason });
      continue;
    }

    const planMeta = resolvePlanMetadata({
      productId: job.productId || '',
      rawLicenseCode: jobRawLicenseCode || serverOrder?.licenseCode || '',
      serverOrder: serverOrder || {
        planType: job.planType,
        baseAmount: job.minExpectedAmount,
      },
    });

    if (jobEventName === 'payment.reminder' || jobEventName === 'invoice.reminder') {
      await removeReconcileJob(job.jobKey || jobOrderId || jobMayarInvoiceId || jobEventId);
      results.push({ jobKey: job.jobKey, outcome: 'skipped_reminder' });
      continue;
    }

    // Authoritative invoice UUID ONLY (never webhookEventId)
    const apiCorrelation = await correlateMayarTransactionViaApi({
      mayarInvoiceId: jobMayarInvoiceId,
      expectedAmount: planMeta.minExpectedAmount,
      expectedTransactionId: job.transactionId || '',
      allowedProductIds,
    });

    if (!apiCorrelation.resolved || !apiCorrelation.transactionId) {
      const isTerminal = Boolean(apiCorrelation.terminal) || apiCorrelation.retryable === false;
      if (isTerminal) {
        await persistWebhookEventLifecycle({
          webhookEventId: jobEventId,
          event: job.event || 'payment.received',
          orderId: jobOrderId,
          mayarInvoiceId: jobMayarInvoiceId,
          idempotencyStatus: 'terminal_rejected',
          reason: apiCorrelation.reason || 'RECONCILE_TERMINAL_REJECTED',
          message: `Rekonsiliasi ditolak permanen (${apiCorrelation.reason || 'TERMINAL_ERROR'}).`,
          httpStatus: apiCorrelation.httpStatus || 400,
          enqueueReconcile: false,
          source: 'reconcile_worker',
          serverOrder,
        });
        if (jobOrderId && (!serverOrder || serverOrder.status !== 'paid')) {
          await savePaymentOrderRecord(jobOrderId, {
            ...(serverOrder || {}),
            orderId: jobOrderId,
            invoiceId: jobOrderId,
            status: 'payment_failed',
            idempotencyStatus: 'terminal_rejected',
            pendingReason: apiCorrelation.reason || 'RECONCILE_TERMINAL_REJECTED',
            updatedAt: new Date().toISOString(),
          });
        }
        await removeReconcileJob(job.jobKey || jobOrderId || jobMayarInvoiceId || jobEventId);
        rejectedCount += 1;
        results.push({
          jobKey: job.jobKey,
          orderId: jobOrderId || null,
          outcome: 'terminal_rejected',
          reason: apiCorrelation.reason,
        });
      } else {
        await persistWebhookEventLifecycle({
          webhookEventId: jobEventId,
          event: job.event || 'payment.received',
          orderId: jobOrderId,
          mayarInvoiceId: jobMayarInvoiceId,
          idempotencyStatus: 'pending_reconciliation',
          reason: apiCorrelation.reason || 'PENDING_RECONCILIATION',
          message: `Rekonsiliasi ditunda (${apiCorrelation.reason || 'RETRYABLE'}).`,
          httpStatus: apiCorrelation.httpStatus || 202,
          retryable: true,
          enqueueReconcile: true,
          source: 'reconcile_worker',
          serverOrder,
          planType: planMeta.planType,
          tier: planMeta.tier,
          minExpectedAmount: planMeta.minExpectedAmount,
          productId: job.productId || '',
          rawLicenseCode: jobRawLicenseCode,
          customerName: job.customerName || '',
          customerEmail: job.customerEmail || '',
          expiresAt: job.expiresAt || null,
          txDeviceId: jobDeviceId,
        });
        pendingCount += 1;
        results.push({
          jobKey: job.jobKey,
          orderId: jobOrderId || null,
          outcome: 'pending_reconciliation',
          reason: apiCorrelation.reason,
        });
      }
      continue;
    }

    const effectiveInvoiceId = jobOrderId || serverOrder?.invoiceId || serverOrder?.orderId || '';
    const customerName = String(job.customerName || apiCorrelation.customerName || '').trim();
    const customerEmail = String(job.customerEmail || apiCorrelation.customerEmail || '').trim();
    const buyerLabel = customerName
      ? `Mayar: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}`
      : customerEmail
      ? `Mayar: ${customerEmail}`
      : 'Pembelian Mayar.id';
    const cleanCode =
      normalizeLicenseCode(jobRawLicenseCode) ||
      normalizeLicenseCode(serverOrder?.licenseCode || '') ||
      (effectiveInvoiceId ? generateOrderLicenseCodeServer(planMeta.planType, effectiveInvoiceId) : '');

    if (!cleanCode) {
      pendingCount += 1;
      results.push({ jobKey: job.jobKey, outcome: 'skipped_no_license_code' });
      continue;
    }

    const commitRes = await commitAuthorizedSettlement({
      event: jobEventName,
      webhookEventId: jobEventId,
      transactionId: apiCorrelation.transactionId,
      transactionIdSource: apiCorrelation.transactionIdSource || 'mayar_api_detail',
      hasDistinctEventAndTransactionId: Boolean(
        jobEventId && apiCorrelation.transactionId && jobEventId !== apiCorrelation.transactionId
      ),
      effectiveInvoiceId,
      authoritativeMayarInvoiceId: apiCorrelation.mayarInvoiceId || jobMayarInvoiceId,
      cleanCode,
      planType: planMeta.planType,
      tier: planMeta.tier,
      resolvedPlanType: planMeta.resolvedPlanType,
      resolvedPlanId: planMeta.resolvedPlanId,
      maxSeats: planMeta.maxSeats,
      minExpectedAmount: planMeta.minExpectedAmount,
      resolvedAmount:
        apiCorrelation.amount !== undefined ? Number(apiCorrelation.amount) : planMeta.minExpectedAmount,
      productId: apiCorrelation.productId || job.productId || '',
      txDeviceId: jobDeviceId || serverOrder?.deviceId || '',
      customerName,
      customerEmail,
      buyerLabel,
      expiresAt: job.expiresAt || null,
      verifiedBy: `${job.verifiedBy || 'webhook'}+reconcile`,
      serverOrder,
      auditSource: 'reconcile_worker',
    });

    if (commitRes.httpStatus === 200) {
      committedCount += 1;
      results.push({
        jobKey: job.jobKey,
        orderId: effectiveInvoiceId || null,
        transactionId: apiCorrelation.transactionId,
        outcome: commitRes.body?.idempotentReplay ? 'already_committed' : 'committed',
      });
    } else {
      rejectedCount += 1;
      results.push({
        jobKey: job.jobKey,
        orderId: effectiveInvoiceId || null,
        outcome: 'terminal_rejected',
        reason: commitRes.body?.reason || 'COMMIT_REJECTED',
      });
    }
  }

  return {
    ok: true,
    processed: targets.length,
    committedCount,
    pendingCount,
    rejectedCount,
    results,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-mayar-signature, x-callback-token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'AsesMerdeka Mayar Webhook Listener',
      status: 'active',
      hint: 'Pasang URL endpoint ini di Dashboard Mayar > Integrasi / Webhook beserta MAYAR_WEBHOOK_SECRET.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const contentTypeHeader = String(
      req.headers?.['content-type'] || req.headers?.['Content-Type'] || ''
    ).trim();
    if (contentTypeHeader && !contentTypeHeader.toLowerCase().includes('application/json')) {
      return res.status(415).json({
        ok: false,
        reason: 'INVALID_CONTENT_TYPE',
        message: 'Content-Type webhook Mayar harus application/json.',
      });
    }

    const rawBodyString = typeof req.body === 'string' ? req.body : '';
    const payload = rawBodyString ? JSON.parse(rawBodyString) : req.body || {};

    // 1. Verifikasi Tanda Tangan Webhook
    const sigCheck = verifyMayarWebhookSignature(req, rawBodyString, payload);
    if (!sigCheck.ok) {
      return res.status(sigCheck.status).json({
        ok: false,
        reason: sigCheck.reason,
        message: sigCheck.message,
      });
    }

    const urlObj = req.url ? new URL(String(req.url), 'http://localhost') : null;
    const actionParam = String(payload?.action || urlObj?.searchParams.get('action') || '')
      .trim()
      .toLowerCase();
    if (actionParam === 'reconcile' || actionParam === 'reconcile_pending') {
      return res.status(403).json({
        ok: false,
        activated: false,
        reason: 'RECONCILE_MOVED_TO_CRON',
        message:
          'Rekonsiliasi pending melalui endpoint webhook publik dinonaktifkan. Gunakan endpoint terjadwal /api/cron/mayar-reconcile dengan Authorization: Bearer CRON_SECRET.',
      });
    }

    const event = String(payload.event || payload.type || '').trim().toLowerCase();
    const data = payload.data || payload.payload || payload;
    const extractedIds = extractMayarWebhookIdentifiers(payload, data, req.headers || {});
    const webhookEventId = extractedIds.webhookEventId;
    const webhookDataId = extractedIds.webhookDataId;
    let transactionId = extractedIds.transactionId;
    const extractedOrderId = extractedIds.orderId;
    const webhookMayarInvoiceId = extractedIds.mayarInvoiceId;
    let transactionIdSource = extractedIds.transactionIdSource;

    if (event === 'testing' || event === 'webhook.test') {
      return res.status(200).json({
        ok: true,
        activated: false,
        isTestWebhook: true,
        message: 'Test webhook Mayar berhasil diterima.',
      });
    }

    // 1B. Resolusi order resmi hanya melalui orderId atau indeks 1:1 mayarInvoiceId (JANGAN email/nama/nominal)
    let serverOrder = extractedOrderId ? await getPaymentOrderRecord(extractedOrderId) : null;
    const indexedOrderId = webhookMayarInvoiceId
      ? await getOrderIdByMayarInvoiceId(webhookMayarInvoiceId)
      : '';
    if (indexedOrderId && extractedOrderId && indexedOrderId !== extractedOrderId) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: extractedOrderId,
        mayarInvoiceId: webhookMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'INVOICE_CORRELATION_MISMATCH',
        message: `Mayar invoice ${webhookMayarInvoiceId} sudah terikat pada pesanan ${indexedOrderId}, bukan ${extractedOrderId}.`,
        httpStatus: 409,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
      });
      return res.status(409).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'INVOICE_CORRELATION_MISMATCH',
        message: `Mayar invoice ${webhookMayarInvoiceId} sudah terikat pada pesanan lain.`,
      });
    }
    if (!serverOrder && indexedOrderId) {
      serverOrder = await getPaymentOrderRecord(indexedOrderId);
    }
    if (
      serverOrder?.mayarInvoiceId &&
      webhookMayarInvoiceId &&
      String(serverOrder.mayarInvoiceId).trim().toUpperCase() !== webhookMayarInvoiceId
    ) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: serverOrder.orderId || extractedOrderId,
        mayarInvoiceId: webhookMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'INVOICE_CORRELATION_MISMATCH',
        message: `Pesanan ${serverOrder.orderId} terikat pada invoice Mayar ${serverOrder.mayarInvoiceId}, bukan ${webhookMayarInvoiceId}.`,
        httpStatus: 409,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(409).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'INVOICE_CORRELATION_MISMATCH',
        message: `Konflik identifikasi invoice Mayar untuk pesanan ${serverOrder.orderId}.`,
      });
    }

    const effectiveInvoiceId = serverOrder?.orderId || serverOrder?.invoiceId || extractedOrderId || '';
    const authoritativeMayarInvoiceId = String(
      serverOrder?.mayarInvoiceId || webhookMayarInvoiceId || ''
    )
      .trim()
      .toUpperCase();

    // 1B-2. Event pengingat Mayar V2 (payment.reminder / invoice.reminder):
    //       TIDAK PERNAH mengaktifkan lisensi, TIDAK menandai order paid, dan TIDAK boleh memblokir payment.received berikutnya.
    if (event === 'payment.reminder' || event === 'invoice.reminder') {
      const reminderRecord = {
        webhookEventId,
        webhookDataId: webhookDataId || null,
        event,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        transactionId: transactionId || null,
        idempotencyStatus: 'reminder_logged',
        consistencyState: 'non_activating_reminder',
        activated: false,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        updatedAt: new Date().toISOString(),
      };
      if (webhookEventId) {
        await saveWebhookEventRecord(webhookEventId, reminderRecord);
      }
      await appendSanitizedWebhookAudit({
        event,
        webhookEventId,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        transactionId: transactionId || null,
        outcome: 'reminder_logged',
        reason: 'PAYMENT_REMINDER_NO_ACTIVATION',
        verifiedBy: sigCheck.mode,
        source: 'webhook',
      });
      return res.status(200).json({
        ok: true,
        activated: false,
        reminderHandled: true,
        idempotencyStatus: 'reminder_logged',
        webhookEventId: webhookEventId || null,
        webhookDataId: webhookDataId || null,
        transactionId: transactionId || null,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        message: 'Webhook pengingat (payment.reminder) dicatat aman tanpa mengaktifkan lisensi.',
      });
    }

    // 1C. Idempotency 4-status berbasis webhookEventId:
    //     - committed -> idempotentReplay aman
    //     - terminal_rejected -> kembalikan penolakan terminal tanpa aktivasi
    //     - pending_reconciliation / received -> WAJIB diproses ulang (bukan replay selesai)
    if (webhookEventId) {
      const earlyEvent = await getWebhookEventRecord(webhookEventId);
      if (isEventCommitted(earlyEvent)) {
        const earlyEvOrder = String(earlyEvent.orderId || earlyEvent.invoiceId || '').trim().toUpperCase();
        const earlyEvTx = String(earlyEvent.transactionId || '').trim().toUpperCase();
        if (
          (effectiveInvoiceId && earlyEvOrder && earlyEvOrder !== effectiveInvoiceId) ||
          (transactionId && earlyEvTx && earlyEvTx !== transactionId)
        ) {
          return res.status(409).json({
            ok: false,
            transactionAlreadyBound: true,
            reason: 'TRANSACTION_ALREADY_BOUND',
            message: `Event webhook ${webhookEventId} sudah terikat pada pesanan/transaksi lain.`,
          });
        }
        const earlyTx = earlyEvTx ? await getWebhookTransactionRecord(earlyEvTx) : null;
        const earlySeat = earlyEvent.licenseCode ? await getSeatRecordFromRedis(earlyEvent.licenseCode) : null;
        if (earlyTx?.consistencyState === 'committed' && earlySeat) {
          const earlyPlan = resolvePlanMetadata({
            rawLicenseCode: earlyEvent.licenseCode || '',
            serverOrder,
          });
          return res.status(200).json({
            ok: true,
            idempotentReplay: true,
            idempotencyStatus: 'committed',
            replayType: 'webhook_event',
            webhookEventId,
            transactionId: earlyEvTx || transactionId || null,
            orderId: earlyEvOrder || effectiveInvoiceId || null,
            mayarInvoiceId: authoritativeMayarInvoiceId || earlyEvent.mayarInvoiceId || null,
            message: `Event webhook ${webhookEventId} sudah pernah diproses sebelumnya (idempotent replay aman).`,
            code: earlyEvent.licenseCode,
            planType: earlyPlan.planType,
            maxSeats: earlyPlan.maxSeats,
          });
        }
      } else if (earlyEvent?.idempotencyStatus === 'terminal_rejected') {
        return res.status(Number(earlyEvent.httpStatus) || 400).json({
          ok: false,
          activated: false,
          terminalRejected: true,
          idempotentReplay: true,
          idempotencyStatus: 'terminal_rejected',
          webhookEventId,
          orderId: earlyEvent.orderId || effectiveInvoiceId || null,
          reason: earlyEvent.reason || 'TERMINAL_REJECTED',
          message: earlyEvent.message || `Event webhook ${webhookEventId} telah ditolak permanen sebelumnya.`,
        });
      }
    }

    const rawStatusVal = data.status !== undefined ? data.status : payload.status;
    const rawStatus =
      rawStatusVal === true
        ? 'true'
        : rawStatusVal === false
        ? 'false'
        : String(rawStatusVal ?? '').trim().toLowerCase();

    // 2. Cek Status Pembayaran (Tolak aktivasi jika pending, gagal, kedaluwarsa, boolean false, atau refund)
    const isFailedEvent =
      rawStatus === 'false' ||
      event.includes('fail') ||
      event.includes('cancel') ||
      event.includes('expire') ||
      event.includes('refund') ||
      ['failed', 'cancelled', 'canceled', 'expired', 'unpaid', 'refunded'].includes(rawStatus);

    const extractLicenseCandidate = String(
      data.licenseCode ||
        data.license_code ||
        data.licenseKey ||
        data.license?.code ||
        data.license?.licenseCode ||
        data.serialNumber ||
        ''
    ).trim();

    if (isFailedEvent) {
      if (effectiveInvoiceId) {
        const priorOrder = serverOrder || (await getPaymentOrderRecord(effectiveInvoiceId));
        if (!priorOrder || priorOrder.status !== 'paid') {
          await savePaymentOrderRecord(effectiveInvoiceId, {
            ...(priorOrder || {}),
            orderId: priorOrder?.orderId || effectiveInvoiceId,
            invoiceId: priorOrder?.invoiceId || effectiveInvoiceId,
            status: 'payment_failed',
            idempotencyStatus: 'terminal_rejected',
            webhookEventId: webhookEventId || priorOrder?.webhookEventId || null,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      if (extractLicenseCandidate) {
        const cleanFailedCode = normalizeLicenseCode(extractLicenseCandidate);
        const priorSeat = await getSeatRecordFromRedis(cleanFailedCode);
        if (
          !priorSeat ||
          (priorSeat.lifecycleState !== 'paid' &&
            priorSeat.lifecycleState !== 'active' &&
            (priorSeat.lifecycleState === 'pending_payment' ||
              priorSeat.lifecycleState === 'payment_failed'))
        ) {
          await saveSeatRecordToRedis(cleanFailedCode, {
            ...(priorSeat || {}),
            licenseCode: cleanFailedCode,
            devices: Array.isArray(priorSeat?.devices) ? priorSeat.devices : [],
            maxSeats: priorSeat?.maxSeats || 2,
            lifecycleState: 'payment_failed',
            updatedAt: new Date().toISOString(),
          });
        }
      }
      const failedMessage = `Pembayaran berstatus '${rawStatus || event}'. Lisensi tidak diaktifkan.`;
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PAYMENT_FAILED',
        message: failedMessage,
        httpStatus: 422,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(422).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        lifecycleState: 'payment_failed',
        reason: 'PAYMENT_FAILED',
        message: failedMessage,
      });
    }

    const isPendingEvent =
      event.includes('pending') ||
      event.includes('waiting') ||
      ['pending', 'waiting_payment', 'created'].includes(rawStatus);

    if (isPendingEvent) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'pending_reconciliation',
        reason: 'PAYMENT_PENDING',
        message: 'Pembayaran masih berstatus menunggu konfirmasi (pending). Lisensi menunggu pelunasan.',
        httpStatus: 202,
        retryable: true,
        enqueueReconcile: Boolean(effectiveInvoiceId || authoritativeMayarInvoiceId || webhookEventId),
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
        rawLicenseCode: extractLicenseCandidate,
      });
      return res.status(202).json({
        ok: false,
        activated: false,
        pendingReconciliation: true,
        idempotencyStatus: 'pending_reconciliation',
        lifecycleState: 'pending_payment',
        message: 'Pembayaran masih berstatus menunggu konfirmasi (pending). Lisensi menunggu pelunasan.',
      });
    }

    const isExplicitPaidStatus = [
      'paid',
      'settled',
      'completed',
      'success',
      'true',
      'active',
    ].includes(rawStatus);
    const isExplicitPaidEvent = [
      'payment.received',
      'payment.success',
      'payment.settled',
      'license.created',
      'license.renewed',
    ].includes(event);
    if (!isExplicitPaidStatus && !(rawStatus === '' && isExplicitPaidEvent)) {
      const invalidStatusMsg = `Status atau event pembayaran tidak sah untuk aktivasi ('${rawStatus || event}').`;
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'UNRECOGNIZED_PAYMENT_STATUS',
        message: invalidStatusMsg,
        httpStatus: 422,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(422).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'UNRECOGNIZED_PAYMENT_STATUS',
        message: invalidStatusMsg,
      });
    }

    const rawCurrency = data.currency ?? payload.currency;
    if (rawCurrency !== undefined && rawCurrency !== null && String(rawCurrency).trim() !== '') {
      if (String(rawCurrency).trim().toUpperCase() !== 'IDR') {
        await persistWebhookEventLifecycle({
          webhookEventId,
          event,
          orderId: effectiveInvoiceId,
          mayarInvoiceId: authoritativeMayarInvoiceId,
          idempotencyStatus: 'terminal_rejected',
          reason: 'CURRENCY_MISMATCH',
          message: 'Mata uang transaksi harus IDR.',
          httpStatus: 400,
          source: 'webhook',
          verifiedBy: sigCheck.mode,
          serverOrder,
        });
        return res.status(400).json({
          ok: false,
          activated: false,
          idempotencyStatus: 'terminal_rejected',
          reason: 'CURRENCY_MISMATCH',
          message: 'Mata uang transaksi harus IDR.',
        });
      }
    }

    // Ekstrak informasi pembeli
    const customer = data.customer || {};
    let customerName = String(
      customer.name || customer.fullName || data.customerName || data.name || ''
    ).trim();
    let customerEmail = String(
      customer.email || data.customerEmail || data.email || ''
    ).trim();

    const rawLicenseCode = extractLicenseCandidate;

    // Ekstrak informasi produk untuk menentukan jenis paket (Sekolah vs Individu)
    const productId = String(
      data.productId || data.product_id || data.product?.id || ''
    ).trim();
    const productName = String(
      data.productName || data.product_name || data.product?.name || ''
    ).trim();

    const { individuProductId, schoolProductId, allowedProductIds } = getConfiguredMayarProductIds();

    if (productId && productId !== individuProductId && productId !== schoolProductId) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Product ID Mayar tidak dikenal.',
        httpStatus: 400,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(400).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Product ID Mayar tidak dikenal.',
      });
    }

    const planMeta = resolvePlanMetadata({
      productId,
      productName,
      rawLicenseCode,
      serverOrder,
    });
    const normalizedProdNameLower = productName.toLowerCase();

    if (
      planMeta.licenseCodeIsSchool &&
      (productId === individuProductId ||
        ((normalizedProdNameLower.includes('individu') || normalizedProdNameLower.includes('mandiri')) &&
          !normalizedProdNameLower.includes('sekolah')))
    ) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Produk Individu tidak dapat mengaktifkan kode Lisensi Sekolah.',
        httpStatus: 400,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(400).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Produk Individu tidak dapat mengaktifkan kode Lisensi Sekolah.',
      });
    }

    if (
      serverOrder &&
      serverOrder.planType === 'sekolah' &&
      (productId === individuProductId ||
        ((normalizedProdNameLower.includes('individu') || normalizedProdNameLower.includes('mandiri')) &&
          !normalizedProdNameLower.includes('sekolah')))
    ) {
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Pesanan resmi terdaftar untuk Lisensi Sekolah.',
        httpStatus: 400,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
      });
      return res.status(400).json({
        ok: false,
        activated: false,
        idempotencyStatus: 'terminal_rejected',
        reason: 'PRODUCT_MISMATCH',
        message: 'Pesanan resmi terdaftar untuk Lisensi Sekolah.',
      });
    }

    const { planType, tier, maxSeats, minExpectedAmount, resolvedPlanType, resolvedPlanId } = planMeta;

    // 3. Validasi nominal pembayaran jika field amount disertakan
    const rawAmount = data.amount ?? data.totalAmount ?? data.grossAmount;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const numericAmount = Number(rawAmount);
      if (!Number.isFinite(numericAmount) || numericAmount < minExpectedAmount) {
        const amtMsg = `Nominal pembayaran (${rawAmount}) tidak memenuhi harga paket minimum (${minExpectedAmount}).`;
        await persistWebhookEventLifecycle({
          webhookEventId,
          event,
          orderId: effectiveInvoiceId,
          mayarInvoiceId: authoritativeMayarInvoiceId,
          idempotencyStatus: 'terminal_rejected',
          reason: 'AMOUNT_MISMATCH',
          message: amtMsg,
          httpStatus: 400,
          source: 'webhook',
          verifiedBy: sigCheck.mode,
          serverOrder,
        });
        return res.status(400).json({
          ok: false,
          activated: false,
          idempotencyStatus: 'terminal_rejected',
          reason: 'AMOUNT_MISMATCH',
          message: amtMsg,
        });
      }
    }

    const txDeviceId = String(
      data.deviceId ||
        data.device_id ||
        data.extraData?.device_id ||
        data.metadata?.device_id ||
        serverOrder?.deviceId ||
        ''
    )
      .trim()
      .toUpperCase();
    const expiresAt =
      typeof data.expiresAt === 'string' && data.expiresAt.trim() ? data.expiresAt.trim() : null;

    // 3B. Verifikasi & korelasi transaksi melalui Mayar Detail API V2 (GET /hl/v2/invoices/{mayarInvoiceId}).
    //     Wajib terverifikasi berstatus "paid" dari API V2; payload webhook saja TIDAK boleh mengaktifkan lisensi.
    //     DILARANG keras menggunakan webhook data.id / payload.id sebagai lookupId!
    let apiVerifiedAmount = null;
    {
      const apiCorrelation = await correlateMayarTransactionViaApi({
        mayarInvoiceId: authoritativeMayarInvoiceId,
        expectedAmount: minExpectedAmount,
        expectedTransactionId: transactionId,
        allowedProductIds,
      });

      if (apiCorrelation.resolved && apiCorrelation.transactionId) {
        if (transactionId && transactionId !== apiCorrelation.transactionId) {
          await persistWebhookEventLifecycle({
            webhookEventId,
            event,
            orderId: effectiveInvoiceId,
            mayarInvoiceId: authoritativeMayarInvoiceId,
            transactionId,
            transactionIdSource,
            idempotencyStatus: 'terminal_rejected',
            reason: 'INVOICE_CORRELATION_MISMATCH',
            message: `Transaction ID webhook (${transactionId}) berbeda dari detail resmi Mayar API (${apiCorrelation.transactionId}).`,
            httpStatus: 409,
            source: 'webhook',
            verifiedBy: sigCheck.mode,
            serverOrder,
          });
          return res.status(409).json({
            ok: false,
            activated: false,
            idempotencyStatus: 'terminal_rejected',
            reason: 'INVOICE_CORRELATION_MISMATCH',
            message: `Transaction ID webhook tidak cocok dengan detail invoice resmi Mayar.`,
          });
        }
        if (!transactionId) {
          transactionId = apiCorrelation.transactionId;
          transactionIdSource = apiCorrelation.transactionIdSource || 'mayar_api_detail';
        }
        if (apiCorrelation.amount !== undefined) {
          apiVerifiedAmount = Number(apiCorrelation.amount);
        }
        if (!customerName && apiCorrelation.customerName) {
          customerName = apiCorrelation.customerName;
        }
        if (!customerEmail && apiCorrelation.customerEmail) {
          customerEmail = apiCorrelation.customerEmail;
        }
      } else {
        const isTerminalApiFailure =
          Boolean(apiCorrelation.terminal) || apiCorrelation.retryable === false;
        if (isTerminalApiFailure) {
          const termReason = apiCorrelation.reason || 'MAYAR_API_TERMINAL_REJECTED';
          const termStatus = apiCorrelation.httpStatus || 400;
          const termMessage = `Validasi detail invoice Mayar API ditolak permanen (${termReason}). Tidak ada kursi lisensi yang diaktifkan.`;
          await persistWebhookEventLifecycle({
            webhookEventId,
            event,
            orderId: effectiveInvoiceId,
            mayarInvoiceId: authoritativeMayarInvoiceId,
            transactionId,
            transactionIdSource,
            idempotencyStatus: 'terminal_rejected',
            reason: termReason,
            message: termMessage,
            httpStatus: termStatus,
            enqueueReconcile: false,
            source: 'webhook',
            verifiedBy: sigCheck.mode,
            serverOrder,
          });
          if (effectiveInvoiceId && (!serverOrder || serverOrder.status !== 'paid')) {
            await savePaymentOrderRecord(effectiveInvoiceId, {
              ...(serverOrder || {}),
              orderId: serverOrder?.orderId || effectiveInvoiceId,
              invoiceId: serverOrder?.invoiceId || effectiveInvoiceId,
              status: 'payment_failed',
              idempotencyStatus: 'terminal_rejected',
              pendingReason: termReason,
              updatedAt: new Date().toISOString(),
            });
          }
          return res.status(termStatus).json({
            ok: false,
            activated: false,
            terminalRejected: true,
            idempotencyStatus: 'terminal_rejected',
            reason: termReason,
            webhookEventId: webhookEventId || null,
            orderId: effectiveInvoiceId || null,
            mayarInvoiceId: authoritativeMayarInvoiceId || null,
            message: termMessage,
          });
        }

        // Jalur pending / retryable (API timeout, 5xx, missing key, missing invoice UUID, invoice unpaid):
        // Selalu simpan status pending_reconciliation & antrean rekonsiliasi secara tahan lama di Redis.
        const isTransientInfraError =
          apiCorrelation.reason === 'MAYAR_API_TIMEOUT' ||
          apiCorrelation.reason === 'MAYAR_API_NETWORK_ERROR' ||
          (apiCorrelation.reason === 'MAYAR_API_HTTP_ERROR' &&
            (apiCorrelation.httpStatus >= 500 || apiCorrelation.httpStatus === 429));
        const pendingHttpStatus = isTransientInfraError ? 503 : 202;
        const missingTxReason =
          !transactionId &&
          (apiCorrelation.reason === 'MAYAR_API_KEY_NOT_CONFIGURED' ||
            apiCorrelation.reason === 'MISSING_MAYAR_INVOICE_ID' ||
            apiCorrelation.reason === 'MAYAR_API_MISSING_TRANSACTION_ID');
        const publicReason = missingTxReason
          ? 'MISSING_TRANSACTION_IDENTIFIER'
          : apiCorrelation.reason || 'PENDING_RECONCILIATION';
        const pendingMessage =
          publicReason === 'MISSING_TRANSACTION_IDENTIFIER'
            ? 'Identifier transaksi resmi Mayar (transactionId) belum tersedia atau ambigu (data.id adalah ID webhook). Pesanan masuk antrean rekonsiliasi pending sampai transaksi terkonfirmasi.'
            : `Pembayaran belum dapat dikonfirmasi (${publicReason}). Disimpan sebagai pending_reconciliation untuk rekonsiliasi ulang.`;

        await persistWebhookEventLifecycle({
          webhookEventId,
          event,
          orderId: effectiveInvoiceId,
          mayarInvoiceId: authoritativeMayarInvoiceId,
          transactionId: transactionId || '',
          transactionIdSource: transactionId ? transactionIdSource : 'none',
          idempotencyStatus: 'pending_reconciliation',
          reason: publicReason,
          message: pendingMessage,
          httpStatus: pendingHttpStatus,
          retryable: true,
          enqueueReconcile: true,
          source: 'webhook',
          verifiedBy: sigCheck.mode,
          serverOrder,
          planType,
          tier,
          minExpectedAmount,
          productId,
          rawLicenseCode,
          customerName,
          customerEmail,
          expiresAt,
          txDeviceId,
        });

        return res.status(pendingHttpStatus).json({
          ok: false,
          activated: false,
          pendingReconciliation: true,
          idempotencyStatus: 'pending_reconciliation',
          ambiguousTransactionIdentity: !transactionId,
          lifecycleState: 'pending_payment',
          reason: publicReason,
          correlationReason: apiCorrelation.reason || publicReason,
          ...(apiCorrelation.status ? { invoiceStatus: apiCorrelation.status } : {}),
          webhookEventId: webhookEventId || null,
          webhookDataId: webhookDataId || null,
          transactionId: null,
          orderId: effectiveInvoiceId || null,
          mayarInvoiceId: authoritativeMayarInvoiceId || null,
          transactionIdSource: 'none',
          hasDistinctEventAndTransactionId: false,
          message: pendingMessage,
        });
      }
    }

    const hasDistinctEventAndTransactionId = Boolean(
      webhookEventId && transactionId && webhookEventId !== transactionId
    );

    if (!transactionId) {
      const pendingMessage =
        'Identifier transaksi resmi Mayar (transactionId) belum tersedia. Disimpan sebagai pending_reconciliation.';
      await persistWebhookEventLifecycle({
        webhookEventId,
        event,
        orderId: effectiveInvoiceId,
        mayarInvoiceId: authoritativeMayarInvoiceId,
        idempotencyStatus: 'pending_reconciliation',
        reason: 'MISSING_TRANSACTION_IDENTIFIER',
        message: pendingMessage,
        httpStatus: 202,
        retryable: true,
        enqueueReconcile: true,
        source: 'webhook',
        verifiedBy: sigCheck.mode,
        serverOrder,
        planType,
        tier,
        minExpectedAmount,
        productId,
        rawLicenseCode,
        customerName,
        customerEmail,
        expiresAt,
        txDeviceId,
      });
      return res.status(202).json({
        ok: false,
        activated: false,
        pendingReconciliation: true,
        idempotencyStatus: 'pending_reconciliation',
        ambiguousTransactionIdentity: true,
        lifecycleState: 'pending_payment',
        reason: 'MISSING_TRANSACTION_IDENTIFIER',
        webhookEventId: webhookEventId || null,
        webhookDataId: webhookDataId || null,
        transactionId: null,
        orderId: effectiveInvoiceId || null,
        mayarInvoiceId: authoritativeMayarInvoiceId || null,
        transactionIdSource: 'none',
        hasDistinctEventAndTransactionId: false,
        message: pendingMessage,
      });
    }

    const buyerLabel = customerName
      ? `Mayar: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}`
      : customerEmail
      ? `Mayar: ${customerEmail}`
      : 'Pembelian Mayar.id';

    const resolvedLicenseCode =
      normalizeLicenseCode(rawLicenseCode) ||
      normalizeLicenseCode(serverOrder?.licenseCode || '') ||
      (effectiveInvoiceId ? generateOrderLicenseCodeServer(planType, effectiveInvoiceId) : '');

    if (resolvedLicenseCode) {
      const cleanCode = resolvedLicenseCode;
      const resolvedAmount =
        apiVerifiedAmount !== null && Number.isFinite(apiVerifiedAmount)
          ? apiVerifiedAmount
          : rawAmount !== undefined && rawAmount !== null && rawAmount !== ''
          ? Number(rawAmount)
          : minExpectedAmount;

      const commitOutcome = await commitAuthorizedSettlement({
        event,
        webhookEventId,
        transactionId,
        transactionIdSource,
        hasDistinctEventAndTransactionId,
        effectiveInvoiceId,
        authoritativeMayarInvoiceId,
        cleanCode,
        planType,
        tier,
        resolvedPlanType,
        resolvedPlanId,
        maxSeats,
        minExpectedAmount,
        resolvedAmount,
        productId,
        txDeviceId,
        customerName,
        customerEmail,
        buyerLabel,
        expiresAt,
        verifiedBy: sigCheck.mode,
        serverOrder,
        isRenewal: data.isRenewal === true,
        auditSource: 'webhook',
      });
      return res.status(commitOutcome.httpStatus).json(commitOutcome.body);
    }

    return res.status(200).json({
      ok: true,
      message: `Webhook event '${event || 'unknown'}' diterima, namun tidak memuat data licenseCode langsung. Aktivasi kode akan divalidasi saat guru memasukkan kodenya.`,
    });
  } catch (error) {
    if (error instanceof RedisUnavailableError || error?.name === 'RedisUnavailableError') {
      return res.status(503).json({
        ok: false,
        activated: false,
        redisUnavailable: true,
        reason: 'REDIS_UNAVAILABLE',
        message: error.message,
      });
    }
    if (error instanceof FencedWriteConflictError || error?.name === 'FencedWriteConflictError') {
      return res.status(409).json({
        ok: false,
        activated: false,
        staleLockFence: true,
        reason: error.reason || 'STALE_LOCK_FENCE',
        message: error.message,
      });
    }
    if (error instanceof LockContentionError || error?.name === 'LockContentionError') {
      return res.status(409).json({
        ok: false,
        activated: false,
        lockContention: true,
        reason: error.reason || 'LOCK_CONTENTION_TIMEOUT',
        message: error.message,
      });
    }
    return res.status(500).json({
      ok: false,
      activated: false,
      message: error?.message || 'Gagal memproses webhook Mayar.',
    });
  }
}

