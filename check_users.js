import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit } from "firebase/firestore";

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
  const querySnapshot = await getDocs(collection(db, "users"), limit(5));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", JSON.stringify(doc.data()));
  });
  process.exit(0);
}

check();
