import crypto from 'node:crypto';

/**
 * Vercel Serverless Function: /api/activate-license
 * 1. Memverifikasi Kode Lisensi Terenkripsi AsesMerdeka (ASM-XXXX-XXXX-XXXX-XXXX) & PRO-MERDEKA-...
 * 2. Memverifikasi Kode Lisensi API resmi Mayar.id
 * 3. Mengunci Batas Maksimal Perangkat (Device Seat Lock: 2 perangkat untuk Guru Mandiri, 25 untuk Sekolah)
 *    secara terpusat di Upstash Redis agar kode TIDAK BISA dipakai di perangkat ke-3 (HP/Laptop orang lain).
 */

export class RedisUnavailableError extends Error {
  constructor(message = 'Layanan Redis penyimpanan lisensi dan pembayaran sedang tidak tersedia.', reason = 'REDIS_UNAVAILABLE') {
    super(message);
    this.name = 'RedisUnavailableError';
    this.statusCode = 503;
    this.reason = reason;
  }
}

export class LockContentionError extends Error {
  constructor(message = 'Transaksi sedang diproses oleh instance lain. Silakan coba beberapa saat lagi.', reason = 'LOCK_CONTENTION_TIMEOUT') {
    super(message);
    this.name = 'LockContentionError';
    this.statusCode = 409;
    this.reason = reason;
  }
}

export const localSeatMemoryStore = new Map();
export const localLicenseRegistryStore = [];
export const localWebhookTransactionStore = new Map();
export const localWebhookEventStore = new Map();
export const localPaymentOrderStore = new Map();
export const localMayarInvoiceIndexStore = new Map();
export const localReconcileQueueStore = new Map();
export const localWebhookAuditLog = [];

const inProcessMutexLocks = new Map();
let localMonotonicFenceCounter = 0;

export const SERVER_PLAN_CATALOG = {
  pro_individu: { planId: 'pro_individu', planType: 'individu', tier: 'guru', price: 99000, maxSeats: 2 },
  pro_sekolah: { planId: 'pro_sekolah', planType: 'sekolah', tier: 'sekolah', price: 749000, maxSeats: 25 },
  pro_ai: { planId: 'pro_ai', planType: 'pro', tier: 'pro', price: 199000, maxSeats: 2 },
  sekolah_pro: { planId: 'sekolah_pro', planType: 'sekolah_pro', tier: 'sekolah_pro', price: 1499000, maxSeats: 25 },
};

globalThis.__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__ = {
  verifiedTransactions: localWebhookTransactionStore,
  webhookEvents: localWebhookEventStore,
  paymentOrders: localPaymentOrderStore,
};

const MAX_DEVICES_PER_SCHOOL_TEACHER = 2;

function computeHash36(input) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36).toUpperCase();
}

export function normalizeLicenseCode(raw) {
  return String(raw || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
}

export function isLicenseExpired(expiresAt, nowMs = Date.now()) {
  if (!expiresAt || typeof expiresAt !== 'string') return false;
  const trimmed = expiresAt.trim();
  if (!trimmed) return false;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return false;
  return parsed <= nowMs;
}

export function isSchoolLicenseCodeServer(cleanCode, maxSeats = 0, existingRecord = null) {
  if (Number(maxSeats) >= 25 || Number(existingRecord?.maxSeats) >= 25) return true;
  if (existingRecord?.planType === 'sekolah' || existingRecord?.planType === 'sekolah_pro') return true;
  return (
    cleanCode.startsWith('ASM-SK26-') ||
    cleanCode.startsWith('ASM-SP26-') ||
    cleanCode.includes('SEKOLAH')
  );
}

export function normalizeTeacherKeyServer(teacherPinOrId, deviceId) {
  const raw = String(teacherPinOrId || '').trim();
  if (raw) {
    const segment = raw.includes(':') ? raw.split(':')[0] : raw;
    const cleaned = segment
      .replace(/[^A-Za-z0-9_-]/g, '')
      .toUpperCase()
      .slice(0, 48);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }
  const cleanDev = String(deviceId || '').trim().toUpperCase().replace(/[^A-Za-z0-9_-]/g, '');
  return cleanDev ? `LEGACY_DEV_${cleanDev}` : 'DEFAULT_TEACHER';
}

export function getActiveTeacherDevicesUnionServer(teacherSeats) {
  const seen = new Set();
  if (!teacherSeats || typeof teacherSeats !== 'object') return [];
  for (const key of Object.keys(teacherSeats)) {
    const entry = teacherSeats[key];
    if (entry && entry.status === 'active' && Array.isArray(entry.devices)) {
      for (const dev of entry.devices) {
        seen.add(dev);
      }
    }
  }
  return Array.from(seen);
}

export function getEffectiveUsedSeatCount(record) {
  if (!record) return 0;
  if (record.teacherSeats && typeof record.teacherSeats === 'object') {
    return Object.values(record.teacherSeats).filter((t) => t && t.status === 'active').length;
  }
  if (Array.isArray(record.devices)) {
    return record.devices.length;
  }
  return Number(record.usedSeats) || 0;
}

export function evaluateServerLifecycleState(record, revoked = false, nowMs = Date.now()) {
  if (revoked || record?.deleted || record?.revoked || record?.lifecycleState === 'revoked') {
    return 'revoked';
  }
  if (record?.paymentFailed || record?.lifecycleState === 'payment_failed') {
    return 'payment_failed';
  }
  if (record?.suspended || record?.lifecycleState === 'suspended') {
    return 'suspended';
  }
  if (isLicenseExpired(record?.expiresAt, nowMs) || record?.lifecycleState === 'expired') {
    return 'expired';
  }
  if (record?.lifecycleState === 'pending_payment') {
    return 'pending_payment';
  }
  const used = getEffectiveUsedSeatCount(record);
  if (used > 0 || record?.status === 'aktif' || record?.lifecycleState === 'active') {
    return 'active';
  }
  return 'paid';
}

export function getRedisCredentials() {
  const upstashUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const upstashToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (upstashUrl && upstashToken) {
    return {
      url: upstashUrl,
      token: upstashToken,
      configured: true,
      source: 'UPSTASH_REDIS_REST_*',
    };
  }

  const hasPartialUpstash = Boolean(upstashUrl || upstashToken);
  const kvUrl = String(process.env.KV_REST_API_URL || '').trim();
  const kvToken = String(process.env.KV_REST_API_TOKEN || '').trim();
  if (!hasPartialUpstash && kvUrl && kvToken) {
    return {
      url: kvUrl,
      token: kvToken,
      configured: true,
      source: 'KV_REST_API_*',
    };
  }

  return { url: '', token: '', configured: false, source: null };
}

export class FencedWriteConflictError extends Error {
  constructor(message = 'Lock transaksi telah kedaluwarsa atau didahului oleh proses yang lebih baru.', reason = 'STALE_LOCK_FENCE') {
    super(message);
    this.name = 'FencedWriteConflictError';
    this.statusCode = 409;
    this.reason = reason;
  }
}

export const REGISTRY_REDIS_KEY = 'asesmerdeka:admin:license_registry:v1';

export const LUA_ACQUIRE_MULTI_LOCK_SCRIPT = `
-- ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1
local numLocks = tonumber(ARGV[1])
local owner = ARGV[2]
local ttlMs = tonumber(ARGV[3])
local fenceKey = KEYS[numLocks + 1]
for i = 1, numLocks do
  if redis.call('EXISTS', KEYS[i]) == 1 then
    return {'BUSY', KEYS[i]}
  end
end
for i = 1, numLocks do
  redis.call('SET', KEYS[i], owner, 'PX', ttlMs)
end
local fence = redis.call('INCR', fenceKey)
return {'ACQUIRED', tostring(fence)}
`.trim();

export const LUA_RELEASE_MULTI_LOCK_SCRIPT = `
-- ASESMERDEKA_RELEASE_MULTI_LOCK_V1
local owner = ARGV[1]
local released = 0
for i = 1, #KEYS do
  if redis.call('GET', KEYS[i]) == owner then
    released = released + redis.call('DEL', KEYS[i])
  end
end
return released
`.trim();

export const LUA_ATOMIC_SEAT_CAS_SCRIPT = `
-- ASESMERDEKA_ATOMIC_SEAT_CAS_V1
local owner = ARGV[1] or ''
local expectedFence = tonumber(ARGV[2]) or 0
local expectedRev = tonumber(ARGV[3]) or 0
local nextJson = ARGV[4]
local maxSeatsLimit = tonumber(ARGV[5]) or 0
if owner ~= '' and KEYS[2] ~= '' and KEYS[2] ~= 'asesmerdeka:noop:lock' then
  local curLockOwner = redis.call('GET', KEYS[2])
  if curLockOwner ~= owner then
    return {'LOCK_LOST', ''}
  end
end
local currentRaw = redis.call('GET', KEYS[1])
if currentRaw then
  local ok, current = pcall(cjson.decode, currentRaw)
  if ok and type(current) == 'table' then
    local curFence = tonumber(current.fenceToken) or 0
    if expectedFence > 0 and curFence > expectedFence then
      return {'STALE_FENCE', tostring(curFence)}
    end
    local curRev = tonumber(current.seatRevision) or 0
    if curRev ~= expectedRev then
      return {'CONFLICT', tostring(curRev)}
    end
  end
elseif expectedRev > 0 then
  return {'CONFLICT', '0'}
end
if maxSeatsLimit > 0 then
  local okNext, nextObj = pcall(cjson.decode, nextJson)
  if okNext and type(nextObj) == 'table' then
    local nextUsed = tonumber(nextObj.usedSeats) or 0
    if nextUsed > maxSeatsLimit then
      return {'QUOTA_EXCEEDED', tostring(nextUsed)}
    end
  end
end
redis.call('SET', KEYS[1], nextJson)
return {'OK', ''}
`.trim();

export const LUA_FENCED_RECORD_WRITE_SCRIPT = `
-- ASESMERDEKA_FENCED_RECORD_WRITE_V1
local owner = ARGV[1] or ''
local expectedFence = tonumber(ARGV[2]) or 0
local nextJson = ARGV[3]
if owner ~= '' and KEYS[2] ~= '' and KEYS[2] ~= 'asesmerdeka:noop:lock' then
  if redis.call('GET', KEYS[2]) ~= owner then
    return {'LOCK_LOST', ''}
  end
end
local currentRaw = redis.call('GET', KEYS[1])
if currentRaw then
  local ok, current = pcall(cjson.decode, currentRaw)
  if ok and type(current) == 'table' then
    local curFence = tonumber(current.fenceToken) or 0
    if expectedFence > 0 and curFence > expectedFence then
      return {'STALE_FENCE', tostring(curFence)}
    end
  end
end
redis.call('SET', KEYS[1], nextJson)
return {'OK', ''}
`.trim();

export const LUA_UPSERT_ADMIN_REGISTRY_SCRIPT = `
-- ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1
local entryJson = ARGV[1]
local okEntry, patch = pcall(cjson.decode, entryJson)
if not okEntry or type(patch) ~= 'table' or not patch.code then
  return {'INVALID_PATCH'}
end
local currentRaw = redis.call('GET', KEYS[1])
local list = {}
if currentRaw then
  local okList, decoded = pcall(cjson.decode, currentRaw)
  if okList and type(decoded) == 'table' then
    list = decoded
  end
end
local foundIdx = -1
for i = 1, #list do
  if list[i] and list[i].code == patch.code then
    foundIdx = i
    break
  end
end
if foundIdx > 0 then
  local target = list[foundIdx]
  target.updatedAt = patch.updatedAt
  if patch.label and patch.label ~= '' then target.label = patch.label end
  if patch.planType and patch.planType ~= '' then target.planType = patch.planType end
  if patch.tier and patch.tier ~= '' then target.tier = patch.tier end
  if patch.hasExpiresAt then target.expiresAt = patch.expiresAt end
  if patch.transactionId and patch.transactionId ~= '' then target.transactionId = patch.transactionId end
  if patch.teacherSeats then target.teacherSeats = patch.teacherSeats end
  if patch.devices and type(patch.devices) == 'table' then
    if type(target.devices) ~= 'table' then target.devices = {} end
    for _, dev in ipairs(patch.devices) do
      local exists = false
      for _, exDev in ipairs(target.devices) do
        if exDev == dev then exists = true break end
      end
      if not exists then
        table.insert(target.devices, dev)
      end
    end
  end
  target.usedSeats = patch.usedSeats
  target.status = patch.status
  target.lifecycleState = patch.lifecycleState
  list[foundIdx] = target
else
  table.insert(list, 1, patch.newEntry)
end
redis.call('SET', KEYS[1], cjson.encode(list))
return {'OK'}
`.trim();

export async function evalRedisScript(script, keys = [], args = []) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return { configured: false, result: null };
  }

  let res;
  try {
    const endpoint = url.replace(/\/$/, '');
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        script,
        String(keys.length),
        ...keys,
        ...args.map((a) => String(a ?? '')),
      ]),
    });
  } catch {
    throw new RedisUnavailableError();
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError();
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError();
  }

  if (!data || data.error) {
    throw new RedisUnavailableError();
  }

  return { configured: true, result: data.result };
}

