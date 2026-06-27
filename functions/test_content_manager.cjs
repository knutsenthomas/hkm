const fs = require('fs');
const path = require('path');

// Simulate browser environment BEFORE importing content-manager
global.window = {
    location: {
        hostname: 'localhost',
        pathname: '/leseplan-detaljer'
    },
    addEventListener: () => {}
};
global.document = {
    documentElement: {
        lang: 'no'
    },
    getElementById: () => null,
    createElement: () => ({ appendChild: () => {}, setAttribute: () => {}, textContent: '' }),
    head: { appendChild: () => {} }
};
global.localStorage = {
    getItem: () => null,
    setItem: () => null
};
global.firebaseConfig = {
    projectId: "his-kingdom-ministry",
    apiKey: "dummy-key"
};

// Evaluate content-manager.js inside global context
const cmPath = path.join(__dirname, '../js/content-manager.js');
const cmCode = fs.readFileSync(cmPath, 'utf8');

// JSDOM-like environment setup for simple calls
global.window.contentManager = null;

// Read content-manager code, but since it has "import" statement at line 5:
// "import { InteractionsManager } from './interactions.js';"
// We can strip out standard ES module imports for evaluating in CommonJS Node,
// because we don't need InteractionsManager to test getLocalizedContentItem!
const cmCodeCleaned = cmCode.replace(/import\s+[\s\S]*?from\s+['\"].*?['\"];/g, '');

try {
    eval(cmCodeCleaned);
    console.log("content-manager.js evaluated successfully.");
} catch (e) {
    console.error("Failed to evaluate content-manager.js:", e);
    process.exit(1);
}

// Initialize Firebase Admin
const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function runTest() {
    try {
        const snap = await db.collection('reading_plans').doc('P0goQTHeFCsRjwHrxI9m').get();
        if (!snap.exists) {
            console.error("Plan not found in Firestore!");
            return;
        }
        const plan = { id: snap.id, ...snap.data() };
        console.log("Fetched plan:", plan.title);

        console.log("\nTesting Norwegian ('no')...");
        global.document.documentElement.lang = 'no';
        let localizedNo = global.window.contentManager.getLocalizedContentItem(plan);
        console.log("No Title:", localizedNo.title);
        console.log("No Intro Title:", localizedNo.introduction?.title);

        console.log("\nTesting English ('en')...");
        global.document.documentElement.lang = 'en';
        let localizedEn = global.window.contentManager.getLocalizedContentItem(plan);
        console.log("En Title:", localizedEn.title);
        console.log("En Intro Title:", localizedEn.introduction?.title);

        console.log("\nTesting Spanish ('es')...");
        global.document.documentElement.lang = 'es';
        let localizedEs = global.window.contentManager.getLocalizedContentItem(plan);
        console.log("Es Title:", localizedEs.title);
        console.log("Es Intro Title:", localizedEs.introduction?.title);

        console.log("\nAll tests completed successfully!");
    } catch (err) {
        console.error("Test failed with error:", err);
    }
    process.exit(0);
}

runTest();
