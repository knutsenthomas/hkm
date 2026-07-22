const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'his-kingdom-ministry'
  });
}

const db = admin.firestore();

async function run() {
  console.log("Fetching latest donations...");
  const snap = await db.collection('donations')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  if (snap.empty) {
    console.log("No donations found.");
    return;
  }

  snap.forEach(doc => {
    console.log(`\nID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
