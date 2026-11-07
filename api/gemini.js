/**
 * Vercel Serverless Function: /api/gemini
 * Proxy aman untuk memanggil Google Gemini API dari sisi server.
 * Menjaga GEMINI_API_KEY tetap rahasia (Secret) di Vercel tanpa bocor ke browser client.
 *
 * Mendukung pemilihan model cerdas berdasarkan level lisensi pengguna:
 * - Tier 'biasa' / 'sekolah' / 'free' -> gemini-2.5-flash (Cepat, efisien)
 * - Tier 'pro' / 'sekolah_pro' -> gemini-1.5-pro (Model penalaran mendalam)
 */

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Metode HTTP tidak diizinkan. Gunakan POST.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { prompt, contents, generationConfig, temperature = 0.4, tier = 'biasa' } = body;

    // Prioritaskan GEMINI_API_KEY (Server Secret), fallback ke VITE_GEMINI_API_KEY jika ada
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.',
        code: 'MISSING_SERVER_API_KEY',
      });
    }

    // Pemilihan model berbasis Tier Pengguna
    const isProTier = tier === 'pro' || tier === 'sekolah_pro';
    const model = isProTier ? 'gemini-1.5-pro' : 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Susun payload untuk Google Gemini API
    const geminiPayload = {
      contents: contents || [
        {
          parts: [{ text: prompt || '' }],
        },
      ],
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        responseMimeType: 'application/json',
        ...(generationConfig || {}),
      },
    };

    // Timeout 45 detik untuk Vercel Serverless Function
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify(geminiPayload),
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Google Gemini API Error (${response.status})`,
        model,
        details: errText,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      model,
      tier,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Terjadi kegagalan server saat meneruskan permintaan ke Gemini AI.',
      message: error?.message,
    });
  }
}
