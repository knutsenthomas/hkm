let admin;
try {
  admin = require('firebase-admin');
} catch (_) {
  admin = require('/Users/thomasknutsen/Documents/Nettside - HKM/functions/node_modules/firebase-admin');
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'his-kingdom-ministry'
  });
}
const db = admin.firestore();

(async () => {
  try {
    const snap = await db.collection('content').doc('collection_blog').get();
    if (!snap.exists) {
      console.error('collection_blog not found');
      process.exit(1);
    }
    const data = snap.data();
    const items = data.items || [];
    console.log(`Total blog items: ${items.length}`);
    const firstItem = items[0];
    if (firstItem) {
      console.log('First item metadata:', {
        id: firstItem.id,
        title: firstItem.title,
        published: firstItem.published,
        hasContent: !!firstItem.content,
        contentType: typeof firstItem.content,
        contentKeys: firstItem.content && typeof firstItem.content === 'object' ? Object.keys(firstItem.content) : null
      });
      if (firstItem.content) {
        console.log('First item content JSON:', JSON.stringify(firstItem.content, null, 2));
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
})();
