const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  try {
    const doc = await db.collection('reading_plans').doc('P0goQTHeFCsRjwHrxI9m').get();
    if (doc.exists) {
      const data = doc.data();
      console.log(JSON.stringify({
        id: doc.id,
        title: data.title,
        durationDays: data.durationDays,
        daysCount: data.days ? data.days.length : 0,
        days: data.days.slice(0, 10) // Inspect first 10 days
      }, null, 2));
    } else {
      console.log('Not found');
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
