import type { LicenseTier } from '../types/assessment';
import { getSavedGeminiKey, getUserQuota } from '../utils/licenseManager';

const GOOGLE_GEMINI_FALLBACK_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_TIMEOUT_MS = 35_000;

export interface GeminiCallParams {
  prompt: string;
  temperature?: number;
  tier?: LicenseTier;
  geminiApiKey?: string;
}

/**
 * Memanggil endpoint Google Gemini API langsung dari sisi klien (BYOK / Personal Key).
 */
async function callDirectGoogleGemini(
  prompt: string,
  apiKey: string,
  temperature = 0.4
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
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Gemini Direct API Error (${response.status})`);
    }

    const result = await response.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput || typeof textOutput !== 'string') {
      throw new Error('Tidak ada respon teks yang diterima dari Gemini Direct.');
    }

    const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
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
  temperature = 0.4
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
        tier,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(
        errorJson?.error || errorJson?.message || `Vercel /api/gemini Error (${response.status})`
      );
    }

    const resJson = await response.json();
    const textOutput =
      resJson.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput || typeof textOutput !== 'string') {
      throw new Error('Format respon /api/gemini tidak memiliki teks kandidat.');
    }

    const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
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
  const userTier: LicenseTier = params.tier || currentQuota.tier || 'biasa';
  const customKey = params.geminiApiKey || getSavedGeminiKey();

  // 1. Prioritas BYOK Klien (Kunci Kustom Pengguna)
  if (customKey) {
    try {
      return await callDirectGoogleGemini(params.prompt, customKey, params.temperature ?? 0.4);
    } catch (err) {
      console.warn('Gagal memanggil direct Gemini dengan BYOK, mencoba /api/gemini:', err);
    }
  }

  // 2. Prioritas Serverless Proxy /api/gemini (Produksi Vercel)
  try {
    return await callVercelServerlessGemini(params.prompt, userTier, params.temperature ?? 0.4);
  } catch (serverlessErr) {
    console.warn('Panggilan ke /api/gemini gagal atau offline:', serverlessErr);

    // 3. Fallback lokal jika ada environment key saat development
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey !== customKey) {
      try {
        return await callDirectGoogleGemini(params.prompt, envKey, params.temperature ?? 0.4);
      } catch (directEnvErr) {
        console.warn('Fallback direct dev key juga gagal:', directEnvErr);
      }
    }

    // Teruskan error agar pemanggil beralih ke Smart Curriculum Heuristic Offline Engine
    throw serverlessErr;
  }
}
