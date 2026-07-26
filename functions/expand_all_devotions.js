const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Load Gemini API Key
let geminiApiKey = "";
try {
  const envLocalPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match) geminiApiKey = match[1];
  }
} catch (err) {
  console.error("Failed to load .env.local:", err);
}

if (!geminiApiKey) {
  console.error("Error: GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

async function generateRichDevotional(planTitle, dayNum, verses, currentPrayerFocus) {
  const model = 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  const prompt = `Du er en erfaren bibellærer, teolog og forfatter av kristne andakter. 
Generer en fyldig, inspirerende og teologisk dyp andaktstekst på norsk (bokmål) for dag ${dayNum} i leseplanen "${planTitle}".

Skriftsted for dagen: ${verses}
Nåværende stikkord/fokus: ${currentPrayerFocus || 'Generell andakt for skriftstedet'}

KRAV TIL FORMAT OG INNHOLD:
Returner KUN ren HTML (uten markdown-avsnitt som \`\`\`html eller \`\`\`):
1. Overskrift i <p><strong>Dag ${dayNum}: [Tittel på tema/kapittel]</strong></p>
2. Et avsnitt (<p>) med teologisk bakgrunn og sammenheng for dagens tekst (ca 80-120 ord).
3. Et avsnitt (<p>) om praktisk anvendelse for liv, tro og hverdagen i dag (ca 80-120 ord).
4. Et avsluttende avsnitt (<p><em>Be/Reflekter: [Kort, kraftfull bønn eller refleksjonsspørsmål]</em></p>)`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      let text = data.candidates[0].content.parts[0].text.trim();
      text = text.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
      return text;
    }
  } catch (err) {
    console.error(`Error generating devotional for Day ${dayNum}:`, err);
  }
  return null;
}

async function expandPlan(planId) {
  const doc = await db.collection('reading_plans').doc(planId).get();
  if (!doc.exists) {
    console.error(`Plan ${planId} not found`);
    return;
  }

  const data = doc.data();
  console.log(`\n==================================================`);
  console.log(`Processing Plan: "${data.title}" (${doc.id}) - ${data.days ? data.days.length : 0} days`);

  const days = data.days || [];
  let updatedCount = 0;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const currentPf = day.prayerFocus || '';
    
    // Skip if already expanded (length > 400 chars)
    if (currentPf.length > 400 && currentPf.includes('<p>')) {
      console.log(`  Skipping Day ${day.dayNumber} (already expanded - ${currentPf.length} chars)`);
      continue;
    }

    console.log(`  Generating rich devotional for Day ${day.dayNumber} (${day.verses})...`);
    const richHtml = await generateRichDevotional(data.title, day.dayNumber, day.verses, currentPf);
    if (richHtml) {
      days[i].prayerFocus = richHtml;
      updatedCount++;
    }
    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  if (updatedCount > 0) {
    console.log(`  Saving ${updatedCount} updated days to Firestore for "${data.title}"...`);
    await db.collection('reading_plans').doc(planId).update({ days });
    console.log(`  ✅ Successfully updated "${data.title}"!`);
  } else {
    console.log(`  No updates needed for "${data.title}".`);
  }
}

async function run() {
  const targetPlans = process.argv.slice(2);
  if (targetPlans.length > 0) {
    for (const planId of targetPlans) {
      await expandPlan(planId);
    }
  } else {
    // Default: Process Rut og Ester, Romerbrevet, Apostlenes gjerninger, Ordspråkene
    const defaultPlans = [
      'od4PFBPUn3ve0RmpS6LE', // Rut og Ester
      'Mkzla2FPazwDntfuLTqK', // Romerbrevet
      'PtbhN3yYL2xK7JwtGGMw', // Apostlenes gjerninger
      'gYQ4ezpGuryFgiRCkxzW'  // Ordspråkene
    ];
    for (const planId of defaultPlans) {
      await expandPlan(planId);
    }
  }
  process.exit(0);
}

run();

