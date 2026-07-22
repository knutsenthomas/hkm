const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'his-kingdom-ministry'
});

const db = admin.firestore();

async function inspect() {
  try {
    const collections = await db.listCollections();
    console.log('Root collections:');
    for (const col of collections) {
      console.log(`- ${col.id}`);
      // Let's search inside this collection for "covenant" or "heart" or "christians"
      const snapshot = await col.limit(100).get();
      snapshot.forEach(doc => {
        const dataStr = JSON.stringify(doc.data());
        if (dataStr.toLowerCase().includes('covenant') || dataStr.toLowerCase().includes('christians think')) {
          console.log(`  MATCH in doc: ${col.id}/${doc.id}`);
          console.log(`  Data: ${dataStr.substring(0, 300)}...`);
        }
      });
    }
  } catch (error) {
    console.error('Error listing collections:', error);
  }
  process.exit(0);
}

inspect();
