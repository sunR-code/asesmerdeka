import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callGeminiStructuredJSON } from '../../services/geminiClient';
import * as geminiClient from '../../services/geminiClient';
import { generateContextualModulAjarWithAI } from '../modulAjarAiService';
import { getCuratedModulExampleById } from '../modulCuratedExamples';
import * as licenseManager from '../licenseManager';
import {
  activateLicense,
  computeSerialLicenseCode,
  getSavedGeminiKey,
  getUserQuota,
  saveGeminiKey,
} from '../licenseManager';
// @ts-expect-error serverless JS handler tested directly
import {
  localLicenseRegistryStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS handler tested directly
import geminiHandler from '../../../api/gemini.js';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage =
    new LocalStorageMock();
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  setHeader: (name: string, val: string) => void;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

function createMockRes(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name: string, val: string) {
      this.headers[name.toLowerCase()] = val;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
}

async function invokeGemini(body: any, method = 'POST'): Promise<MockResponse> {
  const req = {
    method,
    body,
    headers: {},
    query: {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = createMockRes();
  await geminiHandler(req, res);
  return res;
}

describe('Task 12.4.3 — Gemini API Key Security Hardening (Server-Only Secret & Anti-Exposure)', () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const savedImportMetaViteKey = (import.meta as unknown as { env?: Record<string, unknown> }).env
    ?.VITE_GEMINI_API_KEY;

  beforeEach(() => {
    localStorage.clear();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localRevokedLicensesSet.clear();
    delete process.env.VITE_GEMINI_API_KEY;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
    const envObj = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (envObj) {
      if (savedImportMetaViteKey === undefined) {
        delete envObj.VITE_GEMINI_API_KEY;
      } else {
        envObj.VITE_GEMINI_API_KEY = savedImportMetaViteKey;
      }
    }
  });

  it('1. getSavedGeminiKey() tidak pernah membaca VITE_GEMINI_API_KEY meskipun env frontend diisi', () => {
    const envObj = ((import.meta as unknown as { env?: Record<string, unknown> }).env ||= {});
    envObj.VITE_GEMINI_API_KEY = 'SHOULD_NEVER_BE_READ_BY_FRONTEND';
    expect(getSavedGeminiKey()).toBe('');

    saveGeminiKey('  BYOK_USER_PERSONAL_KEY_01  ');
    expect(getSavedGeminiKey()).toBe('BYOK_USER_PERSONAL_KEY_01');
  });

  it('2. callGeminiStructuredJSON() memakai /api/gemini dan tidak fallback ke VITE_GEMINI_API_KEY saat server gagal', async () => {
    const envObj = ((import.meta as unknown as { env?: Record<string, unknown> }).env ||= {});
    envObj.VITE_GEMINI_API_KEY = 'SHOULD_NEVER_FALLBACK_DIRECT_FROM_BROWSER';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Layanan AI sementara sibuk' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      callGeminiStructuredJSON({
        prompt: 'Susun modul ajar',
        tier: 'guru',
      })
    ).rejects.toThrow('Layanan AI sementara sibuk');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain('/api/gemini');
    expect(calledUrl).not.toContain('generativelanguage.googleapis.com');
  });

  it('3. BYOK eksplisit pengguna tetap berfungsi langsung ke Google lalu fallback aman ke /api/gemini bila BYOK 503', async () => {
    saveGeminiKey('USER_EXPLICIT_BYOK_999');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"source":"byok"}' }] } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { candidates: [{ content: { parts: [{ text: '{"source":"server_proxy"}' }] } }] },
        }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const okByok = await callGeminiStructuredJSON({ prompt: 'Uji BYOK' });
    expect(okByok).toEqual({ source: 'byok' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
    const byokHeaders = (fetchMock.mock.calls[0][1]?.headers || {}) as Record<string, string>;
    expect(byokHeaders['x-goog-api-key']).toBe('USER_EXPLICIT_BYOK_999');

    const fallbackToServer = await callGeminiStructuredJSON({ prompt: 'Uji BYOK fallback' });
    expect(fallbackToServer).toEqual({ source: 'server_proxy' });
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/gemini');
  });

  it('4 & 9. /api/gemini hanya membaca process.env.GEMINI_API_KEY, menolak permintaan tanpa lisensi / escalation, dan menolak fallback VITE_GEMINI_API_KEY', async () => {
    const validBasic = computeSerialLicenseCode('INDIV1243A');
    const validPro = computeSerialLicenseCode('GURUPRO1243B');

    // Unlicensed request ditolak 403 LICENSE_REQUIRED
    const unlicensed = await invokeGemini({ prompt: 'Halo', tier: 'free', enforceLicense: true });
    expect(unlicensed.statusCode).toBe(403);
    expect(unlicensed.body.code).toBe('LICENSE_REQUIRED');

    // Basic license mencoba tier PRO ditolak 403 TIER_ENTITLEMENT_MISMATCH
    const mismatch = await invokeGemini({
      prompt: 'Halo',
      tier: 'pro',
      licenseCode: validBasic,
    });
    expect(mismatch.statusCode).toBe(403);
    expect(mismatch.body.code).toBe('TIER_ENTITLEMENT_MISMATCH');

    // Hanya VITE_GEMINI_API_KEY tersedia tanpa GEMINI_API_KEY -> server WAJIB menolak 503 MISSING_SERVER_API_KEY
    delete process.env.GEMINI_API_KEY;
    process.env.VITE_GEMINI_API_KEY = 'MISCONFIGURED_VITE_KEY_MUST_BE_IGNORED';
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const noServerKey = await invokeGemini({
      prompt: 'Halo',
      tier: 'pro',
      licenseCode: validPro,
    });
    expect(noServerKey.statusCode).toBe(503);
    expect(noServerKey.body.code).toBe('MISSING_SERVER_API_KEY');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('5. Respons server /api/gemini (200, error upstream, dan exception 500) tidak pernah membocorkan GEMINI_API_KEY', async () => {
    const secretKey = 'SECRET_GEMINI_SERVER_TOKEN_MUST_NOT_LEAK';
    process.env.GEMINI_API_KEY = secretKey;
    const validBasic = computeSerialLicenseCode('INDIV1243C');

    // 5a. Upstream 400 menggemakan secret key -> harus disanitasi [REDACTED]
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => `Upstream error referencing ${secretKey} in debug payload`,
    }) as unknown as typeof fetch;

    const errRes = await invokeGemini({ prompt: 'Tes error', tier: 'guru', licenseCode: validBasic });
    expect(errRes.statusCode).toBe(400);
    expect(JSON.stringify(errRes.body)).not.toContain(secretKey);
    expect(errRes.body.details).toContain('[REDACTED]');

    // 5b. Exception 500 mengandung secret key -> harus disanitasi [REDACTED]
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error(`Socket crash with ${secretKey}`)) as unknown as typeof fetch;

    const crashRes = await invokeGemini({ prompt: 'Tes crash', tier: 'guru', licenseCode: validBasic });
    expect(crashRes.statusCode).toBe(500);
    expect(JSON.stringify(crashRes.body)).not.toContain(secretKey);
    expect(crashRes.body.message).toContain('[REDACTED]');

    // 5c. Sukses 200 menggunakan header x-goog-api-key server dan respons tidak berisi secretKey
    const okFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    });
    globalThis.fetch = okFetch as unknown as typeof fetch;

    const okRes = await invokeGemini({ prompt: 'Tes sukses', tier: 'guru', licenseCode: validBasic });
    expect(okRes.statusCode).toBe(200);
    expect(JSON.stringify(okRes.body)).not.toContain(secretKey);
    expect(okFetch.mock.calls[0][1].headers['x-goog-api-key']).toBe(secretKey);
  });

  it('6, 7 & 8. Kegagalan /api/gemini pada Modul Ajar AI me-refund kuota, repair loop maks 1x, dan mempertahankan draf guru tanpa secret bocor', async () => {
    const smpEx = getCuratedModulExampleById('smp_8_matematika_spldv')!;
    const serial = computeSerialLicenseCode('INDIV1243D');
    activateLicense(serial, { initialCredits: 5, maxCredits: 5 });
    expect(getUserQuota().remainingCredits).toBe(5);

    // 6. Simulasi kegagalan /api/gemini -> kuota harus kembali utuh 5 dan fallback berlabel jujur
    vi.spyOn(licenseManager, 'requireActiveLicenseForAction').mockReturnValue(true);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Proxy Gemini sementara sibuk' }),
    }) as unknown as typeof fetch;

    const failedRes = await generateContextualModulAjarWithAI(smpEx.tp, smpEx.sampleProfile, 'pbl');
    expect(failedRes.usedFallback).toBe(true);
    expect(failedRes.aiFailed).toBe(true);
    expect(failedRes.modul.draftSource).toBe('template');
    expect(getUserQuota().remainingCredits).toBe(5);

    // 7 & 8. Simulasi repair loop maksimal 1x -> 1x gagal slop, 1x lolos via mock -> net potong 1 kredit (sisa 4)
    const validPayload = structuredClone(smpEx.modul);
    const slopPayload = structuredClone(smpEx.modul);
    slopPayload.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasGuru = 'Guru menjelaskan materi.';
    slopPayload.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasSiswa = 'Siswa berdiskusi.';

    const aiSpy = vi
      .spyOn(geminiClient, 'callGeminiStructuredJSON')
      .mockResolvedValueOnce(slopPayload)
      .mockResolvedValueOnce(validPayload);

    const repairedRes = await generateContextualModulAjarWithAI(smpEx.tp, smpEx.sampleProfile, 'pbl');
    expect(aiSpy).toHaveBeenCalledTimes(2);
    expect(repairedRes.usedFallback).toBe(false);
    expect(repairedRes.repairAttempted).toBe(true);
    expect(repairedRes.modul.draftSource).toBe('ai_generated');
    expect(getUserQuota().remainingCredits).toBe(4);
  });

  it('10. Audit statis kode sumber: nol referensi runtime VITE_GEMINI_API_KEY di frontend/serverless dan dokumentasi hanya mengizinkan GEMINI_API_KEY server', () => {
    const root = process.cwd();
    const licenseMgrSrc = fs.readFileSync(path.join(root, 'src/utils/licenseManager.ts'), 'utf8');
    const geminiClientSrc = fs.readFileSync(path.join(root, 'src/services/geminiClient.ts'), 'utf8');
    const apiGeminiSrc = fs.readFileSync(path.join(root, 'api/gemini.js'), 'utf8');
    const envExampleSrc = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

    expect(licenseMgrSrc).not.toContain('VITE_GEMINI_API_KEY');
    expect(geminiClientSrc).not.toContain('VITE_GEMINI_API_KEY');
    expect(apiGeminiSrc).not.toContain('VITE_GEMINI_API_KEY');
    expect(envExampleSrc).toContain('GEMINI_API_KEY=');
    expect(envExampleSrc).not.toMatch(/^#?\s*VITE_GEMINI_API_KEY\s*=/m);
  });

  it('11. Fallback otomatis /api/gemini ke model pengganti (gemini-3.8-flash) saat model primary mengembalikan 404', async () => {
    const secretKey = 'SECRET_GEMINI_SERVER_KEY_FALLBACK_TEST';
    process.env.GEMINI_API_KEY = secretKey;
    const validBasic = computeSerialLicenseCode('INDIV1243E');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            error: {
              code: 404,
              message:
                'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.',
              status: 'NOT_FOUND',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await invokeGemini({
      prompt: 'Buatkan modul ajar IPAS SD',
      tier: 'guru',
      licenseCode: validBasic,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.model).toBe('gemini-3.8-flash');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/models/gemini-2.5-flash:generateContent');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/models/gemini-3.8-flash:generateContent');

    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const fallbackPayload = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(firstPayload.generationConfig?.thinkingConfig).toBeUndefined();
    expect(fallbackPayload.generationConfig?.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(fallbackPayload.generationConfig?.maxOutputTokens).toBeGreaterThanOrEqual(8192);
  });

  it('12. Failover otomatis /api/gemini saat upstream AbortError (timeout) ke gemini-3.5-flash-lite dengan log attempts aman', async () => {
    const secretKey = 'SECRET_GEMINI_SERVER_KEY_TIMEOUT_FAILOVER';
    process.env.GEMINI_API_KEY = secretKey;
    const validBasic = computeSerialLicenseCode('INDIV1243F');

    const abortErr = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            error: {
              code: 404,
              message:
                'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash.',
            },
          }),
      })
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await invokeGemini({
      prompt: 'Buatkan modul ajar IPAS SD',
      tier: 'guru',
      licenseCode: validBasic,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.model).toBe('gemini-3.5-flash-lite');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/models/gemini-3.5-flash-lite:generateContent');
    expect(Array.isArray(res.body.attempts)).toBe(true);
    expect((res.body.attempts as Array<{ model: string }>).map((a) => a.model)).toEqual([
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ]);
  });

  it('13. Failover otomatis /api/gemini saat upstream mengembalikan 503 UNAVAILABLE ke gemini-3.5-flash-lite', async () => {
    const secretKey = 'SECRET_GEMINI_SERVER_KEY_503_FAILOVER';
    process.env.GEMINI_API_KEY = secretKey;
    const validBasic = computeSerialLicenseCode('INDIV1243G');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            error: {
              code: 404,
              message:
                'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            error: {
              code: 503,
              message: 'This model is currently experiencing high demand.',
              status: 'UNAVAILABLE',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await invokeGemini({
      prompt: 'Buatkan modul ajar IPAS SD',
      tier: 'guru',
      licenseCode: validBasic,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.model).toBe('gemini-3.5-flash-lite');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/models/gemini-3.5-flash-lite:generateContent');
    expect((res.body.attempts as Array<{ model: string; status: number }>).map((a) => [a.model, a.status])).toEqual([
      ['gemini-2.5-flash', 404],
      ['gemini-3.8-flash', 503],
      ['gemini-3.5-flash-lite', 200],
    ]);
  });
});
