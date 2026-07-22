const { defineSecret } = require('firebase-functions/params');
const geminiApiKeyParam = defineSecret('GEMINI_API_KEY');
const { onRequest } = require('firebase-functions/v2/https');
/**
 * AI endpoint: Suggest SEO tags, meta title, and meta description for podcast episodes using Gemini.
 * POST /gemini/seo-suggest
 * Body: { title, description, categories, [optional] transcript }
 * Returns: { tags, metaTitle, metaDescription }
 */
// exports.seoSuggest = onRequest({ cors: true, secrets: [geminiApiKeyParam] }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  try {
    const geminiKey = req.env && req.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured.' });
    }
    const { title, description, categories, transcript } = req.body || {};
    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, description.' });
    }
    const prompt = [
      `Du er en SEO-ekspert for en kristen podcast.`,
      `Lag forslag til:`,
      `- 5-10 relevante tagger (kommaseparert, små bokstaver, ingen #)`,
      `- En god meta-tittel (maks 60 tegn)`,
      `- En god meta-beskrivelse (maks 155 tegn, oppsummerende, inviterende, inkluderer relevante søkeord)`,
      `\n      Episodetittel: ${title}\n      Beskrivelse: ${description}\n      Kategorier: ${(categories || []).join(', ')}\n      ${transcript ? `Transkripsjon (utdrag): ${transcript.substring(0, 1000)}` : ''}\n      `,
      `Svar i JSON-format slik: { "tags": "tag1, tag2, ...", "metaTitle": "...", "metaDescription": "..." }`
    ].join('\n');

    const apiBase = 'https://generativelanguage.googleapis.com/v1beta';
    const model = 'models/gemini-1.5-flash';
    const url = `${apiBase}/${model}:generateContent?key=${geminiKey.trim()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Gemini API error.' });
    }
    // Try to extract JSON from the response
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let json = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      json = match ? JSON.parse(match[0]) : null;
    } catch (e) {
      json = null;
    }
    if (!json || !json.tags || !json.metaTitle || !json.metaDescription) {
      return res.status(500).json({ error: 'Ugyldig svar fra Gemini. Kunne ikke tolke SEO-data.' });
    }
    res.status(200).json(json);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ukjent feil.' });
  }
});
