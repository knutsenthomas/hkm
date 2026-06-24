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

async function generateIntroductionWithGemini(plan) {
  const model = 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  const daysVersesList = (plan.days || []).map(d => ({
    dayNumber: d.dayNumber,
    verses: d.verses || ""
  })).sort((a, b) => a.dayNumber - b.dayNumber);

  const prompt = `Du er en bibellærer og UI/UX-skribent. Generer en strukturert introduksjon til bibelleseplanen "${plan.title}" på norsk (bokmål).
Leseplanens beskrivelse: ${plan.description}
Antall dager: ${plan.durationDays}
Dager og skriftsteder:
${JSON.stringify(daysVersesList)}

Returner et JSON-objekt med nøyaktig denne strukturen:
{
  "title": "Introduksjon til [Evangeliet/Boken/Planen]",
  "bigIdea": "En kort, slagkraftig oppsummering i én setning (Norwegian: 'Den Store Ideen').",
  "description": "Et velskrevet introduksjonsavsnitt (ca. 2-4 setninger) som gir oversikt.",
  "themes": [
    {
      "title": "Navn på sentralt tema 1",
      "description": "Kort forklaring av tema 1"
    },
    {
      "title": "Navn på sentralt tema 2",
      "description": "Kort forklaring av tema 2"
    },
    {
      "title": "Navn på sentralt tema 3",
      "description": "Kort forklaring av tema 3"
    }
  ],
  "structure": [
    {
      "range": "Kapitler eller dagsintervaller (f.eks. 'Kap. 1-12' eller 'Dag 1-10' eller 'Rut 1-4')",
      "title": "Tittel for denne delen av boken/planen",
      "description": "Kort beskrivelse av hva denne delen handler om"
    },
    ... (generer 3-4 strukturelle deler)
  ]
}

Regler for innholdet:
- Hold det teologisk dyptpløyende, men lett tilgjengelig og engasjerende.
- For temasiden ("themes"), velg 3 helt sentrale og relevante teologiske eller praktiske temaer fra leseplanens tekster.
- For oppbygning ("structure"), vis bokens eller planens logiske inndeling basert på dager eller kapitler.
- Returner KUN det rå JSON-objektet uten markdown-formatering (\`\`\`json) eller andre kommentarer. Bare gyldig JSON.`;

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
        temperature: 0.2,
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

  return JSON.parse(text);
}

async function generateAllIntroductions() {
  try {
    console.log("Fetching reading plans from Firestore...");
    const snap = await db.collection('reading_plans').get();
    console.log(`Found ${snap.size} reading plans.\n`);

    // Let's first define a hardcoded introduction for the Gospel of John to match the exact design/text from the screenshot
    const johnGospelIntroduction = {
      title: "Introduksjon til Johannesevangeliet",
      bigIdea: "Johannesevangeliet er skrevet for at vi skal tro at Jesus er Messias, Guds Sønn, og at vi ved troen kan ha liv i hans navn.",
      description: "Johannesevangeliet gir oss en unik fremstilling av hvem Jesus er. Mens de andre tre evangeliene (de synoptiske) fokuserer mye på Jesu gjerninger og lignelser i Galilea, tar Johannes oss med på en dypere teologisk reise for å åpenbare Jesu guddommelige natur og hans intime forhold til Faderen.",
      themes: [
        {
          title: "Ordet ble menneske",
          description: "Jesus er det evige Logos som var hos Gud og var Gud."
        },
        {
          title: "De syv tegnene",
          description: "Utvalgte undergjerninger som viser Jesu herlighet og vekker tro."
        },
        {
          title: "Jeg er-uttalelsene",
          description: "Syv ganger åpenbarer Jesus sin identitet med Guds eget paktsnavn (f.eks. Livets brød, Verdens lys)."
        }
      ],
      structure: [
        {
          range: "Joh 1:1-18",
          title: "Prologen",
          description: "Det sanne lyset kommer til verden."
        },
        {
          range: "Joh 1:19 - 12:50",
          title: "Tegnenes bok",
          description: "Jesu offentlige tjeneste."
        },
        {
          range: "Joh 13:1 - 20:31",
          title: "Herlighetens bok",
          description: "Avskjedstalen, korset og oppstandelsen."
        },
        {
          range: "Joh 21",
          title: "Epilogen",
          description: "Frokost ved sjøen og oppreisningen av Peter."
        }
      ]
    };

    for (const doc of snap.docs) {
      const plan = doc.data();
      plan.id = doc.id;

      console.log(`Processing introduction for plan: ${plan.title} (${plan.id})`);

      let introduction = null;
      if (plan.title.toLowerCase().includes('johannes')) {
        console.log("Using hardcoded/predefined Gospel of John introduction to match design screenshot...");
        introduction = johnGospelIntroduction;
      } else {
        try {
          console.log("Generating introduction with Gemini...");
          introduction = await generateIntroductionWithGemini(plan);
        } catch (err) {
          console.error(`Failed to generate introduction for ${plan.title}:`, err);
          continue;
        }
      }

      if (introduction) {
        console.log("Updating Firestore doc with introduction...");
        await db.collection('reading_plans').doc(plan.id).update({
          introduction: introduction
        });
        console.log(`Successfully updated introduction for: ${plan.title}`);
      }
    }

    console.log("\nFinished generating introductions for all reading plans!");
  } catch (err) {
    console.error("Error generating introductions:", err);
  }
  process.exit(0);
}

generateAllIntroductions();
