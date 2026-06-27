const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assumes this exists or I'll need to use default credentials

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixBranding() {
    console.log('Oppdaterer branding i Firestore...');
    
    const docsToUpdate = [
        { col: 'siteContent', id: 'settings_seo', updates: { globalTitle: 'His Kingdom Ministry', siteTitle: 'His Kingdom Ministry' } },
        { col: 'siteContent', id: 'settings_design', updates: { logoText: 'His Kingdom Ministry' } }
    ];

    for (const item of docsToUpdate) {
        try {
            await db.collection(item.col).doc(item.id).update(item.updates);
            console.log(`✅ Oppdatert ${item.col}/${item.id}`);
        } catch (error) {
            console.warn(`⚠️ Kunne ikke oppdatere ${item.col}/${item.id}: ${error.message}`);
            // Try set if update fails
            try {
                await db.collection(item.col).doc(item.id).set(item.updates, { merge: true });
                console.log(`✅ Opprettet/Sammenslått ${item.col}/${item.id}`);
            } catch (e) {
                console.error(`❌ Feilet helt for ${item.col}/${item.id}`);
            }
        }
    }
}

fixBranding().then(() => process.exit(0));
