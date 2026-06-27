const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function inspectDoc() {
  try {
    const doc = await db.collection('reading_plans').doc('P0goQTHeFCsRjwHrxI9m').get();
    if (!doc.exists) {
      console.log("Document not found");
    } else {
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  } catch (err) {
    console.error("Error fetching doc:", err);
  }
  process.exit(0);
}

inspectDoc();
