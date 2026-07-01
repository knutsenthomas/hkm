const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findTemplates() {
  try {
    console.log("Henter ALLE maler fra newsletter_templates...");
    const snap = await db.collection('newsletter_templates').get();
    console.log(`Fant ${snap.size} dokumenter.`);
    
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`\n========================================`);
      console.log(`Dokument-ID: ${doc.id}`);
      console.log(`Navn: "${data.name}"`);
      console.log(`Emne: "${data.subject}"`);
      console.log(`Tittel: "${data.title}"`);
      console.log(`Er kladd: ${data.isDraft}`);
      console.log(`Opprettet: ${data.createdAt}`);
      if (data.blocks) {
        console.log(`Blokker: ${data.blocks.length} stk`);
        console.log(JSON.stringify(data.blocks, null, 2));
      } else {
        console.log("Ingen blokker funnet.");
      }
    });

  } catch (err) {
    console.error("Feil ved henting av maler:", err);
  }
  process.exit(0);
}

findTemplates();
