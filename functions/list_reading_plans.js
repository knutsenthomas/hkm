const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listPlans() {
  try {
    console.log("Fetching reading plans from Firestore...");
    const snap = await db.collection('reading_plans').get();
    console.log(`Found ${snap.size} reading plans.`);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} -> Title: ${data.title}`);
    });
  } catch (err) {
    console.error("Error listing plans:", err);
  }
  process.exit(0);
}

listPlans();
