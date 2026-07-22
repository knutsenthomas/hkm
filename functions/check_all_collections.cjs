const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  console.log("Listing all root collections...");
  const collections = await db.listCollections();
  console.log("Collections found:", collections.map(c => c.id));

  for (const coll of collections) {
    const collId = coll.id;
    const snap = await db.collection(collId).get();
    console.log(`Collection "${collId}" has ${snap.size} documents.`);
    
    // Search within this collection for "knutsenthomas"
    snap.forEach(doc => {
      const data = doc.data();
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes("knutsenthomas") || str.includes("93094615")) {
        console.log(`  -> Match found in collection "${collId}", doc ID: ${doc.id}`);
        console.log(JSON.stringify(data, null, 2));
      }
    });
  }
}

check().catch(console.error);