function buildRedisLockKey(name) {
  return `asesmerdeka:lock:v1:${String(name || '').trim().toUpperCase()}`;
}

function buildRedisFenceKey(names) {
  const joined = names.join('|');
  return `asesmerdeka:fence:v1:${computeHash36(joined)}`;
}

async function withLocalMutexChain(sortedNames, task) {
  if (sortedNames.length === 0) {
    localMonotonicFenceCounter += 1;
    return task({
      distributed: false,
      lockKeys: [],
      ownerToken: '',
      fenceToken: localMonotonicFenceCounter,
    });
  }

  const head = sortedNames[0];
  const rest = sortedNames.slice(1);
  const prev = inProcessMutexLocks.get(head) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => current);
  inProcessMutexLocks.set(head, chained);

  await prev;
  try {
    return await withLocalMutexChain(rest, task);
  } finally {
    release();
    if (inProcessMutexLocks.get(head) === chained) {
      inProcessMutexLocks.delete(head);
    }
  }
}

export async function withDistributedLock(lockNames, task, options = {}) {
  const normalizedNames = Array.from(
    new Set(
      (Array.isArray(lockNames) ? lockNames : [lockNames])
        .map((n) => String(n || '').trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort();

  const { configured } = getRedisCredentials();
  if (!configured) {
    // Fallback dev/test lokal tanpa Redis: serialisasi dalam proses + fencing token lokal
    return withLocalMutexChain(normalizedNames, task);
  }

  if (normalizedNames.length === 0) {
    return task({ distributed: true, lockKeys: [], ownerToken: '', fenceToken: 0 });
  }

  const lockKeys = normalizedNames.map(buildRedisLockKey);
  const fenceKey = options.fenceNamespace
    ? `asesmerdeka:fence:v1:${String(options.fenceNamespace).trim().toUpperCase()}`
    : buildRedisFenceKey(normalizedNames);
  const ownerToken = `LOCK_${crypto.randomUUID()}`;
  const envTtl = Number(process.env.ASESMERDEKA_LOCK_TTL_MS);
  const ttlMs = Math.max(
    30,
    Number(options.ttlMs) || (Number.isFinite(envTtl) && envTtl > 0 ? envTtl : 10000)
  );
  const waitTimeoutMs = Math.max(50, Number(options.waitTimeoutMs) || 8000);
  const baseRetryMs = Math.max(5, Number(options.retryDelayMs) || 15);
  const deadline = Date.now() + waitTimeoutMs;

  let acquiredFence = 0;
  let acquired = false;

  while (Date.now() <= deadline) {
    const evalRes = await evalRedisScript(
      LUA_ACQUIRE_MULTI_LOCK_SCRIPT,
      [...lockKeys, fenceKey],
      [String(lockKeys.length), ownerToken, String(ttlMs)]
    );
    const resultArr = Array.isArray(evalRes.result) ? evalRes.result : [];
    if (resultArr[0] === 'ACQUIRED') {
      acquired = true;
      acquiredFence = Number(resultArr[1]) || 1;
      break;
    }
    const jitter = Math.floor(Math.random() * 12);
    await new Promise((resolve) => setTimeout(resolve, baseRetryMs + jitter));
  }

  if (!acquired) {
    throw new LockContentionError();
  }

  try {
    return await task({
      distributed: true,
      lockKeys,
      primaryLockKey: lockKeys[0],
      fenceKey,
      ownerToken,
      fenceToken: acquiredFence,
    });
  } finally {
    await evalRedisScript(LUA_RELEASE_MULTI_LOCK_SCRIPT, lockKeys, [ownerToken]).catch(() => null);
  }
}

export function buildSeatRedisKey(cleanCode) {
  return `asesmerdeka:seats:v1:${cleanCode}`;
}

export async function getSeatRecordFromRedis(cleanCode) {
  const key = buildSeatRedisKey(cleanCode);
  const { configured, value } = await fetchRedisJson(key);
  if (!configured) {
    return localSeatMemoryStore.get(key) || null;
  }
  return value;
}

export async function saveSeatRecordToRedis(cleanCode, record, options = {}) {
  const key = buildSeatRedisKey(cleanCode);
  const { configured } = getRedisCredentials();
  if (!configured) {
    if (options.expectedFenceToken) {
      const existing = localSeatMemoryStore.get(key);
      if (existing?.fenceToken && existing.fenceToken > options.expectedFenceToken) {
        throw new FencedWriteConflictError();
      }
    }
    localSeatMemoryStore.set(key, record);
    return;
  }

  if (options.expectedFenceToken || options.lockKey) {
    const res = await evalRedisScript(
      LUA_FENCED_RECORD_WRITE_SCRIPT,
      [key, options.lockKey || 'asesmerdeka:noop:lock'],
      [options.ownerToken || '', String(options.expectedFenceToken || 0), JSON.stringify(record)]
    );
    const tag = Array.isArray(res.result) ? res.result[0] : 'OK';
    if (tag === 'LOCK_LOST' || tag === 'STALE_FENCE') {
      throw new FencedWriteConflictError();
    }
    return;
  }

  await writeRedisJson(key, record);
}

export async function atomicSaveSeatRecordWithCas({
  cleanCode,
  lockKey = 'asesmerdeka:noop:lock',
  ownerToken = '',
  expectedFenceToken = 0,
  expectedSeatRevision = 0,
  maxSeatsLimit = 0,
  nextRecord,
}) {
  const key = buildSeatRedisKey(cleanCode);
  const { configured } = getRedisCredentials();
  if (!configured) {
    const existing = localSeatMemoryStore.get(key) || null;
    if (existing) {
      const curFence = Number(existing.fenceToken) || 0;
      if (expectedFenceToken > 0 && curFence > expectedFenceToken) {
        return { ok: false, reason: 'STALE_FENCE' };
      }
      const curRev = Number(existing.seatRevision) || 0;
      if (curRev !== expectedSeatRevision) {
        return { ok: false, reason: 'CONFLICT' };
      }
    } else if (expectedSeatRevision > 0) {
      return { ok: false, reason: 'CONFLICT' };
    }
    localSeatMemoryStore.set(key, nextRecord);
    return { ok: true };
  }

  const evalRes = await evalRedisScript(
    LUA_ATOMIC_SEAT_CAS_SCRIPT,
    [key, lockKey || 'asesmerdeka:noop:lock'],
    [
      ownerToken || '',
      String(expectedFenceToken || 0),
      String(expectedSeatRevision || 0),
      JSON.stringify(nextRecord),
      String(maxSeatsLimit || 0),
    ]
  );
  const resultArr = Array.isArray(evalRes.result) ? evalRes.result : ['OK'];
  if (resultArr[0] === 'OK') {
    return { ok: true };
  }
  return { ok: false, reason: resultArr[0] || 'CONFLICT', detail: resultArr[1] || '' };
}

export async function deleteSeatRecordFromRedis(cleanCode) {
  const key = buildSeatRedisKey(cleanCode);
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    localSeatMemoryStore.delete(key);
    return;
  }

  let res;
  try {
    const endpoint = `${url.replace(/\/$/, '')}/del/${encodeURIComponent(key)}`;
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new RedisUnavailableError();
  }
  if (!res || !res.ok) {
    throw new RedisUnavailableError();
  }
}

async function fetchRedisJson(key) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) return { configured: false, value: null };

  let res;
  try {
    const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
    res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new RedisUnavailableError();
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError();
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError();
  }

  if (!data || data.error) {
    throw new RedisUnavailableError();
  }

  if (data.result === null || data.result === undefined || data.result === '') {
    return { configured: true, value: null };
  }

  try {
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return { configured: true, value: parsed };
  } catch {
    return { configured: true, value: null };
  }
}

