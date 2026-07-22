const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  console.log("Scanning ALL donations in the collection...");
  const snap = await db.collection('donations').get();
  console.log(`Total donations in database: ${snap.size}`);

  let matches = [];
  snap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data).toLowerCase();
    if (str.includes("thomas") || str.includes("knutsen") || str.includes("93094615")) {
      matches.push({ id: doc.id, data });
    }
  });

  if (matches.length === 0) {
    console.log("No donations found containing 'thomas', 'knutsen', or the phone number '93094615'.");
  } else {
    console.log(`Found ${matches.length} matching donations:`);
    matches.forEach(m => {
      console.log(`\nDonation ID: ${m.id}`);
      console.log(JSON.stringify(m.data, null, 2));
    });
  }
}

check().catch(console.error);
