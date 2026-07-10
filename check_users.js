import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE",
    authDomain: "his-kingdom-ministry.firebaseapp.com",
    projectId: "his-kingdom-ministry",
    storageBucket: "his-kingdom-ministry.firebasestorage.app",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353",
    measurementId: "G-28GVKTMCZE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("--- Fetching siteContent/collection_courses ---");
  const snap1 = await getDoc(doc(db, "siteContent", "collection_courses"));
  if (snap1.exists()) {
    const data = snap1.data();
    console.log("Found siteContent/collection_courses. Items count:", data.items?.length);
    if (data.items && data.items.length > 0) {
      console.log("First item:", JSON.stringify(data.items[0], null, 2));
      console.log("All item IDs:", data.items.map(i => i.id));
    }
  } else {
    console.log("siteContent/collection_courses not found");
  }

  console.log("\n--- Fetching teaching collection (limit 3) ---");
  const querySnapshot = await getDocs(collection(db, "teaching"), limit(3));
  console.log("teaching count fetched:", querySnapshot.size);
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

check();
