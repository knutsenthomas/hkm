const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Universal Parser logic
function parseSinglePassage(passageStr) {
    // Strip trailing parenthesis e.g. "Salme 119 (Utvalgte vers)" -> "Salme 119"
    let clean = passageStr.replace(/\(.*?\)/g, '').trim();

    // Check "til" / "to" / "a" cross-book range e.g. "1. Mosebok 40 til 2. Mosebok 2"
    const tilMatch = clean.match(/^(.+?)\s+(?:til|to|a)\s+(.+)$/i);
    if (tilMatch) {
        return {
            type: 'cross_book_range',
            startRef: parseSinglePassage(tilMatch[1]),
            endRef: parseSinglePassage(tilMatch[2]),
            raw: passageStr
        };
    }

    // Check Format 1: Chapter range: "Ester 1-3", "Ester 4-7", "1. Mosebok 1-3", "Salmene 1-5"
    const chapRangeRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)\s*-\s*(\d+)$/i;
    let match = clean.match(chapRangeRegex);
    if (match) {
        return {
            type: 'chap_range',
            book: (match[1] ? match[1] + ' ' : '') + match[2].trim(),
            startChap: parseInt(match[3], 10),
            endChap: parseInt(match[4], 10),
            raw: passageStr
        };
    }

    // Check Format 2: Verse range: "Rut 2:1-10", "Johannes 3:16-21"
    const verseRangeRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)[\:\.]\s*(\d+)(?:\s*-\s*(\d+))?$/i;
    match = clean.match(verseRangeRegex);
    if (match) {
        return {
            type: 'verse_range',
            book: (match[1] ? match[1] + ' ' : '') + match[2].trim(),
            chap: parseInt(match[3], 10),
            startV: parseInt(match[4], 10),
            endV: match[5] ? parseInt(match[5], 10) : parseInt(match[4], 10),
            raw: passageStr
        };
    }

    // Check Format 3: Single chapter: "Rut 1", "Ester 4"
    const singleChapRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)$/i;
    match = clean.match(singleChapRegex);
    if (match) {
        return {
            type: 'single_chap',
            book: (match[1] ? match[1] + ' ' : '') + match[2].trim(),
            chap: parseInt(match[3], 10),
            raw: passageStr
        };
    }

    return { error: 'UNPARSED_FORMAT', input: passageStr };
}

function parseUniversalVerses(input) {
    if (!input || typeof input !== 'string') return { error: 'Empty string' };
    
    const parts = input.split(/\s+&\s+|\s+og\s+|\s+and\s+|\s+y\s+/i);
    const parsedParts = [];
    
    for (const part of parts) {
        const res = parseSinglePassage(part);
        if (res.error) return res;
        parsedParts.push(res);
    }
    
    return { type: 'multi_passage', parts: parsedParts };
}

async function listPlans() {
  try {
    const snap = await db.collection('reading_plans').get();
    console.log(`Auditing ${snap.docs.length} reading plans with Universal Parser...\n`);
    
    let totalDaysChecked = 0;
    let totalErrors = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      console.log(`DOC ID: "${doc.id}" | TITLE: "${data.title}" | SLUG: "${data.slug}"`);
      const days = data.days || [];
      totalDaysChecked += days.length;
      let planErrors = [];

      days.forEach((d, idx) => {
        const res = parseUniversalVerses(d.verses);
        if (res.error) {
          planErrors.push({ day: d.dayNumber || (idx + 1), verses: d.verses, error: res.error });
        }
      });

      if (planErrors.length > 0) {
        totalErrors += planErrors.length;
        console.log(`❌ Plan "${data.title}" (ID: ${doc.id}) has ${planErrors.length} unparsed days:`);
        console.log(JSON.stringify(planErrors.slice(0, 5), null, 2));
      } else {
        console.log(`✅ Plan "${data.title}" (${days.length} days) -> 100% PASS`);
      }
    }

    console.log(`\n==================================================`);
    console.log(`Total Days Checked: ${totalDaysChecked}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Status: ${totalErrors === 0 ? 'ALL PLANS PASSED 100% 🎉' : 'ERRORS FOUND'}`);
  } catch (err) {
    console.error("Error listing plans:", err);
  }
  process.exit(0);
}

listPlans();
