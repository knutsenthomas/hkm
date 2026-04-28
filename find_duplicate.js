require('dotenv').config({path:'.env'});
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  try {
    // Finn duplikatene i collection_blog
    const snap = await db.collection('content').doc('collection_blog').get();
    if (!snap.exists) {
      console.log('collection_blog finnes ikke');
      process.exit(1);
      return;
    }
    
    const colData = snap.data();
    const allPosts = Array.isArray(colData.items) ? colData.items : [];
    
    // Finn alle med samme ID
    const postId = '69707d33267e9ce8b5a862b7';
    const matches = allPosts.filter(p => p._id === postId || p.id === postId);
    
    console.log(JSON.stringify({
      found: matches.length,
      matches: matches.map(m => ({
        _id: m._id,
        id: m.id,
        title: m.title,
        source: m.source,
        wixGuid: m.wixGuid,
        slug: m.slug,
        date: m.date,
        url: m.url,
        link: m.link
      }))
    }, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();
