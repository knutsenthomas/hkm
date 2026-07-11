const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Simple DOM Mocking for testing
global.window = {
  location: { href: "https://www.hiskingdomministry.no/leseplan-detaljer?id=P0goQTHeFCsRjwHrxI9m" }
};
global.document = {
  documentElement: { lang: "no" },
  body: { classList: { add: () => {}, remove: () => {} } },
  getElementById: (id) => {
    console.log(`[DOM Mock] getElementById: ${id}`);
    return {
      textContent: "",
      style: { display: "" },
      addEventListener: () => {},
      appendChild: () => {},
      closest: () => ({ querySelector: () => {} })
    };
  },
  querySelector: (sel) => {
    console.log(`[DOM Mock] querySelector: ${sel}`);
    return {
      style: { setProperty: () => {} },
      textContent: ""
    };
  },
  querySelectorAll: (sel) => {
    console.log(`[DOM Mock] querySelectorAll: ${sel}`);
    return [];
  },
  createElement: (tag) => {
    return { textContent: "", innerHTML: "" };
  }
};

async function inspectDoc() {
  try {
    const doc = await db.collection('reading_plans').doc('P0goQTHeFCsRjwHrxI9m').get();
    if (!doc.exists) {
      console.log("Document not found");
    } else {
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  } catch (err) {
    console.error("Error fetching doc:", err);
  }
  process.exit(0);
}

inspectDoc();
