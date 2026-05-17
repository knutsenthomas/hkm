const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkIds() {
  const snap = await db.collection('podcast_transcripts').get();
  let completedCount = 0;
  console.log('--- AUDITING PODCAST TRANSCRIPTS ---');
  snap.forEach(doc => {
    const data = doc.data();
    const hasSummary = !!data.summary;
    const hasTranslations = !!data.translations && Object.keys(data.translations).length > 0;
    const hasText = !!data.text;
    
    if (hasSummary && hasTranslations && hasText) {
      completedCount++;
    } else {
      console.log(`Document [${doc.id}] (${data.title || 'Uten tittel'}):`);
      console.log(`  - Text: ${hasText}`);
      console.log(`  - Summary: ${hasSummary}`);
      console.log(`  - Translations: ${hasTranslations}`);
    }
  });
  console.log('-----------------------------------');
  console.log(`Total documents: ${snap.size}`);
  console.log(`Fully complete documents: ${completedCount}`);
}

checkIds();
