import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "fourth-cirrus-468923-h7.firebaseapp.com",
  projectId: "fourth-cirrus-468923-h7",
  storageBucket: "fourth-cirrus-468923-h7.firebasestorage.app",
  messagingSenderId: "380707248992",
  appId: "1:380707248992:web:4b53a35c0983459fd85c05"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
