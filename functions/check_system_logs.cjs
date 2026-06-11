const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  console.log("Scanning all system_logs for payment-related logs...");
  const snap = await db.collection('system_logs').get();
  console.log(`Total logs in system_logs: ${snap.size}`);

  let matches = [];
  snap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data).toLowerCase();
    if (str.includes("vipps") || str.includes("stripe") || str.includes("webhook") || str.includes("donation") || str.includes("gave")) {
      matches.push({ id: doc.id, ...data });
    }
  });

  if (matches.length === 0) {
    console.log("No payment-related logs found.");
  } else {
    console.log(`Found ${matches.length} matching logs:`);
    matches.forEach(e => {
      console.log(`- ID: ${e.id}, Severity: ${e.severity}, Type: ${e.type}, Message: ${e.message}`);
    });
  }
}

check().catch(console.error);
