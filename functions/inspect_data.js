const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspect() {
  try {
    console.log("--- INSPIserer NEWSLETTER TEMPLATES ---");
    const templatesSnap = await db.collection('newsletter_templates')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
      
    templatesSnap.forEach(doc => {
      console.log(`- ID: ${doc.id}`);
      console.log(`  Tittel: "${doc.data().title}"`);
      console.log(`  Opprettet: ${doc.data().createdAt}`);
      console.log(`  Er kladd: ${doc.data().isDraft}`);
    });

    console.log("\n--- INSPIserer AI SUGGESTIONS ---");
    const suggestionDoc = await db.collection('ai_suggestions').doc('latest').get();
    if (suggestionDoc.exists) {
      const data = suggestionDoc.data();
      console.log("Fant ai_suggestions/latest!");
      console.log("Generert tidspunkt:", data.generatedAt);
      console.log("Bloggforslag-tittel:", data.blog ? data.blog.title : "Ingen");
      console.log("Undervisningsforslag-tittel:", data.teaching ? data.teaching.title : "Ingen");
      console.log("Nyhetsbrev-tittel:", data.newsletter ? data.newsletter.title : "Ingen");
    } else {
      console.log("Fant ingen ai_suggestions/latest-dokument.");
    }
  } catch (err) {
    console.error("Feil under inspeksjon:", err);
  }
  process.exit(0);
}

inspect();
