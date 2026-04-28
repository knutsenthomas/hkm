require('dotenv').config({path:'.env'});
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

(async () => {
  try {
    const postIdToCleanup = '69707d33267e9ce8b5a862b7';
    console.log(`\nSearching for duplicates of post: ${postIdToCleanup}\n`);
    
    const snap = await db.collection('content').doc('collection_blog').get();
    if (!snap.exists) {
      console.log('ERROR: collection_blog not found');
      process.exit(1);
    }

    const data = snap.data();
    const items = Array.isArray(data.items) ? data.items : [];
    
    const matches = items.filter(item => item._id === postIdToCleanup || item.id === postIdToCleanup);
    
    console.log(`Found ${matches.length} matching items:\n`);
    matches.forEach((m, i) => {
      console.log(`  [${i}] ${m.title || m.slug || 'Untitled'}`);
      console.log(`      Source: ${m.source}, ID: ${m._id}`);
      console.log(`      Date: ${m.date || 'N/A'}`);
      console.log();
    });

    if (matches.length < 2) {
      console.log('No duplicates found!');
      process.exit(0);
    }

    let toKeep = matches[0];
    for (const item of matches) {
      const itemSource = String(item.source || '').toLowerCase();
      const keepSource = String(toKeep.source || '').toLowerCase();
      
      if (itemSource === 'wix' && keepSource !== 'wix') {
        toKeep = item;
      } else if (itemSource === keepSource && itemSource !== 'wix') {
        const itemFieldCount = Object.keys(item).length;
        const keepFieldCount = Object.keys(toKeep).length;
        if (itemFieldCount > keepFieldCount) {
          toKeep = item;
        }
      }
    }

    const filtered = items.filter(item => !(item._id === postIdToCleanup || item.id === postIdToCleanup) || item === toKeep);
    
    console.log(`Keeping: ${toKeep.title || toKeep.slug || 'Untitled'} (${toKeep.source})`);
    console.log(`Removing ${matches.length - 1} duplicate(s)\n`);
    
    await db.collection('content').doc('collection_blog').update({
      items: filtered,
      cleanupAt: admin.firestore.FieldValue.serverTimestamp(),
      cleanupPostId: postIdToCleanup,
      cleanupRemoved: matches.length - 1
    });

    console.log('✓ Cleanup complete! Duplication removed from Firestore.\n');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();
