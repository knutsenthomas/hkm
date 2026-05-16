const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

// Hent nøkler fra miljø eller hardkodet for dette engangsskriptet (vi vet de fungerer i functions)
// Siden vi kjører lokalt, må vi ha nøklene her. 
// Jeg antar vi kan hente dem fra .env filen hvis den finnes.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function normalizePodcastSummaryText(text) {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  cleaned = cleaned.replace(/^(Oppsummering|Sammendrag|Denne episoden|I denne episoden):\s*/i, '');
  return cleaned;
}

async function generateSummary(title, text) {
  const promptString = [
    'Du er en norsk redaktør for kristent innhold.',
    'Lag en kort, varm og tydelig oppsummering av podcast-episoden under.',
    'Krav:',
    '- Skriv på norsk bokmål.',
    '- 2-3 setninger, maks 320 tegn.',
    '- Ingen punktliste, ingen emojis, ingen markdown.',
    '- Ikke finn opp detaljer som ikke finnes i teksten.',
    '- Avslutt med en naturlig setning, ikke call-to-action.',
    '',
    `Tittel: ${title}`,
    'Transkripsjon:',
    text.substring(0, 15000), // Begrens lengden for AI-en
  ].join('\n');

  let resultText = null;

  // Try Gemini
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(promptString);
    resultText = result.response.text();
  } catch (err) {
    console.error("Gemini feilet, prøver OpenAI...");
  }

  // Fallback to OpenAI
  if (!resultText && openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du er en norsk redaktør for kristent innhold." },
          { role: "user", content: promptString }
        ]
      });
      resultText = completion.choices[0].message.content;
    } catch (err) {
      console.error("OpenAI feilet også:", err);
    }
  }

  return normalizePodcastSummaryText(resultText);
}

async function backfill() {
  console.log('Starter backfill av oppsummeringer...');
  const snap = await db.collection('podcast_transcripts').get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.text && !data.summary) {
      console.log(`Genererer oppsummering for: ${data.title || doc.id}...`);
      try {
        const summary = await generateSummary(data.title || 'Uten tittel', data.text);
        if (summary) {
          await doc.ref.update({
            summary: summary,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Suksess!');
          count++;
        }
      } catch (err) {
        console.error(`Feilet for ${doc.id}:`, err);
      }
      
      // Vent litt for å unngå rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`Fullført! Genererte ${count} oppsummeringer.`);
  process.exit(0);
}

backfill();
