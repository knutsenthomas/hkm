const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Load Gemini API Key from .env.local
let geminiApiKey = "";
try {
  const envLocalPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match) {
      geminiApiKey = match[1];
    }
  }
} catch (err) {
  console.error("Failed to load .env.local:", err);
}

if (!geminiApiKey) {
  console.error("Error: GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

// Translation Helper
async function translateJSONWithGemini(sourceObj, targetLang) {
  const model = 'gemini-3.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  const langMap = {
    en: 'English',
    es: 'Spanish'
  };

  const targetLangName = langMap[targetLang] || targetLang;

  const prompt = `Translate this JSON object containing reading plan fields from Norwegian Bokmal to ${targetLangName}.

Rules:
- Preserve meaning and tone.
- Keep structural JSON keys like 'dayNumber' and array structures unchanged.
- Return ONLY the raw translated JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. Return only valid parseable JSON.

JSON:
${JSON.stringify(sourceObj, null, 2)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Gemini request failed (${res.status}): ${errorBody || 'Unknown error'}`);
  }

  const data = await res.json();
  let text = "";
  try {
    text = data.candidates[0].content.parts[0].text.trim();
  } catch (err) {
    throw new Error("Gemini response is not structured as expected");
  }

  // Extract balanced JSON object from string to handle trailing braces/comments from Gemini
  const startIdx = text.indexOf('{');
  if (startIdx !== -1) {
    let braceCount = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          text = text.substring(startIdx, i + 1);
          break;
        }
      }
    }
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON returned by Gemini:", text);
    throw new Error(`Failed to parse translation JSON: ${e.message}`);
  }
}

async function translateAllPlans() {
  try {
    console.log("Fetching reading plans from Firestore...");
    const snap = await db.collection('reading_plans').get();
    console.log(`Found ${snap.size} reading plans to translate.\n`);

    for (const doc of snap.docs) {
      const docData = doc.data();
      
      // Skip if translations are already present and fully populated (including introduction if the source has one)
      const hasEnIntro = docData.introduction ? (docData.translations && docData.translations.en && docData.translations.en.introduction) : true;
      const hasEsIntro = docData.introduction ? (docData.translations && docData.translations.es && docData.translations.es.introduction) : true;
      if (docData.translations && docData.translations.en && docData.translations.es && hasEnIntro && hasEsIntro) {
        console.log(`Skipping plan ${doc.id} ("${docData.title}") - Translations already exist.`);
        continue;
      }

      console.log(`--------------------------------------------------`);
      console.log(`Translating plan ID: ${doc.id} ("${docData.title}")`);

      const translations = docData.translations || {};

      // If we only need to translate the introduction (i.e. other translations already exist)
      if (docData.introduction && translations.en && translations.es) {
        console.log("Translations already exist for fields/days. Translating ONLY the introduction...");
        
        if (!translations.en.introduction) {
          console.log("Translating introduction to English...");
          translations.en.introduction = await translateJSONWithGemini(docData.introduction, 'en');
        }
        
        if (!translations.es.introduction) {
          console.log("Translating introduction to Spanish...");
          translations.es.introduction = await translateJSONWithGemini(docData.introduction, 'es');
        }
      } else {
        // Fallback: full translation of entire document
        // Prepare minimal payload for translation
        const sourceObj = {
          title: docData.title || "",
          subtitle: docData.subtitle || "",
          description: docData.description || "",
          introduction: docData.introduction || null,
          days: (docData.days || []).map(day => ({
            dayNumber: day.dayNumber,
            prayerFocus: day.prayerFocus || "",
            resources: (day.resources || []).map(res => ({
              title: res.title || ""
            }))
          }))
        };

        console.log("Translating entire plan to English...");
        const enData = await translateJSONWithGemini(sourceObj, 'en');

        console.log("Translating entire plan to Spanish...");
        const esData = await translateJSONWithGemini(sourceObj, 'es');

        // Map translations to correct objects to preserve other fields (like url, type, verses)
        const mapTranslation = (transData, langCode) => {
          return {
            title: transData.title || docData.title,
            subtitle: transData.subtitle || docData.subtitle || "",
            description: transData.description || docData.description || "",
            introduction: transData.introduction || null,
            days: (docData.days || []).map((day, idx) => {
              const transDay = transData.days ? transData.days.find(d => d.dayNumber === day.dayNumber) || transData.days[idx] : null;
              return {
                dayNumber: day.dayNumber,
                prayerFocus: transDay ? transDay.prayerFocus : day.prayerFocus,
                verses: day.verses || "",
                resources: (day.resources || []).map((res, resIdx) => {
                  const transRes = (transDay && transDay.resources) ? transDay.resources[resIdx] : null;
                  return {
                    ...res,
                    title: transRes ? transRes.title : res.title
                  };
                })
              };
            })
          };
        };

        translations.en = mapTranslation(enData, 'en');
        translations.es = mapTranslation(esData, 'es');
      }

      // Update Firestore
      await db.collection('reading_plans').doc(doc.id).update({
        translations: translations,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully updated translations for plan: ${doc.id}`);
    }

    console.log(`\nAll reading plans translated successfully!`);
  } catch (err) {
    console.error("Error in translation process:", err);
  }
  process.exit(0);
}

translateAllPlans();
