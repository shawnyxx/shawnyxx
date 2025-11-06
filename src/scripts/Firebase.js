// Firebase module adapted for Vite + environment variables
// This file imports the firebase SDK from the npm package and reads
// configuration from Vite environment variables (import.meta.env).
// If you keep legacy non-module scripts that expect globals, this file
// also attaches `firebaseApp` and `firebaseDB` to window for compatibility.

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Build firebase config from Vite env variables (VITE_ prefix required)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "ecxogames-2025.firebaseapp.com",
    databaseURL: "https://ecxogames-2025-default-rtdb.firebaseio.com",
    projectId: "ecxogames-2025",
    storageBucket: "ecxogames-2025.firebasestorage.app",
    messagingSenderId: "1094045713542",
    appId: "1:1094045713542:web:58593c6827e557ee8f7d07",
    measurementId: "G-C620XL89B9"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    // Analytics can throw in non-browser or restricted environments; guard it
    // This ensures initialization doesn't break the app during SSR/builds or when analytics is blocked
    // eslint-disable-next-line no-console
    console.warn('Firebase analytics not initialized:', e?.message || e);
}

const db = getFirestore(app);
const auth = getAuth(app);

// Sign in anonymously
signInAnonymously(auth).catch((error) => {
    console.warn('Anonymous sign-in failed:', error);
});

// Export for ES module consumers
export { app, analytics, db, auth };

// Provide globals for legacy scripts that expect window.firebaseApp / window.firebaseDB
if (typeof window !== 'undefined') {
    window.firebaseApp = app;
    window.firebaseDB = db;
    window.firebaseAuth = auth;
}