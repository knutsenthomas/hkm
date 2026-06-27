const admin = require('firebase-admin');
const fs = require('fs');

// Read Firebase config from JS file
const configContent = fs.readFileSync('./js/firebase-config.js', 'utf8');
const firebaseConfig = JSON.parse(
  configContent.replace('window.firebaseConfig = ', '').replace(';', '')
);

// Initialize Firebase Admin SDK with service account
// For this to work, you need to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or provide a service account file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './functions/serviceAccountKey.json';

let admin_init_config = {
  projectId: firebaseConfig.projectId
};

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin_init_config.credential = admin.credential.cert(serviceAccount);
} else {
  // Use default credentials (from environment)
  admin_init_config.credential = admin.credential.applicationDefault();
}

admin.initializeApp(admin_init_config);

const db = admin.firestore();

async function seedBlogs() {
  try {
    console.log('Starting blog seeding...');

    const blogs = [
      {
        id: 'friheten-ved-a-tilgi',
        title: 'Friheten ved å tilgi',
        author: 'Hilde Karin Knutsen',
        date: new Date('2024-01-15'),
        category: 'Tro',
        content: '<p>Tilgivelse er en kraft som frigjør både den som blir tilgitt og den som tilgir.</p>',
        seoTitle: 'Friheten ved å tilgi - HKM',
        seoDescription: 'Lær om kraften til tilgivelse i kristendommen.',
        tags: ['tilgivelse', 'tro', 'frihet']
      },
      {
        id: 'haap-i-vanskelige-tider',
        title: 'Håp i vanskelige tider',
        author: 'Hilde Karin Knutsen',
        date: new Date('2024-02-10'),
        category: 'Håp',
        content: '<p>Selv når alt ser mørkt ut, finnes det alltid håp i Guds løfter.</p>',
        seoTitle: 'Håp i vanskelige tider - HKM',
        seoDescription: 'Finn håp og styrke i kristendommen under utfordringer.',
        tags: ['håp', 'tro', 'vanskeligheter']
      },
      {
        id: 'kjarlighet-er-fundamenentet',
        title: 'Kjærlighet er fundamentet',
        author: 'Hilde Karin Knutsen',
        date: new Date('2024-03-05'),
        category: 'Kjærlighet',
        content: '<p>Kjærlighet er det høyeste buddet Jesus ga oss - elsket Gud og dine medmennesker.</p>',
        seoTitle: 'Kjærlighet er fundamentet - HKM',
        seoDescription: 'Oppdagelsen av kjærlighetens makt i Bibelen.',
        tags: ['kjærlighet', 'Jesus', 'tro']
      }
    ];

    for (const blog of blogs) {
      await db.collection('content').doc('collection_blog').collection('items').doc(blog.id).set(blog);
      console.log(`✓ Seeded: ${blog.title}`);
    }

    console.log('\n✅ Blog seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    process.exit(1);
  }
}

seedBlogs();
