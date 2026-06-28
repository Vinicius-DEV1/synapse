const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "fourth-cirrus-468923-h7.firebaseapp.com",
  projectId: "fourth-cirrus-468923-h7",
  storageBucket: "fourth-cirrus-468923-h7.firebasestorage.app",
  messagingSenderId: "380707248992",
  appId: "1:380707248992:web:4b53a35c0983459fd85c05"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const docRef = doc(db, 'config', 'auth_validator');
  const docSnap = await getDoc(docRef);
  console.log("Validator exists?", docSnap.exists());
  if (docSnap.exists()) {
    console.log("Validator data:", docSnap.data());
  }

  const pagesQuery = await getDocs(collection(db, 'pages'));
  console.log("Number of pages:", pagesQuery.size);
}

check().catch(console.error);
