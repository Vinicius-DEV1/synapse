import { initializeApp } from "firebase/app";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { platform } from "./platform";

// Firebase credentials loaded from Vite environment variables (VITE_ prefix)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase app instance
export const app = initializeApp(firebaseConfig);

// Firebase service instances exported for application use
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: platform.platform === 'desktop'
});
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to local Firebase Emulators if configured
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
    const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT) || 8080;
    const authUrl = import.meta.env.VITE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';

    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
    console.info('[Firebase] Connected to local Emulators (Firestore & Auth)');
  } catch (emuErr) {
    console.debug('[Firebase] Emulator connection skipped or already initialized:', emuErr);
  }
}