async function writeRedisJson(key, record) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) return false;

  let res;
  try {
    const endpoint = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`;
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(record),
    });
  } catch {
    throw new RedisUnavailableError();
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError();
  }

  const data = await res.json().catch(() => null);
  if (data && data.error) {
    throw new RedisUnavailableError();
  }
  return true;
}

export const RECONCILE_QUEUE_REDIS_KEY = 'asesmerdeka:mayar:reconcile_queue:v1';
export const WEBHOOK_AUDIT_REDIS_KEY = 'asesmerdeka:mayar:webhook_audit:v1';

export function buildMayarInvoiceIndexKey(mayarInvoiceId) {
  return `asesmerdeka:mayar:inv_idx:v1:${String(mayarInvoiceId || '').trim().toUpperCase()}`;
}

export async function getOrderIdByMayarInvoiceId(mayarInvoiceId) {
  const cleanId = String(mayarInvoiceId || '').trim().toUpperCase();
  if (!cleanId) return null;
  const key = buildMayarInvoiceIndexKey(cleanId);
  const { configured, value } = await fetchRedisJson(key);
  const raw = !configured ? localMayarInvoiceIndexStore.get(key) || null : value;
  if (!raw) return null;
  const resolved = typeof raw === 'string' ? raw : raw.orderId || raw.invoiceId || '';
  return String(resolved).trim().toUpperCase() || null;
}

export async function saveMayarInvoiceIndex(mayarInvoiceId, orderId, licenseCode = null) {
  const cleanMayarInv = String(mayarInvoiceId || '').trim().toUpperCase();
  const cleanOrder = String(orderId || '').trim().toUpperCase();
  if (!cleanMayarInv || !cleanOrder) return;
  const key = buildMayarInvoiceIndexKey(cleanMayarInv);
  const record = {
    mayarInvoiceId: cleanMayarInv,
    orderId: cleanOrder,
    licenseCode: licenseCode ? normalizeLicenseCode(licenseCode) : null,
    updatedAt: new Date().toISOString(),
  };
  const { configured } = getRedisCredentials();
  if (!configured) {
    localMayarInvoiceIndexStore.set(key, record);
    return;
  }
  await writeRedisJson(key, record);
}

export async function getReconcileQueueRecords() {
  const { configured, value } = await fetchRedisJson(RECONCILE_QUEUE_REDIS_KEY);
  if (!configured) {
    return Array.from(localReconcileQueueStore.values());
  }
  return Array.isArray(value) ? value : [];
}

export async function enqueueReconcileJob(job) {
  if (!job || typeof job !== 'object') return null;
  const jobKey = String(job.jobKey || job.eventId || job.orderId || '').trim().toUpperCase();
  if (!jobKey) return null;
  const sanitized = {
    jobKey,
    eventId: (job.eventId || job.webhookEventId) ? String(job.eventId || job.webhookEventId).trim().toUpperCase() : null,
    webhookEventId: (job.webhookEventId || job.eventId) ? String(job.webhookEventId || job.eventId).trim().toUpperCase() : null,
    webhookDataId: job.webhookDataId ? String(job.webhookDataId).trim().toUpperCase() : null,
    orderId: job.orderId ? String(job.orderId).trim().toUpperCase() : null,
    mayarInvoiceId: job.mayarInvoiceId ? String(job.mayarInvoiceId).trim().toUpperCase() : null,
    mayarTransactionId: job.mayarTransactionId ? String(job.mayarTransactionId).trim().toUpperCase() : null,
    mayarApiVersion: job.mayarApiVersion || 'hl/v2',
    licenseCode: (job.licenseCode || job.rawLicenseCode) ? normalizeLicenseCode(job.licenseCode || job.rawLicenseCode) : null,
    rawLicenseCode: (job.rawLicenseCode || job.licenseCode) ? normalizeLicenseCode(job.rawLicenseCode || job.licenseCode) : null,
    planType: job.planType || null,
    tier: job.tier || null,
    minExpectedAmount: Number(job.minExpectedAmount) || 0,
    productId: job.productId ? String(job.productId).trim() : null,
    deviceId: (job.deviceId || job.txDeviceId) ? String(job.deviceId || job.txDeviceId).trim().toUpperCase() : null,
    txDeviceId: (job.txDeviceId || job.deviceId) ? String(job.txDeviceId || job.deviceId).trim().toUpperCase() : null,
    expiresAt: job.expiresAt || null,
    customerEmail: job.customerEmail ? String(job.customerEmail).trim() : null,
    customerName: job.customerName ? String(job.customerName).trim() : null,
    verifiedBy: job.verifiedBy || null,
    payloadEvent: job.payloadEvent || job.event || 'payment.received',
    event: job.event || job.payloadEvent || 'payment.received',
    pendingReason: job.pendingReason || job.reason || 'MISSING_TRANSACTION_IDENTIFIER',
    idempotencyStatus: 'pending_reconciliation',
    attempts: Number(job.attempts) || 1,
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextRetryAt: job.nextRetryAt || new Date().toISOString(),
  };

  return await withDistributedLock(['reconcile_queue:global'], async () => {
    const { configured, value } = await fetchRedisJson(RECONCILE_QUEUE_REDIS_KEY);
    if (!configured) {
      const existing = localReconcileQueueStore.get(jobKey);
      const merged = existing
        ? { ...existing, ...sanitized, createdAt: existing.createdAt || sanitized.createdAt, attempts: (Number(existing.attempts) || 0) + 1 }
        : sanitized;
      localReconcileQueueStore.set(jobKey, merged);
      return merged;
    }
    const list = Array.isArray(value) ? [...value] : [];
    const idx = list.findIndex((item) => item && item.jobKey === jobKey);
    const merged = idx >= 0
      ? { ...list[idx], ...sanitized, createdAt: list[idx].createdAt || sanitized.createdAt, attempts: (Number(list[idx].attempts) || 0) + 1 }
      : sanitized;
    if (idx >= 0) list[idx] = merged;
    else list.push(merged);
    await writeRedisJson(RECONCILE_QUEUE_REDIS_KEY, list);
    return merged;
  });
}

export async function removeReconcileJob(jobKeyOrOrderOrEventId) {
  const cleanKey = String(jobKeyOrOrderOrEventId || '').trim().toUpperCase();
  if (!cleanKey) return false;
  return await withDistributedLock(['reconcile_queue:global'], async () => {
    const { configured, value } = await fetchRedisJson(RECONCILE_QUEUE_REDIS_KEY);
    if (!configured) {
      let deleted = localReconcileQueueStore.delete(cleanKey);
      for (const [k, v] of localReconcileQueueStore.entries()) {
        if (v && (v.eventId === cleanKey || v.orderId === cleanKey)) {
          localReconcileQueueStore.delete(k);
          deleted = true;
        }
      }
      return deleted;
    }
    const list = Array.isArray(value) ? value : [];
    const filtered = list.filter(
      (item) => item && item.jobKey !== cleanKey && item.eventId !== cleanKey && item.orderId !== cleanKey
    );
    if (filtered.length !== list.length) {
      await writeRedisJson(RECONCILE_QUEUE_REDIS_KEY, filtered);
      return true;
    }
    return false;
  });
}

export async function appendSanitizedWebhookAudit(entry) {
  if (!entry || typeof entry !== 'object') return;
  const sanitized = {
    at: new Date().toISOString(),
    webhookEventId: entry.webhookEventId || null,
    orderId: entry.orderId || null,
    mayarInvoiceId: entry.mayarInvoiceId || null,
    transactionId: entry.transactionId || null,
    outcome: entry.outcome || 'unknown',
    idempotencyStatus: entry.idempotencyStatus || null,
    reason: entry.reason || null,
    httpStatus: entry.httpStatus || null,
    source: entry.source || 'webhook',
  };
  const { configured, value } = await fetchRedisJson(WEBHOOK_AUDIT_REDIS_KEY);
  if (!configured) {
    localWebhookAuditLog.unshift(sanitized);
    if (localWebhookAuditLog.length > 100) localWebhookAuditLog.length = 100;
    return;
  }
  const list = Array.isArray(value) ? [...value] : [];
  list.unshift(sanitized);
  if (list.length > 100) list.length = 100;
  await writeRedisJson(WEBHOOK_AUDIT_REDIS_KEY, list);
}

export async function getSanitizedWebhookAuditLog() {
  const { configured, value } = await fetchRedisJson(WEBHOOK_AUDIT_REDIS_KEY);
  if (!configured) {
    return [...localWebhookAuditLog];
  }
  return Array.isArray(value) ? value : [];
}

export function resolveMayarApiV2Config() {
  const rawBaseUrl = String(process.env.MAYAR_API_BASE_URL || '').trim();
  const rawEnv = String(process.env.MAYAR_ENV || '').trim().toLowerCase();
  const sandboxFlag =
    rawEnv === 'sandbox' || String(process.env.MAYAR_SANDBOX || '').trim().toLowerCase() === 'true';

  if (rawBaseUrl) {
    const lower = rawBaseUrl.toLowerCase();
    if (
      lower.includes('/hl/v1') ||
      lower.includes('/saas/v1') ||
      lower.includes('/software/v1') ||
      lower.includes('api.mayar.club')
    ) {
      return {
        ok: false,
        reason: 'DEPRECATED_MAYAR_V1_URL',
        message: 'Konfigurasi endpoint Mayar V1 (/hl/v1, /saas/v1, /software/v1, api.mayar.club) telah kedaluwarsa. Gunakan endpoint Headless/SaaS API V2.',
      };
    }
  }

  let origin = sandboxFlag ? 'https://api.mayar.io' : 'https://api.mayar.id';
  if (rawBaseUrl) {
    origin = rawBaseUrl
      .replace(/\/+$/, '')
      .replace(/\/hl\/v2$/i, '')
      .replace(/\/saas\/v2$/i, '');
  }

  const environment = origin.toLowerCase().includes('api.mayar.io') || sandboxFlag ? 'sandbox' : 'production';
  return {
    ok: true,
    environment,
    origin,
    hlV2BaseUrl: `${origin}/hl/v2`,
    saasV2BaseUrl: `${origin}/saas/v2`,
    apiVersion: 'hl/v2',
  };
}

export function parseMayarV2ResponseEnvelope(response, body) {
  if (!response || !response.ok) {
    const httpStatus = response?.status || 502;
    const isTransient = httpStatus >= 500 || httpStatus === 429 || httpStatus === 404 || httpStatus === 401;
    return {
      ok: false,
      reason: 'MAYAR_API_HTTP_ERROR',
      httpStatus,
      retryable: isTransient,
    };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      reason: 'MAYAR_API_INVALID_PAYLOAD',
      httpStatus: 502,
      retryable: true,
    };
  }

  if (body.error === true) {
    return {
      ok: false,
      reason: 'MAYAR_API_ENVELOPE_ERROR',
      httpStatus: Number(body.statusCode) || 502,
      retryable: Number(body.statusCode) >= 500 || Number(body.statusCode) === 429,
    };
  }

  if (body.statusCode === undefined || body.statusCode === null || body.statusCode === '') {
    return {
      ok: false,
      reason: 'MAYAR_API_INCOMPLETE_ENVELOPE',
      httpStatus: 502,
      retryable: true,
    };
  }

  const envelopeStatus = Number(body.statusCode);
  if (!Number.isFinite(envelopeStatus) || envelopeStatus < 200 || envelopeStatus >= 300) {
    const isTransient = envelopeStatus >= 500 || envelopeStatus === 429 || envelopeStatus === 404 || envelopeStatus === 401;
    return {
      ok: false,
      reason: 'MAYAR_API_ENVELOPE_ERROR',
      httpStatus: Number.isFinite(envelopeStatus) ? envelopeStatus : 502,
      retryable: isTransient,
    };
  }

  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return {
      ok: false,
      reason: 'MAYAR_API_INCOMPLETE_ENVELOPE',
      httpStatus: 502,
      retryable: true,
    };
  }

  const normalizedMsg = String(body.messages || '').trim().toLowerCase();
  if (normalizedMsg === 'error' || normalizedMsg === 'failed') {
    return {
      ok: false,
      reason: 'MAYAR_API_ENVELOPE_ERROR',
      httpStatus: 502,
      retryable: true,
    };
  }

  return {
    ok: true,
    statusCode: envelopeStatus,
    messages: String(body.messages || ''),
    data: body.data,
  };
}

export async function createMayarInvoiceViaApi({
  orderId,
  planSpec,
  buyerName,
  buyerEmail,
  buyerMobile,
  deviceId,
  redirectUrl,
  expiredAt,
  timeoutMs = 8000,
} = {}) {
  const apiKey = String(process.env.MAYAR_API_KEY || '').trim();
  if (!apiKey) {
    return { created: false, reason: 'MAYAR_API_KEY_NOT_CONFIGURED' };
  }
  if (!planSpec || !Number.isFinite(Number(planSpec.price))) {
    return { created: false, reason: 'INVALID_PLAN' };
  }

  const v2Config = resolveMayarApiV2Config();
  if (!v2Config.ok) {
    return { created: false, reason: v2Config.reason, terminal: true };
  }

  // Wajib menggunakan Mayar Headless API V2: POST /hl/v2/invoices/create
  const endpoint = `${v2Config.hlV2BaseUrl}/invoices/create`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const effectiveTimeoutMs = Math.max(100, Number(process.env.MAYAR_API_TIMEOUT_MS) || timeoutMs);
  const timer = controller ? setTimeout(() => controller.abort(), effectiveTimeoutMs) : null;
  const cleanEmail = String(buyerEmail || 'guru@sekolah.sch.id').trim() || 'guru@sekolah.sch.id';
  const cleanMobile = String(buyerMobile || '081200000000').trim() || '081200000000';
  const defaultExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
      body: JSON.stringify({
        name: String(buyerName || 'Bapak/Ibu Guru').trim() || 'Bapak/Ibu Guru',
        email: cleanEmail,
        mobile: cleanMobile,
        redirectUrl: String(redirectUrl || 'https://asesmerdeka.vercel.app/?payment_status=pending').trim(),
        description: `Lisensi AsesMerdeka (${planSpec.planId})`,
        expiredAt: String(expiredAt || defaultExpiredAt).trim(),
        items: [
          {
            quantity: 1,
            rate: Number(planSpec.price),
            description: `Lisensi AsesMerdeka ${planSpec.planId}`,
          },
        ],
        extraData: {
          noCustomer: cleanMobile,
          idProd: planSpec.planId,
          orderId,
          invoiceId: orderId,
          deviceId: deviceId || '',
          planId: planSpec.planId,
        },
      }),
    });

    const body = await response.json().catch(() => null);
    const envelope = parseMayarV2ResponseEnvelope(response, body);
    if (!envelope.ok) {
      return {
        created: false,
        reason: envelope.reason,
        httpStatus: envelope.httpStatus,
      };
    }

    const data = envelope.data;
    const mayarInvoiceId = String(data.id || '').trim().toUpperCase();
    if (!mayarInvoiceId) {
      return { created: false, reason: 'MAYAR_API_INCOMPLETE_ENVELOPE' };
    }

    const mayarTransactionId = String(data.transactionId || data.transaction_id || '').trim().toUpperCase() || null;
    const rawLink = String(data.link || data.paymentUrl || '').trim();
    const mayarPaymentUrl = rawLink
      ? /^https?:\/\//i.test(rawLink)
        ? rawLink
        : `${v2Config.environment === 'sandbox' ? 'https://mayar.io' : 'https://mayar.id'}/${rawLink.replace(/^\/+/, '')}`
      : null;

    return {
      created: true,
      mayarInvoiceId,
      mayarTransactionId,
      mayarPaymentUrl,
      expiredAt: data.expiredAt ?? null,
      extraData: data.extraData ?? null,
      mayarApiVersion: 'hl/v2',
    };
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    return {
      created: false,
      reason: isTimeout ? 'MAYAR_API_TIMEOUT' : 'MAYAR_API_NETWORK_ERROR',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function buildPaymentOrderKey(invoiceId) {
  return `asesmerdeka:mayar:order:v1:${String(invoiceId || '').trim().toUpperCase()}`;
}

export async function getPaymentOrderRecord(invoiceId) {
  const cleanId = String(invoiceId || '').trim().toUpperCase();
  if (!cleanId) return null;
  const key = buildPaymentOrderKey(cleanId);
  const { configured, value } = await fetchRedisJson(key);
  if (!configured) {
    return localPaymentOrderStore.get(key) || null;
  }
  return value;
}

export async function savePaymentOrderRecord(invoiceId, record, options = {}) {
  const cleanId = String(invoiceId || '').trim().toUpperCase();
  if (!cleanId) return;
  const key = buildPaymentOrderKey(cleanId);
  const { configured } = getRedisCredentials();
  if (!configured) {
    if (options.expectedFenceToken) {
      const existing = localPaymentOrderStore.get(key);
      if (existing?.fenceToken && existing.fenceToken > options.expectedFenceToken) {
        throw new FencedWriteConflictError();
      }
    }
    localPaymentOrderStore.set(key, record);
    return;
  }
  if (options.expectedFenceToken || options.lockKey) {
    const res = await evalRedisScript(
      LUA_FENCED_RECORD_WRITE_SCRIPT,
      [key, options.lockKey || 'asesmerdeka:noop:lock'],
      [options.ownerToken || '', String(options.expectedFenceToken || 0), JSON.stringify(record)]
    );
    const tag = Array.isArray(res.result) ? res.result[0] : 'OK';
    if (tag === 'LOCK_LOST' || tag === 'STALE_FENCE') {
      throw new FencedWriteConflictError();
    }
    return;
  }
  await writeRedisJson(key, record);
}

export function buildWebhookTxKey(txId) {
  return `asesmerdeka:mayar:tx:v1:${String(txId || '').trim().toUpperCase()}`;
}

export async function getWebhookTransactionRecord(txId) {
  const cleanTx = String(txId || '').trim().toUpperCase();
  if (!cleanTx) return null;
  const key = buildWebhookTxKey(cleanTx);
  const { configured, value } = await fetchRedisJson(key);
  if (!configured) {
    return localWebhookTransactionStore.get(key) || null;
  }
  return value;
}

export async function saveWebhookTransactionRecord(txId, record, options = {}) {
  const cleanTx = String(txId || '').trim().toUpperCase();
  if (!cleanTx) return;
  const key = buildWebhookTxKey(cleanTx);
  const { configured } = getRedisCredentials();
  if (!configured) {
    if (options.expectedFenceToken) {
      const existing = localWebhookTransactionStore.get(key);
      if (existing?.fenceToken && existing.fenceToken > options.expectedFenceToken) {
        throw new FencedWriteConflictError();
      }
    }
    localWebhookTransactionStore.set(key, record);
    return;
  }
  if (options.expectedFenceToken || options.lockKey) {
    const res = await evalRedisScript(
      LUA_FENCED_RECORD_WRITE_SCRIPT,
      [key, options.lockKey || 'asesmerdeka:noop:lock'],
      [options.ownerToken || '', String(options.expectedFenceToken || 0), JSON.stringify(record)]
    );
    const tag = Array.isArray(res.result) ? res.result[0] : 'OK';
    if (tag === 'LOCK_LOST' || tag === 'STALE_FENCE') {
      throw new FencedWriteConflictError();
    }
    return;
  }
  await writeRedisJson(key, record);
}

export function buildWebhookEventKey(eventId) {
  return `asesmerdeka:mayar:event:v1:${String(eventId || '').trim().toUpperCase()}`;
}

export async function getWebhookEventRecord(eventId) {
  const cleanEventId = String(eventId || '').trim().toUpperCase();
  if (!cleanEventId) return null;
  const key = buildWebhookEventKey(cleanEventId);
  const { configured, value } = await fetchRedisJson(key);
  if (!configured) {
    return localWebhookEventStore.get(key) || null;
  }
  return value;
}

export async function saveWebhookEventRecord(eventId, record, options = {}) {
  const cleanEventId = String(eventId || '').trim().toUpperCase();
  if (!cleanEventId) return;
  const key = buildWebhookEventKey(cleanEventId);
  const { configured } = getRedisCredentials();
  if (!configured) {
    if (options.expectedFenceToken) {
      const existing = localWebhookEventStore.get(key);
      if (existing?.fenceToken && existing.fenceToken > options.expectedFenceToken) {
        throw new FencedWriteConflictError();
      }
    }
    localWebhookEventStore.set(key, record);
    return;
  }
  if (options.expectedFenceToken || options.lockKey) {
    const res = await evalRedisScript(
      LUA_FENCED_RECORD_WRITE_SCRIPT,
      [key, options.lockKey || 'asesmerdeka:noop:lock'],
      [options.ownerToken || '', String(options.expectedFenceToken || 0), JSON.stringify(record)]
    );
    const tag = Array.isArray(res.result) ? res.result[0] : 'OK';
    if (tag === 'LOCK_LOST' || tag === 'STALE_FENCE') {
      throw new FencedWriteConflictError();
    }
    return;
  }
  await writeRedisJson(key, record);
}

export function generateOrderLicenseCodeServer(planType, seedId) {
  const cleanType = String(planType || '').trim().toLowerCase();
  const prefix =
    cleanType === 'sekolah_pro'
      ? 'SP26'
      : cleanType === 'sekolah'
      ? 'SK26'
      : cleanType === 'pro'
      ? 'GP26'
      : 'GM26';
  const cleanSeed = String(seedId || 'DEFAULT').trim().toUpperCase();
  const cipher1 = computeHash36(`ASM_ORD_SEED_V1:${prefix}:${cleanSeed}`)
    .replace(/[^A-Z0-9]/g, '')
    .padStart(4, 'A')
    .slice(0, 4);
  const cipher2 = computeHash36(`ASM_ENC_C2_V2:${prefix}:${cipher1}:4B3A2918_KEY`)
    .padStart(4, '9')
    .slice(0, 4);
  const sig = computeHash36(`ASM_HMAC_SIG_V2:${prefix}-${cipher1}-${cipher2}:ASESMERDEKA_2026_MASTER`)
    .padStart(4, 'X')
    .slice(0, 4);
  return `ASM-${prefix}-${cipher1}-${cipher2}-${sig}`;
}

export async function getVerifiedTxRecordForOrder(txId, invoiceId, orderRecord = null) {
  const cleanTxId = String(txId || '').trim().toUpperCase();
  const cleanInv = String(invoiceId || '').trim().toUpperCase();

  if (cleanTxId) {
    const directTx = await getWebhookTransactionRecord(cleanTxId);
    if (directTx) return directTx;
  }

  if (cleanInv) {
    const order = orderRecord || (await getPaymentOrderRecord(cleanInv));
    if (order?.transactionId) {
      const cleanOrderTxId = String(order.transactionId).trim().toUpperCase();
      if (cleanOrderTxId && cleanOrderTxId !== cleanTxId) {
        const orderTx = await getWebhookTransactionRecord(cleanOrderTxId);
        if (orderTx) return orderTx;
      }
    }
    if (order && order.status === 'paid' && (order.transactionId || order.paidAmount || order.amount)) {
      return {
        transactionId: order.transactionId || cleanTxId,
        webhookEventId: order.webhookEventId || null,
        orderId: order.orderId || order.invoiceId || cleanInv,
        invoiceId: order.invoiceId || cleanInv,
        licenseCode: order.licenseCode || null,
        planId: order.planId || null,
        planType: order.planType || null,
        amount: Number(order.paidAmount ?? order.amount ?? order.baseAmount),
        deviceId: order.deviceId || null,
        customerEmail: order.buyerEmail || null,
        status: 'paid',
        verifiedBy: order.verifiedBy || 'persistent_order_registry',
      };
    }

    const { configured } = getRedisCredentials();
    if (!configured) {
      for (const rec of localWebhookTransactionStore.values()) {
        if (!rec) continue;
        const recInv = String(rec.invoiceId || rec.orderId || '').trim().toUpperCase();
        if (recInv === cleanInv) {
          return rec;
        }
      }
    }
  }
  return null;
}

const REVOKED_REDIS_KEY = 'asesmerdeka:admin:revoked_licenses:v1';
export const localRevokedLicensesSet = new Set();

export async function isLicenseRevokedInRedis(cleanCode) {
  const code = normalizeLicenseCode(cleanCode);
  if (!code) return false;

  if (localRevokedLicensesSet.has(code)) return true;
  const localRegDeleted = localLicenseRegistryStore.some((l) => l.code === code && l.deleted);
  if (localRegDeleted) return true;

  const { configured } = getRedisCredentials();
  if (!configured) {
    return false;
  }

  // 1. Cek daftar hitam eksplisit (REVOKED_REDIS_KEY) — fail closed on Redis outage
  const revokedRes = await fetchRedisJson(REVOKED_REDIS_KEY);
  if (Array.isArray(revokedRes.value) && revokedRes.value.includes(code)) {
    return true;
  }

  // 2. Cek registri Cloud Redis (REGISTRY_REDIS_KEY) jika ditandai deleted: true — fail closed on Redis outage
  const regRes = await fetchRedisJson(REGISTRY_REDIS_KEY);
  if (Array.isArray(regRes.value)) {
    const item = regRes.value.find((l) => l && l.code === code);
    if (item && item.deleted) {
      return true;
    }
  }

  return false;
}

export async function revokeLicenseInRedis(cleanCode) {
  const code = normalizeLicenseCode(cleanCode);
  if (!code) return;

  localRevokedLicensesSet.add(code);

  const { configured } = getRedisCredentials();
  if (!configured) return;

  const existingRes = await fetchRedisJson(REVOKED_REDIS_KEY);
  const list = Array.isArray(existingRes.value) ? [...existingRes.value] : [];
  if (!list.includes(code)) {
    list.push(code);
  }
  await writeRedisJson(REVOKED_REDIS_KEY, list);
}

export async function checkAndClaimServerSeat(cleanCode, deviceId, maxSeats, options = {}) {
  const cleanDev = String(deviceId || '').trim().toUpperCase();
  const teacherPinOrId = String(options.teacherPin || options.teacherId || '').trim();

  return await withDistributedLock(
    [`seat:${cleanCode}`],
    async ({ lockKeys, ownerToken, fenceToken }) => {
      const existing = await getSeatRecordFromRedis(cleanCode);

      if (existing) {
        if (isLicenseExpired(existing.expiresAt)) {
          return {
            allowed: false,
            expired: true,
            lifecycleState: 'expired',
            expiresAt: existing.expiresAt,
            usedSeats: getEffectiveUsedSeatCount(existing),
            maxSeats: Number(existing.maxSeats) || maxSeats,
            message: 'Masa berlaku kode lisensi telah berakhir. Silakan lakukan perpanjangan (renewal) lisensi.',
          };
        }
        if (existing.lifecycleState === 'suspended' || existing.suspended) {
          return {
            allowed: false,
            suspended: true,
            lifecycleState: 'suspended',
            usedSeats: getEffectiveUsedSeatCount(existing),
            maxSeats: Number(existing.maxSeats) || maxSeats,
            message: 'Kode lisensi ini sedang ditangguhkan oleh Administrator.',
          };
        }
        if (
          existing.lifecycleState === 'pending_payment' ||
          existing.lifecycleState === 'payment_failed'
        ) {
          return {
            allowed: false,
            paymentUnverified: true,
            lifecycleState: existing.lifecycleState,
            usedSeats: getEffectiveUsedSeatCount(existing),
            maxSeats: Number(existing.maxSeats) || maxSeats,
            message: 'Pembayaran untuk kode lisensi ini belum selesai atau gagal.',
          };
        }
      }

      const effectiveMaxSeats = Number(existing?.maxSeats) || Number(maxSeats) || 2;
      const isSchool = isSchoolLicenseCodeServer(cleanCode, effectiveMaxSeats, existing);
      const currentSeatRevision = Number(existing?.seatRevision) || 0;
      const primaryLockKey = lockKeys?.[0] || 'asesmerdeka:noop:lock';

      if (!cleanDev && !teacherPinOrId) {
        return { allowed: true, usedSeats: Math.max(1, getEffectiveUsedSeatCount(existing)), maxSeats: effectiveMaxSeats };
      }

      // Jalur Lisensi Kolektif Sekolah: maks 25 Kursi Guru aktif, tiap guru maks 2 perangkat (Laptop + HP)
      if (isSchool) {
        const teacherSeats = existing?.teacherSeats
          ? JSON.parse(JSON.stringify(existing.teacherSeats))
          : {};

        // Migrasi aman jika record lama memiliki devices[] tanpa teacherSeats
        if (
          Object.keys(teacherSeats).length === 0 &&
          Array.isArray(existing?.devices) &&
          existing.devices.length > 0
        ) {
          const nowIso = new Date().toISOString();
          for (const oldDev of existing.devices) {
            const legacyKey = `LEGACY_DEV_${oldDev}`;
            teacherSeats[legacyKey] = {
              teacherKey: legacyKey,
              teacherLabel: legacyKey,
              status: 'active',
              devices: [oldDev],
              maxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
              claimedAt: nowIso,
              updatedAt: nowIso,
            };
          }
        }

        let resolvedKey = teacherPinOrId ? normalizeTeacherKeyServer(teacherPinOrId, cleanDev) : '';
        if (!resolvedKey && cleanDev) {
          for (const k of Object.keys(teacherSeats)) {
            if (teacherSeats[k]?.devices?.includes(cleanDev)) {
              resolvedKey = k;
              break;
            }
          }
          if (!resolvedKey) {
            resolvedKey = normalizeTeacherKeyServer('', cleanDev);
          }
        }

        const activeTeachers = Object.values(teacherSeats).filter((t) => t && t.status === 'active');
        const existingTeacher = teacherSeats[resolvedKey];
        const nowIso = new Date().toISOString();

        if (existingTeacher) {
          if (existingTeacher.status === 'disabled') {
            return {
              allowed: false,
              teacherSeatDisabled: true,
              teacherKey: resolvedKey,
              usedSeats: activeTeachers.length,
              maxSeats: effectiveMaxSeats,
              devices: Array.isArray(existing?.devices) ? existing.devices : [],
              message: `Kursi guru "${resolvedKey}" telah dinonaktifkan oleh Admin Sekolah. Hubungi Admin Sekolah untuk aktivasi kembali.`,
            };
          }

          if (cleanDev && existingTeacher.devices.includes(cleanDev)) {
            const unionDevices = getActiveTeacherDevicesUnionServer(teacherSeats);
            return {
              allowed: true,
              usedSeats: activeTeachers.length,
              maxSeats: effectiveMaxSeats,
              devices: unionDevices,
              teacherKey: resolvedKey,
              teacherUsedDevices: existingTeacher.devices.length,
              teacherMaxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
              lifecycleState: 'active',
              expiresAt: existing?.expiresAt ?? null,
            };
          }

          if (existingTeacher.devices.length >= MAX_DEVICES_PER_SCHOOL_TEACHER) {
            return {
              allowed: false,
              seatLimitExceeded: true,
              teacherDeviceLimitExceeded: true,
              teacherKey: resolvedKey,
              teacherUsedDevices: existingTeacher.devices.length,
              teacherMaxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
              usedSeats: activeTeachers.length,
              maxSeats: effectiveMaxSeats,
              devices: Array.isArray(existing?.devices) ? existing.devices : [],
              message: `Batas maksimal ${MAX_DEVICES_PER_SCHOOL_TEACHER} perangkat (1 Laptop + 1 HP) untuk guru "${resolvedKey}" telah penuh (${existingTeacher.devices.length}/${MAX_DEVICES_PER_SCHOOL_TEACHER}).`,
            };
          }

          if (cleanDev) {
            existingTeacher.devices.push(cleanDev);
          }
          existingTeacher.updatedAt = nowIso;
          const unionDevices = getActiveTeacherDevicesUnionServer(teacherSeats);

          const updatedRecord = {
            ...(existing || {}),
            licenseCode: cleanCode,
            planType: existing?.planType || 'sekolah',
            maxSeats: effectiveMaxSeats,
            maxDevicesPerTeacher: MAX_DEVICES_PER_SCHOOL_TEACHER,
            devices: unionDevices,
            teacherSeats,
            usedSeats: activeTeachers.length,
            lifecycleState: 'active',
            seatRevision: currentSeatRevision + 1,
            fenceToken,
            updatedAt: nowIso,
          };
          const casRes = await atomicSaveSeatRecordWithCas({
            cleanCode,
            lockKey: primaryLockKey,
            ownerToken,
            expectedFenceToken: fenceToken,
            expectedSeatRevision: currentSeatRevision,
            maxSeatsLimit: effectiveMaxSeats,
            nextRecord: updatedRecord,
          });
          if (!casRes.ok) {
            if (casRes.reason === 'LOCK_LOST' || casRes.reason === 'STALE_FENCE') {
              throw new FencedWriteConflictError();
            }
            return {
              allowed: false,
              conflict: true,
              reason: 'CONCURRENT_SEAT_CONFLICT',
              usedSeats: getEffectiveUsedSeatCount(existing),
              maxSeats: effectiveMaxSeats,
              message: 'Terjadi bentrokan klaim kursi secara bersamaan. Silakan muat ulang status lisensi.',
            };
          }

          await autoRegisterLicenseInAdminRegistry({
            code: cleanCode,
            maxSeats: effectiveMaxSeats,
            deviceId: cleanDev,
            teacherSeats,
            usedSeats: activeTeachers.length,
            lifecycleState: 'active',
            expiresAt: existing?.expiresAt ?? null,
          });

          return {
            allowed: true,
            usedSeats: activeTeachers.length,
            maxSeats: effectiveMaxSeats,
            devices: unionDevices,
            teacherKey: resolvedKey,
            teacherUsedDevices: existingTeacher.devices.length,
            teacherMaxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
            lifecycleState: 'active',
            expiresAt: existing?.expiresAt ?? null,
          };
        }

        // Guru baru pada lisensi sekolah
        if (activeTeachers.length >= effectiveMaxSeats) {
          return {
            allowed: false,
            seatLimitExceeded: true,
            usedSeats: activeTeachers.length,
            maxSeats: effectiveMaxSeats,
            devices: Array.isArray(existing?.devices) ? existing.devices : [],
            message: `Aktivasi Ditolak! Kuota ${effectiveMaxSeats} kursi guru pada Lisensi Kolektif Sekolah ini sudah penuh (${activeTeachers.length}/${effectiveMaxSeats} guru).`,
          };
        }

        teacherSeats[resolvedKey] = {
          teacherKey: resolvedKey,
          teacherLabel: teacherPinOrId || resolvedKey,
          status: 'active',
          devices: cleanDev ? [cleanDev] : [],
          maxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
          claimedAt: nowIso,
          updatedAt: nowIso,
        };

        const nextActiveCount = activeTeachers.length + 1;
        const unionDevices = getActiveTeacherDevicesUnionServer(teacherSeats);
        const updatedRecord = {
          ...(existing || {}),
          licenseCode: cleanCode,
          planType: existing?.planType || 'sekolah',
          maxSeats: effectiveMaxSeats,
          maxDevicesPerTeacher: MAX_DEVICES_PER_SCHOOL_TEACHER,
          devices: unionDevices,
          teacherSeats,
          usedSeats: nextActiveCount,
          lifecycleState: 'active',
          seatRevision: currentSeatRevision + 1,
          fenceToken,
          updatedAt: nowIso,
        };
        const casRes = await atomicSaveSeatRecordWithCas({
          cleanCode,
          lockKey: primaryLockKey,
          ownerToken,
          expectedFenceToken: fenceToken,
          expectedSeatRevision: currentSeatRevision,
          maxSeatsLimit: effectiveMaxSeats,
          nextRecord: updatedRecord,
        });
        if (!casRes.ok) {
          if (casRes.reason === 'LOCK_LOST' || casRes.reason === 'STALE_FENCE') {
            throw new FencedWriteConflictError();
          }
          return {
            allowed: false,
            seatLimitExceeded: casRes.reason === 'QUOTA_EXCEEDED',
            conflict: true,
            reason: casRes.reason === 'QUOTA_EXCEEDED' ? 'SEAT_LIMIT_EXCEEDED' : 'CONCURRENT_SEAT_CONFLICT',
            usedSeats: activeTeachers.length,
            maxSeats: effectiveMaxSeats,
            message: 'Kuota kursi guru berubah saat diproses bersamaan. Aktivasi dibatalkan agar kuota tidak terlampaui.',
          };
        }

        await autoRegisterLicenseInAdminRegistry({
          code: cleanCode,
          maxSeats: effectiveMaxSeats,
          deviceId: cleanDev,
          teacherSeats,
          usedSeats: nextActiveCount,
          lifecycleState: 'active',
          expiresAt: existing?.expiresAt ?? null,
        });

        return {
          allowed: true,
          usedSeats: nextActiveCount,
          maxSeats: effectiveMaxSeats,
          devices: unionDevices,
          teacherKey: resolvedKey,
          teacherUsedDevices: cleanDev ? 1 : 0,
          teacherMaxDevices: MAX_DEVICES_PER_SCHOOL_TEACHER,
          lifecycleState: 'active',
          expiresAt: existing?.expiresAt ?? null,
        };
      }

      // Jalur Lisensi Individu (1 atau 2 perangkat)
      const devices = Array.isArray(existing?.devices) ? [...existing.devices] : [];

      if (devices.includes(cleanDev)) {
        await autoRegisterLicenseInAdminRegistry({
          code: cleanCode,
          maxSeats: effectiveMaxSeats,
          deviceId: cleanDev,
          lifecycleState: 'active',
          expiresAt: existing?.expiresAt ?? null,
        });
        return {
          allowed: true,
          usedSeats: devices.length,
          maxSeats: effectiveMaxSeats,
          devices,
          lifecycleState: 'active',
          expiresAt: existing?.expiresAt ?? null,
        };
      }

      if (devices.length >= effectiveMaxSeats) {
        return {
          allowed: false,
          seatLimitExceeded: true,
          usedSeats: devices.length,
          maxSeats: effectiveMaxSeats,
          devices,
          message: `Aktivasi Ditolak! Kode lisensi ini telah mencapai batas maksimal perangkat (${devices.length}/${effectiveMaxSeats} perangkat: 1 Laptop + 1 HP) dan sudah terkunci pada perangkat pemilik pertama. Kode tidak dapat digunakan di perangkat ke-${devices.length + 1}.`,
        };
      }

      devices.push(cleanDev);
      const nowIso = new Date().toISOString();
      const updatedRecord = {
        ...(existing || {}),
        licenseCode: cleanCode,
        maxSeats: effectiveMaxSeats,
        devices,
        usedSeats: devices.length,
        lifecycleState: 'active',
        seatRevision: currentSeatRevision + 1,
        fenceToken,
        updatedAt: nowIso,
      };
      const casRes = await atomicSaveSeatRecordWithCas({
        cleanCode,
        lockKey: primaryLockKey,
        ownerToken,
        expectedFenceToken: fenceToken,
        expectedSeatRevision: currentSeatRevision,
        maxSeatsLimit: effectiveMaxSeats,
        nextRecord: updatedRecord,
      });
      if (!casRes.ok) {
        if (casRes.reason === 'LOCK_LOST' || casRes.reason === 'STALE_FENCE') {
          throw new FencedWriteConflictError();
        }
        return {
          allowed: false,
          seatLimitExceeded: casRes.reason === 'QUOTA_EXCEEDED',
          conflict: true,
          reason: casRes.reason === 'QUOTA_EXCEEDED' ? 'SEAT_LIMIT_EXCEEDED' : 'CONCURRENT_SEAT_CONFLICT',
          usedSeats: devices.length - 1,
          maxSeats: effectiveMaxSeats,
          message: 'Klaim perangkat gagal karena perubahan bersamaan di server. Silakan coba lagi.',
        };
      }

      await autoRegisterLicenseInAdminRegistry({
        code: cleanCode,
        maxSeats: effectiveMaxSeats,
        deviceId: cleanDev,
        lifecycleState: 'active',
        expiresAt: existing?.expiresAt ?? null,
      });

      return {
        allowed: true,
        usedSeats: devices.length,
        maxSeats: effectiveMaxSeats,
        devices,
        lifecycleState: 'active',
        expiresAt: existing?.expiresAt ?? null,
      };
    },
    { ttlMs: options.ttlMs, waitTimeoutMs: options.waitTimeoutMs }
  );
}

export async function autoRegisterLicenseInAdminRegistry({
  code,
  maxSeats,
  deviceId,
  label,
  planType,
  tier,
  teacherSeats,
  usedSeats: explicitUsedSeats,
  lifecycleState,
  expiresAt,
  transactionId,
}) {
  const cleanCode = normalizeLicenseCode(code);
  if (!cleanCode) return;

  const derivedPlanType =
    planType ||
    (cleanCode.startsWith('ASM-SP26-')
      ? 'sekolah_pro'
      : cleanCode.startsWith('ASM-SK26-') || maxSeats >= 25
      ? 'sekolah'
      : cleanCode.startsWith('ASM-GP26-')
      ? 'pro'
      : cleanCode.startsWith('ASM-SL26-')
      ? 'solo'
      : 'individu');

  const derivedTier =
    tier ||
    (derivedPlanType === 'sekolah_pro'
      ? 'sekolah_pro'
      : derivedPlanType === 'sekolah'
      ? 'sekolah'
      : derivedPlanType === 'pro'
      ? 'pro'
      : 'guru');

  const derivedMaxSeats = Number(maxSeats) || (derivedPlanType.includes('sekolah') ? 25 : 2);
  const nowIso = new Date().toISOString();

  function applyRegistryUpdate(list) {
    const idx = list.findIndex((l) => l.code === cleanCode);
    if (idx >= 0) {
      const target = list[idx];
      target.updatedAt = nowIso;
      if (label) target.label = label;
      if (planType) target.planType = planType;
      if (tier) target.tier = tier;
      if (expiresAt !== undefined) target.expiresAt = expiresAt;
      if (transactionId) target.transactionId = transactionId;
      if (teacherSeats) target.teacherSeats = teacherSeats;
      if (deviceId) {
        if (!Array.isArray(target.devices)) target.devices = [];
        if (!target.devices.includes(deviceId)) {
          target.devices.push(deviceId);
        }
      }
      target.usedSeats =
        typeof explicitUsedSeats === 'number'
          ? explicitUsedSeats
          : teacherSeats
          ? Object.values(teacherSeats).filter((t) => t && t.status === 'active').length
          : Array.isArray(target.devices)
          ? target.devices.length
          : 0;
      target.status = target.usedSeats > 0 ? 'aktif' : 'belum_aktif';
      target.lifecycleState = lifecycleState || (target.usedSeats > 0 ? 'active' : target.lifecycleState || 'paid');
    } else {
      const initialUsed =
        typeof explicitUsedSeats === 'number' ? explicitUsedSeats : deviceId ? 1 : 0;
      list.unshift({
        code: cleanCode,
        label: label || `Aktivasi Mandiri (${deviceId || 'Perangkat'})`,
        planType: derivedPlanType,
        tier: derivedTier,
        maxSeats: derivedMaxSeats,
        createdAt: nowIso,
        updatedAt: nowIso,
        usedSeats: initialUsed,
        devices: deviceId ? [deviceId] : [],
        ...(teacherSeats ? { teacherSeats } : {}),
        status: initialUsed > 0 ? 'aktif' : 'belum_aktif',
        lifecycleState: lifecycleState || (initialUsed > 0 ? 'active' : 'paid'),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(transactionId ? { transactionId } : {}),
      });
    }
  }

  const { configured } = getRedisCredentials();
  if (!configured) {
    applyRegistryUpdate(localLicenseRegistryStore);
    return;
  }

  const computedUsed =
    typeof explicitUsedSeats === 'number'
      ? explicitUsedSeats
      : teacherSeats
      ? Object.values(teacherSeats).filter((t) => t && t.status === 'active').length
      : deviceId
      ? 1
      : 0;
  const resolvedLifecycle = lifecycleState || (computedUsed > 0 ? 'active' : 'paid');
  const patchPayload = {
    code: cleanCode,
    updatedAt: nowIso,
    label: label || '',
    planType: planType || '',
    tier: tier || '',
    hasExpiresAt: expiresAt !== undefined,
    expiresAt: expiresAt !== undefined ? expiresAt : null,
    transactionId: transactionId || '',
    ...(teacherSeats ? { teacherSeats } : {}),
    devices: deviceId ? [deviceId] : [],
    usedSeats: computedUsed,
    status: computedUsed > 0 ? 'aktif' : 'belum_aktif',
    lifecycleState: resolvedLifecycle,
    newEntry: {
      code: cleanCode,
      label: label || `Aktivasi Mandiri (${deviceId || 'Perangkat'})`,
      planType: derivedPlanType,
      tier: derivedTier,
      maxSeats: derivedMaxSeats,
      createdAt: nowIso,
      updatedAt: nowIso,
      usedSeats: computedUsed,
      devices: deviceId ? [deviceId] : [],
      ...(teacherSeats ? { teacherSeats } : {}),
      status: computedUsed > 0 ? 'aktif' : 'belum_aktif',
      lifecycleState: resolvedLifecycle,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(transactionId ? { transactionId } : {}),
    },
  };

  await evalRedisScript(LUA_UPSERT_ADMIN_REGISTRY_SCRIPT, [REGISTRY_REDIS_KEY], [JSON.stringify(patchPayload)]);
}

export function verifyInternalSerialOrDeviceCode(cleanCode, deviceId) {
  if (!cleanCode) return null;

  // Tolak permanen seluruh kode lama (PRO-MERDEKA-... atau ASES-...)
  if (cleanCode.startsWith('PRO-MERDEKA-') || cleanCode.startsWith('ASES-')) {
    return null;
  }

  if (deviceId) {
    const cleanDev = String(deviceId).trim().toUpperCase();
    const expectedDevCheck = computeHash36(`ASESMERDEKA-PRO-DEVICE:${cleanDev}:2026`).slice(0, 6);
    if (cleanCode === `ASM-DV26-${expectedDevCheck}`) {
      return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 1 };
    }
  }

  const parts = cleanCode.split('-');

  // Format Terenkripsi Baru: ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG>
  // Contoh: ASM-GM26-1TAT-1QBM-133R (Tidak menampilkan nomor urut MAYAR001 agar tidak bisa ditebak)
  if (parts.length === 5 && parts[0] === 'ASM') {
    const prefix = parts[1];
    const cipher1 = parts[2];
    const cipher2 = parts[3];
    const providedSig = parts[4];

    if (
      ['GM26', 'SK26', 'GP26', 'SP26', 'SL26'].includes(prefix) &&
      cipher1.length === 4 &&
      cipher2.length === 4 &&
      providedSig.length === 4
    ) {
      const expectedCipher2 = computeHash36(`ASM_ENC_C2_V2:${prefix}:${cipher1}:4B3A2918_KEY`)
        .padStart(4, '9')
        .slice(0, 4);
      const expectedSig = computeHash36(
        `ASM_HMAC_SIG_V2:${prefix}-${cipher1}-${cipher2}:ASESMERDEKA_2026_MASTER`
      )
        .padStart(4, 'X')
        .slice(0, 4);

      if (cipher2 === expectedCipher2 && providedSig === expectedSig) {
        if (prefix === 'SK26') {
          return { valid: true, planType: 'sekolah', tier: 'sekolah', maxSeats: 25 };
        }
        if (prefix === 'SP26') {
          return { valid: true, planType: 'sekolah', tier: 'sekolah_pro', maxSeats: 25 };
        }
        if (prefix === 'GP26') {
          return { valid: true, planType: 'individu', tier: 'pro', maxSeats: 2 };
        }
        if (prefix === 'SL26') {
          return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 1 };
        }
        return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 2 };
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawCode = normalizeLicenseCode(body.licenseCode || '');
    const _deviceId = (body.deviceId || '').trim();
    const teacherPin = String(body.teacherPin || body.teacherId || '').trim();
    const action = String(body.action || 'verify').trim().toLowerCase();

    // Action: create_payment_order — Server menetapkan paket, harga resmi, & invoiceId awal ('pending_payment')
    if (action === 'create_payment_order') {
      const planId = String(body.planId || '').trim();
      const planSpec = SERVER_PLAN_CATALOG[planId];
      if (!planSpec) {
        return res.status(400).json({
          ok: false,
          reason: 'INVALID_PLAN',
          message: `Paket lisensi '${planId}' tidak dikenal.`,
        });
      }

      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const generatedInv = `INV-${datePart}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const invoiceId = String(body.invoiceId || body.orderId || generatedInv).trim().toUpperCase();
      const requestedMayarInvoiceId = String(body.mayarInvoiceId || '').trim().toUpperCase();

      return await withDistributedLock([`order:${invoiceId}`], async ({ lockKeys, ownerToken, fenceToken }) => {
        const existingOrder = await getPaymentOrderRecord(invoiceId);

        if (existingOrder && existingOrder.planId && existingOrder.planId !== planSpec.planId) {
          return res.status(409).json({
            ok: false,
            reason: 'ORDER_PLAN_CONFLICT',
            message: 'Order ID sudah terdaftar untuk paket berbeda.',
          });
        }

        if (
          existingOrder?.mayarInvoiceId &&
          requestedMayarInvoiceId &&
          String(existingOrder.mayarInvoiceId).trim().toUpperCase() !== requestedMayarInvoiceId
        ) {
          return res.status(409).json({
            ok: false,
            reason: 'ORDER_INVOICE_CONFLICT',
            message: 'Order ID sudah terikat pada Mayar Invoice ID lain.',
          });
        }

        let resolvedMayarInvoiceId =
          (existingOrder?.mayarInvoiceId ? String(existingOrder.mayarInvoiceId).trim().toUpperCase() : '') ||
          requestedMayarInvoiceId ||
          '';
        let resolvedMayarTransactionId =
          (existingOrder?.mayarTransactionId
            ? String(existingOrder.mayarTransactionId).trim().toUpperCase()
            : '') || '';
        let mayarApiVersion = existingOrder?.mayarApiVersion || (resolvedMayarInvoiceId ? 'hl/v2' : null);
        let mayarPaymentUrl = existingOrder?.mayarPaymentUrl || null;
        let mayarExpiredAt = existingOrder?.expiredAt || null;
        let mayarInvoiceResult = null;

        if (!resolvedMayarInvoiceId && body.createMayarInvoice === true && !existingOrder?.status?.includes('paid')) {
          mayarInvoiceResult = await createMayarInvoiceViaApi({
            orderId: invoiceId,
            planSpec,
            buyerName: body.buyerName,
            buyerEmail: body.buyerEmail,
            buyerMobile: body.buyerMobile,
            deviceId: String(body.deviceId || '').trim().toUpperCase(),
            redirectUrl: body.redirectUrl,
          });
          if (mayarInvoiceResult.created && mayarInvoiceResult.mayarInvoiceId) {
            resolvedMayarInvoiceId = mayarInvoiceResult.mayarInvoiceId;
            resolvedMayarTransactionId = mayarInvoiceResult.mayarTransactionId || resolvedMayarTransactionId || '';
            mayarApiVersion = mayarInvoiceResult.mayarApiVersion || 'hl/v2';
            mayarPaymentUrl = mayarInvoiceResult.paymentUrl || null;
            mayarExpiredAt = mayarInvoiceResult.expiredAt || mayarExpiredAt;
          }
        }

        const orderRecord =
          existingOrder && existingOrder.status === 'paid'
            ? {
                ...existingOrder,
                orderId: existingOrder.orderId || invoiceId,
                invoiceId,
                mayarInvoiceId: resolvedMayarInvoiceId || null,
                mayarTransactionId: resolvedMayarTransactionId || existingOrder.mayarTransactionId || null,
                mayarApiVersion,
                mayarPaymentUrl,
                expiredAt: mayarExpiredAt || existingOrder.expiredAt || null,
                planId: existingOrder.planId || planSpec.planId,
                planType: existingOrder.planType || planSpec.planType,
                tier: existingOrder.tier || planSpec.tier,
                baseAmount: existingOrder.baseAmount || planSpec.price,
                maxSeats: existingOrder.maxSeats || planSpec.maxSeats,
                deviceId: existingOrder.deviceId || String(body.deviceId || '').trim().toUpperCase() || null,
                buyerName: existingOrder.buyerName || String(body.buyerName || '').trim() || 'Bapak/Ibu Guru',
                buyerEmail: existingOrder.buyerEmail || String(body.buyerEmail || '').trim().toLowerCase() || null,
                status: 'paid',
                fenceToken: Math.max(Number(existingOrder.fenceToken) || 0, fenceToken || 0),
                updatedAt: now.toISOString(),
              }
            : {
                orderId: invoiceId,
                invoiceId,
                mayarInvoiceId: resolvedMayarInvoiceId || null,
                mayarTransactionId: resolvedMayarTransactionId || null,
                mayarApiVersion,
                mayarPaymentUrl,
                expiredAt: mayarExpiredAt,
                planId: planSpec.planId,
                planType: planSpec.planType,
                tier: planSpec.tier,
                baseAmount: planSpec.price,
                maxSeats: planSpec.maxSeats,
                deviceId: String(body.deviceId || '').trim().toUpperCase() || null,
                buyerName: String(body.buyerName || '').trim() || 'Bapak/Ibu Guru',
                buyerEmail: String(body.buyerEmail || '').trim().toLowerCase() || null,
                status: 'pending_payment',
                currency: 'IDR',
                fenceToken: fenceToken || 0,
                createdAt: existingOrder?.createdAt || now.toISOString(),
                updatedAt: now.toISOString(),
              };
        await savePaymentOrderRecord(invoiceId, orderRecord, {
          lockKey: lockKeys?.[0] || 'asesmerdeka:noop:lock',
          ownerToken,
          expectedFenceToken: fenceToken,
        });
        if (resolvedMayarInvoiceId) {
          await saveMayarInvoiceIndex(resolvedMayarInvoiceId, invoiceId, orderRecord.licenseCode || null);
        }
        return res.status(200).json({
          ok: true,
          mayarInvoiceId: orderRecord.mayarInvoiceId || null,
          mayarTransactionId: orderRecord.mayarTransactionId || null,
          mayarApiVersion: orderRecord.mayarApiVersion || null,
          mayarPaymentUrl: orderRecord.mayarPaymentUrl || null,
          mayarInvoiceCreated: Boolean(mayarInvoiceResult?.created),
          mayarInvoiceError: mayarInvoiceResult && !mayarInvoiceResult.created ? mayarInvoiceResult.reason : undefined,
          order: orderRecord,
        });
      });
    }

    // Action: verify_payment_order — Otorisasi status paid HANYA dari catatan webhook/API server Mayar.id
    if (action === 'verify_payment_order') {
      const invoiceId = String(body.invoiceId || body.orderId || '').trim().toUpperCase();
      const requestedTxId = String(body.transactionId || '').trim().toUpperCase();
      const requestedDeviceId = String(body.deviceId || '').trim().toUpperCase();
      const requestedEmail = String(body.buyerEmail || '').trim().toLowerCase();
      const requestedPlanId = String(body.planId || '').trim();

      const order = invoiceId ? await getPaymentOrderRecord(invoiceId) : null;
      if (order && requestedPlanId && order.planId && order.planId !== requestedPlanId) {
        return res.status(403).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'PLAN_TAMPERED',
          message: 'Jenis paket tidak sesuai dengan pesanan resmi di server.',
        });
      }

      const effectiveTxId = requestedTxId || String(order?.transactionId || '').trim().toUpperCase();
      const txRecord = await getVerifiedTxRecordForOrder(effectiveTxId, invoiceId, order);
      if (!txRecord) {
        return res.status(200).json({
          ok: false,
          verified: false,
          activated: false,
          status: order?.status || 'pending_payment',
          message: 'Pembayaran belum terkonfirmasi oleh server Mayar.id.',
        });
      }

      if (txRecord.status !== 'paid') {
        return res.status(200).json({
          ok: false,
          verified: false,
          activated: false,
          status: txRecord.status || 'pending_payment',
          message: `Transaksi berada pada status '${txRecord.status || 'pending_payment'}'.`,
        });
      }

      const requestedPlanSpec = requestedPlanId ? SERVER_PLAN_CATALOG[requestedPlanId] : null;
      if (requestedPlanId && !requestedPlanSpec) {
        return res.status(400).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'INVALID_PLAN',
          message: 'Paket pada pesanan tidak valid.',
        });
      }
      if (requestedPlanSpec && txRecord.planType && txRecord.planType !== requestedPlanSpec.planType) {
        return res.status(403).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'PLAN_TAMPERED',
          message: 'Jenis paket pada permintaan tidak sesuai dengan catatan transaksi terverifikasi.',
        });
      }

      const inferredPlanId =
        order?.planId ||
        requestedPlanId ||
        txRecord.planId ||
        (txRecord.planType === 'sekolah'
          ? 'pro_sekolah'
          : txRecord.planType === 'sekolah_pro'
          ? 'sekolah_pro'
          : txRecord.planType === 'pro'
          ? 'pro_ai'
          : 'pro_individu');
      const planSpec = SERVER_PLAN_CATALOG[inferredPlanId];
      if (!planSpec) {
        return res.status(400).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'INVALID_PLAN',
          message: 'Paket pada pesanan tidak valid.',
        });
      }

      if (Number(txRecord.amount) < planSpec.price) {
        return res.status(400).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'AMOUNT_MISMATCH',
          message: `Nominal transaksi (${txRecord.amount}) kurang dari harga resmi paket (${planSpec.price}).`,
        });
      }

      const txInvoice = String(txRecord.invoiceId || txRecord.orderId || '').trim().toUpperCase();
      const txDevice = String(txRecord.deviceId || '').trim().toUpperCase();
      const txEmail = String(txRecord.customerEmail || '').trim().toLowerCase();
      const txLicense = normalizeLicenseCode(txRecord.licenseCode || '');

      if (
        (txInvoice && invoiceId && txInvoice !== invoiceId) ||
        (txDevice && requestedDeviceId && txDevice !== requestedDeviceId) ||
        (txEmail && requestedEmail && txEmail !== requestedEmail) ||
        (txLicense && rawCode && txLicense !== rawCode)
      ) {
        return res.status(403).json({
          ok: false,
          verified: false,
          activated: false,
          reason: 'TRANSACTION_OWNERSHIP_MISMATCH',
          message: 'Transaksi ini milik pesanan/pengguna lain.',
        });
      }

      const finalLicenseCode = txLicense || normalizeLicenseCode(order?.licenseCode || '') || rawCode;
      let seatClaim = null;
      if (finalLicenseCode) {
        if (await isLicenseRevokedInRedis(finalLicenseCode)) {
          return res.status(403).json({
            ok: false,
            verified: false,
            activated: false,
            revoked: true,
            reason: 'LICENSE_REVOKED',
            message: 'Kode lisensi ini telah dicabut atau dinonaktifkan oleh Administrator.',
          });
        }
        if (requestedDeviceId) {
          seatClaim = await checkAndClaimServerSeat(finalLicenseCode, requestedDeviceId, planSpec.maxSeats, {
            teacherPin,
          });
          if (!seatClaim.allowed) {
            return res.status(403).json({
              ok: false,
              verified: false,
              activated: false,
              ...seatClaim,
            });
          }
        }
      }

      if (invoiceId) {
        await withDistributedLock([`order:${invoiceId}`], async ({ lockKeys, ownerToken, fenceToken }) => {
          const freshOrder = await getPaymentOrderRecord(invoiceId);
          const nowIso = new Date().toISOString();
          const maxFence = Math.max(
            Number(freshOrder?.fenceToken) || 0,
            Number(txRecord.fenceToken) || 0,
            fenceToken || 0
          );
          await savePaymentOrderRecord(
            invoiceId,
            {
              ...(freshOrder || order || {}),
              orderId: freshOrder?.orderId || order?.orderId || invoiceId,
              invoiceId,
              planId: freshOrder?.planId || order?.planId || planSpec.planId,
              planType: freshOrder?.planType || order?.planType || txRecord.planType || planSpec.planType,
              baseAmount: freshOrder?.baseAmount || order?.baseAmount || planSpec.price,
              paidAmount: Number(txRecord.amount),
              transactionId:
                txRecord.transactionId || effectiveTxId || freshOrder?.transactionId || order?.transactionId || null,
              webhookEventId:
                txRecord.webhookEventId || freshOrder?.webhookEventId || order?.webhookEventId || null,
              licenseCode: finalLicenseCode || freshOrder?.licenseCode || order?.licenseCode || null,
              status: 'paid',
              consistencyState: 'committed',
              fenceToken: maxFence,
              activatedAt: freshOrder?.activatedAt || order?.activatedAt || nowIso,
              lastVerifiedAt: nowIso,
              updatedAt: nowIso,
            },
            {
              lockKey: lockKeys?.[0] || 'asesmerdeka:noop:lock',
              ownerToken,
              expectedFenceToken: maxFence,
            }
          );
        });
      }

      return res.status(200).json({
        ok: true,
        verified: true,
        status: 'paid',
        authoritySource: getRedisCredentials().configured ? 'redis' : 'local_registry',
        orderId: txInvoice || invoiceId || null,
        invoiceId: txInvoice || invoiceId || null,
        transactionId: txRecord.transactionId || effectiveTxId,
        webhookEventId: txRecord.webhookEventId || order?.webhookEventId || null,
        licenseCode: finalLicenseCode,
        amount: Number(txRecord.amount),
        planId: order?.planId || planSpec.planId,
        planType: txRecord.planType || planSpec.planType,
        ...(seatClaim ? { usedSeats: seatClaim.usedSeats, maxSeats: seatClaim.maxSeats } : {}),
      });
    }

    if (!rawCode) {
      return res.status(400).json({ valid: false, message: 'Kode lisensi tidak boleh kosong.' });
    }

    // Tolak permanen jika lisensi ini telah dihapus atau dicabut oleh Administrator
    if (await isLicenseRevokedInRedis(rawCode)) {
      return res.status(403).json({
        valid: false,
        revoked: true,
        lifecycleState: 'revoked',
        message: 'Kode lisensi ini telah dicabut atau dinonaktifkan oleh Administrator.',
      });
    }

    // Action: check_status untuk memvalidasi apakah perangkat / guru pengguna masih sah dan aktif di server
    if (action === 'check_status') {
      const seatRecord = await getSeatRecordFromRedis(rawCode);
      if (seatRecord && isLicenseExpired(seatRecord.expiresAt)) {
        return res.status(403).json({
          valid: false,
          expired: true,
          lifecycleState: 'expired',
          expiresAt: seatRecord.expiresAt,
          message: 'Masa berlaku lisensi telah berakhir. Silakan perpanjang lisensi Anda.',
        });
      }
      if (seatRecord && (seatRecord.lifecycleState === 'suspended' || seatRecord.suspended)) {
        return res.status(403).json({
          valid: false,
          suspended: true,
          lifecycleState: 'suspended',
          message: 'Kode lisensi ini sedang ditangguhkan oleh Administrator.',
        });
      }

      const cleanDev = String(_deviceId || '').trim().toUpperCase();
      const isSchool = Boolean(
        seatRecord && isSchoolLicenseCodeServer(rawCode, seatRecord.maxSeats, seatRecord)
      );

      if (isSchool && seatRecord.teacherSeats) {
        let resolvedKey = teacherPin ? normalizeTeacherKeyServer(teacherPin, cleanDev) : '';
        if (!resolvedKey && cleanDev) {
          for (const k of Object.keys(seatRecord.teacherSeats)) {
            if (seatRecord.teacherSeats[k]?.devices?.includes(cleanDev)) {
              resolvedKey = k;
              break;
            }
          }
        }
        const teacherEntry = resolvedKey ? seatRecord.teacherSeats[resolvedKey] : null;
        if (teacherEntry && teacherEntry.status === 'disabled') {
          return res.status(403).json({
            valid: false,
            teacherSeatDisabled: true,
            lifecycleState: 'suspended',
            message: `Kursi guru "${resolvedKey}" telah dinonaktifkan oleh Admin Sekolah.`,
          });
        }
      }

      const devices = Array.isArray(seatRecord?.devices) ? seatRecord.devices : [];
      if (!seatRecord || (cleanDev && !devices.includes(cleanDev))) {
        return res.status(200).json({
          valid: false,
          unbound: true,
          message: 'Perangkat ini telah dilepas dari kunci lisensi oleh Administrator.',
        });
      }

      return res.status(200).json({
        valid: true,
        planType: isSchool ? 'sekolah' : 'individu',
        usedSeats: getEffectiveUsedSeatCount(seatRecord),
        maxSeats: seatRecord.maxSeats,
        expiresAt: seatRecord.expiresAt ?? null,
        lifecycleState: evaluateServerLifecycleState(seatRecord),
      });
    }

    // Tolak permanen kode lisensi versi lama (PRO-MERDEKA-... atau ASES-...) dan instruksikan klien mereset perangkat
    if (rawCode.startsWith('PRO-MERDEKA-') || rawCode.startsWith('ASES-')) {
      return res.status(403).json({
        valid: false,
        seatLimitExceeded: true,
        legacyRevoked: true,
        lifecycleState: 'revoked',
        message:
          'Kode lisensi versi lama sudah tidak berlaku dan telah dinonaktifkan. Silakan gunakan Kode Lisensi Terenkripsi terbaru (ASM-...).',
      });
    }

    // Fitur Admin untuk me-reset daftar perangkat pada kode tertentu di Upstash Redis
    if (action === 'reset_seats') {
      const adminPinHash = computeHash36(`ADMIN_KEYGEN_V1:${String(body.adminPin || '').trim()}:MERDEKA_SALT_2026`);
      if (adminPinHash !== '2ID3PNQBIO') {
        return res.status(403).json({ ok: false, message: 'PIN Admin tidak valid.' });
      }
      const prevRecord = await getSeatRecordFromRedis(rawCode);
      await saveSeatRecordToRedis(rawCode, {
        ...(prevRecord || {}),
        licenseCode: rawCode,
        maxSeats: prevRecord?.maxSeats || (rawCode.startsWith('ASM-SK26-') || rawCode.startsWith('ASM-SP26-') ? 25 : 2),
        devices: [],
        ...(prevRecord?.teacherSeats ? { teacherSeats: {} } : {}),
        usedSeats: 0,
        lifecycleState: 'paid',
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        ok: true,
        message: `Daftar kunci perangkat untuk kode ${rawCode} berhasil di-reset di Cloud Redis.`,
      });
    }

    // Jika aktivasi mewajibkan bukti pembayaran (requirePaymentProof / invoiceId / orderId / transactionId), validasi dari Persistent Registry
    if (body.requirePaymentProof === true || body.invoiceId || body.orderId || body.transactionId) {
      const verifyInvoiceId = String(body.invoiceId || body.orderId || '').trim().toUpperCase();
      const verifyTxId = String(body.transactionId || '').trim().toUpperCase();
      const verifyOrder = verifyInvoiceId ? await getPaymentOrderRecord(verifyInvoiceId) : null;
      const txProof = await getVerifiedTxRecordForOrder(verifyTxId, verifyInvoiceId, verifyOrder);
      if (!txProof || txProof.status !== 'paid') {
        return res.status(403).json({
          valid: false,
          paymentUnverified: true,
          reason: 'UNVERIFIED_PAYMENT_TRANSACTION',
          message: 'Bukti pembayaran terverifikasi di server tidak ditemukan untuk aktivasi ini.',
        });
      }
      const proofLicense = normalizeLicenseCode(txProof.licenseCode || verifyOrder?.licenseCode || '');
      if (proofLicense && rawCode && proofLicense !== rawCode) {
        return res.status(403).json({
          valid: false,
          paymentUnverified: true,
          reason: 'TRANSACTION_OWNERSHIP_MISMATCH',
          message: 'Kode lisensi tidak sesuai dengan bukti pembayaran terverifikasi.',
        });
      }
    }

    // 0. Cek apakah kode lisensi adalah Kode Terenkripsi AsesMerdeka (ASM-...)
    const internalMatch = verifyInternalSerialOrDeviceCode(rawCode, _deviceId);
    if (internalMatch) {
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, internalMatch.maxSeats, {
        teacherPin,
      });
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: Boolean(seatCheck.seatLimitExceeded || seatCheck.teacherDeviceLimitExceeded),
          teacherDeviceLimitExceeded: Boolean(seatCheck.teacherDeviceLimitExceeded),
          teacherSeatDisabled: Boolean(seatCheck.teacherSeatDisabled),
          expired: Boolean(seatCheck.expired),
          suspended: Boolean(seatCheck.suspended),
          paymentUnverified: Boolean(seatCheck.paymentUnverified),
          lifecycleState: seatCheck.lifecycleState,
          expiresAt: seatCheck.expiresAt ?? null,
          teacherKey: seatCheck.teacherKey,
          teacherUsedDevices: seatCheck.teacherUsedDevices,
          teacherMaxDevices: seatCheck.teacherMaxDevices,
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      return res.status(200).json({
        valid: true,
        planType: internalMatch.planType,
        tier: internalMatch.tier,
        usedSeats: seatCheck.usedSeats,
        maxSeats: seatCheck.maxSeats,
        teacherKey: seatCheck.teacherKey,
        teacherUsedDevices: seatCheck.teacherUsedDevices,
        teacherMaxDevices: seatCheck.teacherMaxDevices,
        lifecycleState: seatCheck.lifecycleState || 'active',
        expiresAt: seatCheck.expiresAt ?? null,
        message:
          internalMatch.planType === 'sekolah'
            ? `Lisensi Kolektif Sekolah aktif (${seatCheck.usedSeats}/${seatCheck.maxSeats} Kursi Guru${seatCheck.teacherUsedDevices ? ` • Perangkat Anda: ${seatCheck.teacherUsedDevices}/${seatCheck.teacherMaxDevices}` : ''}).`
            : `Lisensi Guru Mandiri aktif (${seatCheck.usedSeats}/${seatCheck.maxSeats} Perangkat).`,
        details: rawCode,
      });
    }

    const apiKey = process.env.MAYAR_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        valid: false,
        kycPending: true,
        message:
          'Sistem verifikasi otomatis Mayar sedang dalam proses verifikasi akun Mayar (KYC). Silakan hubungi Admin atau gunakan Kode Lisensi Cadangan Mitra untuk aktivasi langsung.',
      });
    }

    const individuProductId =
      process.env.MAYAR_PRODUCT_ID ||
      process.env.VITE_MAYAR_PRODUCT_ID ||
      'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';

    const schoolProductId =
      process.env.MAYAR_SCHOOL_PRODUCT_ID ||
      process.env.VITE_MAYAR_SCHOOL_PRODUCT_ID ||
      '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

    async function verifyWithMayar(productId) {
      const v2Config = resolveMayarApiV2Config();
      if (!v2Config.ok) {
        return { status: 400, ok: false, error: v2Config.message || 'Konfigurasi API Mayar V2 tidak valid.' };
      }
      const endpointUrl = `${v2Config.saasV2BaseUrl}/license/verify`;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const effectiveTimeoutMs = Math.max(100, Number(process.env.MAYAR_API_TIMEOUT_MS) || 8000);
      const timer = controller ? setTimeout(() => controller.abort(), effectiveTimeoutMs) : null;
      try {
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          ...(controller ? { signal: controller.signal } : {}),
          body: JSON.stringify({
            licenseCode: rawCode,
            productId,
          }),
        });

        const data = await response.json().catch(() => null);
        return {
          status: response.status,
          ok: response.ok,
          data,
        };
      } catch (err) {
        return {
          status: 500,
          ok: false,
          error: err?.message || 'Gagal menghubungi server Mayar V2',
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    // 1. Cek Produk Individu terlebih dahulu (Limit 2 Perangkat)
    const resIndividu = await verifyWithMayar(individuProductId);
    const individuPayload = resIndividu.data?.data && typeof resIndividu.data.data === 'object' ? resIndividu.data.data : resIndividu.data;
    if (resIndividu.ok && individuPayload?.isLicenseActive) {
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, 2);
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: Boolean(seatCheck.seatLimitExceeded),
          expired: Boolean(seatCheck.expired),
          suspended: Boolean(seatCheck.suspended),
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      const buyerLabel = individuPayload?.customerName
        ? `Mayar: ${individuPayload.customerName}${individuPayload?.customerEmail ? ` (${individuPayload.customerEmail})` : ''}`
        : 'Pembelian Mayar.id (Individu)';

      await autoRegisterLicenseInAdminRegistry({
        code: rawCode,
        maxSeats: 2,
        deviceId: _deviceId,
        label: buyerLabel,
        planType: 'individu',
        tier: 'guru',
      });

      return res.status(200).json({
        valid: true,
        planType: 'individu',
        tier: 'guru',
        usedSeats: seatCheck.usedSeats,
        maxSeats: 2,
        lifecycleState: seatCheck.lifecycleState || 'active',
        expiresAt: seatCheck.expiresAt ?? null,
        message: `Lisensi Guru Mandiri berhasil diverifikasi dan aktif (${seatCheck.usedSeats}/2 Perangkat).`,
        details: resIndividu.data?.licenseCode,
      });
    }

    // 2. Cek Produk Sekolah (Limit 25 Kursi Guru, maks 2 perangkat/guru)
    const resSchool = await verifyWithMayar(schoolProductId);
    const schoolPayload = resSchool.data?.data && typeof resSchool.data.data === 'object' ? resSchool.data.data : resSchool.data;
    if (resSchool.ok && schoolPayload?.isLicenseActive) {
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, 25, { teacherPin });
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: Boolean(seatCheck.seatLimitExceeded || seatCheck.teacherDeviceLimitExceeded),
          teacherDeviceLimitExceeded: Boolean(seatCheck.teacherDeviceLimitExceeded),
          teacherSeatDisabled: Boolean(seatCheck.teacherSeatDisabled),
          expired: Boolean(seatCheck.expired),
          suspended: Boolean(seatCheck.suspended),
          teacherKey: seatCheck.teacherKey,
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      const schoolBuyerLabel = resSchool.data?.customerName
        ? `Mayar: ${resSchool.data.customerName}${resSchool.data?.customerEmail ? ` (${resSchool.data.customerEmail})` : ''}`
        : 'Pembelian Mayar.id (Sekolah 25 Guru)';

      await autoRegisterLicenseInAdminRegistry({
        code: rawCode,
        maxSeats: 25,
        deviceId: _deviceId,
        label: schoolBuyerLabel,
        planType: 'sekolah',
        tier: 'sekolah',
      });

      return res.status(200).json({
        valid: true,
        planType: 'sekolah',
        tier: 'sekolah',
        usedSeats: seatCheck.usedSeats,
        maxSeats: 25,
        teacherKey: seatCheck.teacherKey,
        teacherUsedDevices: seatCheck.teacherUsedDevices,
        teacherMaxDevices: seatCheck.teacherMaxDevices,
        lifecycleState: seatCheck.lifecycleState || 'active',
        expiresAt: seatCheck.expiresAt ?? null,
        message: `Lisensi Kolektif Sekolah (25 Guru) berhasil diverifikasi dan aktif (${seatCheck.usedSeats}/25 Kursi Guru).`,
        details: resSchool.data?.licenseCode,
      });
    }

    // 3. Jika kode tidak aktif pada kedua produk, berikan pesan kesalahan informatif
    const errorMsg =
      resIndividu.data?.message ||
      resSchool.data?.message ||
      'Kode lisensi tidak ditemukan, tidak aktif, atau batas aktivasi perangkat telah tercapai.';

    return res.status(400).json({
      valid: false,
      message: errorMsg,
    });
  } catch (error) {
    if (error instanceof RedisUnavailableError || error?.name === 'RedisUnavailableError') {
      return res.status(503).json({
        ok: false,
        valid: false,
        verified: false,
        activated: false,
        redisUnavailable: true,
        reason: 'REDIS_UNAVAILABLE',
        message: error.message,
      });
    }
    if (error instanceof FencedWriteConflictError || error?.name === 'FencedWriteConflictError') {
      return res.status(409).json({
        ok: false,
        valid: false,
        verified: false,
        activated: false,
        staleLockFence: true,
        reason: error.reason || 'STALE_LOCK_FENCE',
        message: error.message,
      });
    }
    if (error instanceof LockContentionError || error?.name === 'LockContentionError') {
      return res.status(409).json({
        ok: false,
        valid: false,
        verified: false,
        activated: false,
        lockContention: true,
        reason: error.reason || 'LOCK_CONTENTION_TIMEOUT',
        message: error.message,
      });
    }
    return res.status(500).json({
      valid: false,
      ok: false,
      verified: false,
      activated: false,
      message: 'Terjadi kesalahan internal pada server saat memverifikasi lisensi.',
      error: error?.message,
    });
  }
}
