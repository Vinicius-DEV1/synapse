const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDlyok0x6CSJgVq-rKCsFqIAonxR5ezR_c",
  authDomain: "fourth-cirrus-468923-h7.firebaseapp.com",
  projectId: "fourth-cirrus-468923-h7",
  storageBucket: "fourth-cirrus-468923-h7.firebasestorage.app",
  messagingSenderId: "380707248992",
  appId: "1:380707248992:web:4b53a35c0983459fd85c05"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
  try {
    const docRef = doc(db, 'config', 'auth_validator');
    await setDoc(docRef, {
      encryptedData: "test_data_from_script",
      updatedAt: new Date().toISOString()
    });
    console.log("Successfully wrote to Firebase!");
  } catch (err) {
    console.error("Failed to write to Firebase:", err);
  }
}

testWrite();
