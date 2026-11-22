import crypto from 'node:crypto';
import {
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
if seatPatch.environment and seatPatch.environment ~= '' then seatObj.environment = seatPatch.environment end
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

export function computeMayarHmacSignature(rawBody, secret) {
  return crypto
    .createHmac('sha256', String(secret ?? ''))
    .update(String(rawBody ?? ''), 'utf8')
    .digest('hex');
}

export function extractMayarWebhookIdentifiers() {
  return { retired: true };
}

export async function correlateMayarTransactionViaApi() {
  return {
    ok: false,
    retired: true,
    provider: 'mayar',
    reason: 'MAYAR_DECOMMISSIONED',
  };
}

export function verifyMayarWebhookSignature() {
  return {
    ok: false,
    retired: true,
    provider: 'mayar',
    reason: 'MAYAR_DECOMMISSIONED',
  };
}

export async function reconcilePendingWebhooks() {
  return {
    ok: false,
    retired: true,
    provider: 'mayar',
    reason: 'MAYAR_DECOMMISSIONED',
    processed: 0,
    succeeded: 0,
    deferred: 0,
    skipped: 0,
    items: [],
  };
}

/**
 * Retired Vercel Serverless Function: /api/mayar-webhook
 * Permanently returns HTTP 410 Gone with zero MAYAR_* env reads,
 * zero external network calls, and zero state mutations.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req?.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(410).json({
    ok: false,
    retired: true,
    provider: 'mayar',
    reason: 'MAYAR_DECOMMISSIONED',
    message:
      'Endpoint webhook Mayar (/api/mayar-webhook) telah dipensiunkan permanen. AsesMerdeka tidak lagi menerima atau memproses transaksi dari Mayar.id.',
  });
}
