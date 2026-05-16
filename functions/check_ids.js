const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkIds() {
  const snap = await db.collection('podcast_transcripts').get();
  let translatedCount = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.translations || data.summary) {
      translatedCount++;
      console.log(`Document ${doc.id} HAS data (Summary: ${!!data.summary}, Translations: ${!!data.translations})`);
    }
  });
  console.log(`Total documents: ${snap.size}`);
  console.log(`Documents with summaries/translations: ${translatedCount}`);
}

checkIds();
