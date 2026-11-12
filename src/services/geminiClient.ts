import type { LicenseTier } from '../types/assessment';
import { getSavedGeminiKey, getUserQuota } from '../utils/licenseManager';

const GOOGLE_GEMINI_FALLBACK_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_TIMEOUT_MS = 35_000;

export interface GeminiCallParams {
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  tier?: LicenseTier;
  geminiApiKey?: string;
}

function extractParsedGeminiResponse(resultJson: any, sourceLabel: string): any {
  const candidate =
    resultJson?.data?.candidates?.[0] || resultJson?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const textOutput = candidate?.content?.parts?.[0]?.text;

  if (!textOutput || typeof textOutput !== 'string') {
    throw new Error(`Format respon ${sourceLabel} tidak memiliki teks kandidat.`);
  }

  const cleanJson = textOutput
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (parseErr: any) {
    throw new Error(
      `Respon JSON dari ${sourceLabel} tidak valid${finishReason === 'MAX_TOKENS' ? ' (terpotong batas MAX_TOKENS)' : ''}: ${parseErr?.message || 'Parse error'}`
    );
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && finishReason === 'MAX_TOKENS') {
    parsed._geminiFinishReason = 'MAX_TOKENS';
  }
  return parsed;
}

/**
 * Memanggil endpoint Google Gemini API langsung dari sisi klien (BYOK / Personal Key).
 */
async function callDirectGoogleGemini(
  prompt: string,
  apiKey: string,
  temperature = 0.4,
  systemInstruction?: string,
  maxOutputTokens = 4096
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(GOOGLE_GEMINI_FALLBACK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Gemini Direct API Error (${response.status})`);
    }

    const result = await response.json();
    return extractParsedGeminiResponse(result, 'Gemini Direct');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Memanggil Serverless Function /api/gemini (Aman di sisi server, tanpa mengekspos API Key).
 */
async function callVercelServerlessGemini(
  prompt: string,
  tier: LicenseTier,
  temperature = 0.4,
  systemInstruction?: string,
  maxOutputTokens = 4096
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    let endpoint = '/api/gemini';
    if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
      endpoint = `${window.location.origin}/api/gemini`;
    } else {
      endpoint = 'http://localhost/api/gemini';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        ...(systemInstruction ? { systemInstruction } : {}),
        tier,
        temperature,
        maxOutputTokens,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(
        errorJson?.error || errorJson?.message || `Vercel /api/gemini Error (${response.status})`
      );
    }

    const resJson = await response.json();
    return extractParsedGeminiResponse(resJson, '/api/gemini');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Universal Gemini API caller:
 * 1. Jika pengguna menyimpan Bring-Your-Own-Key (BYOK) pribadi, gunakan langsung ke Google.
 * 2. Coba Vercel Serverless Function /api/gemini (Kunci rahasia server aman dari intipan browser).
 * 3. Jika di mode dev lokal dan ada VITE_GEMINI_API_KEY, fallback langsung.
 * 4. Jika semua gagal, lemparkan error agar caller beralih ke Smart Curriculum Offline Engine.
 */
export async function callGeminiStructuredJSON(params: GeminiCallParams): Promise<any> {
  const currentQuota = getUserQuota();
  const userTier: LicenseTier = params.tier || currentQuota.tier || 'guru';
  const customKey = params.geminiApiKey || getSavedGeminiKey();
  const maxTokens = params.maxOutputTokens ?? 4096;

  // 1. Prioritas BYOK Klien (Kunci Kustom Pengguna)
  if (customKey) {
    try {
      return await callDirectGoogleGemini(
        params.prompt,
        customKey,
        params.temperature ?? 0.4,
        params.systemInstruction,
        maxTokens
      );
    } catch (err) {
      console.warn('Gagal memanggil direct Gemini dengan BYOK, mencoba /api/gemini:', err);
    }
  }

  // 2. Prioritas Serverless Proxy /api/gemini (Produksi Vercel)
  try {
    return await callVercelServerlessGemini(
      params.prompt,
      userTier,
      params.temperature ?? 0.4,
      params.systemInstruction,
      maxTokens
    );
  } catch (serverlessErr) {
    console.warn('Panggilan ke /api/gemini gagal atau offline:', serverlessErr);

    // 3. Fallback lokal jika ada environment key saat development
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey !== customKey) {
      try {
        return await callDirectGoogleGemini(
          params.prompt,
          envKey,
          params.temperature ?? 0.4,
          params.systemInstruction,
          maxTokens
        );
      } catch (directEnvErr) {
        console.warn('Fallback direct dev key juga gagal:', directEnvErr);
      }
    }

    // Teruskan error agar pemanggil beralih ke Smart Curriculum Heuristic Offline Engine
    throw serverlessErr;
  }
}
