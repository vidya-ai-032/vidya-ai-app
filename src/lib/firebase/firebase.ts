// src/lib/firebase/firebase.ts
// This file initializes the Firebase application and exports its services.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // For Firebase Authentication
import { getFirestore } from "firebase/firestore"; // For Cloud Firestore Database
import { getStorage } from "firebase/storage"; // For Firebase Storage

// Your web app's Firebase configuration
// Use NEXT_PUBLIC_ prefix for environment variables accessible on the client-side
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already
// This prevents multiple initializations in development due to hot-reloading
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app); // 'db' for Firestore
export const storage = getStorage(app); // 'storage' for Firebase Storage
