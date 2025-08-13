// src/lib/firebase/admin.ts
import * as admin from "firebase-admin";

// Check if a Firebase Admin app has already been initialized
// This prevents re-initialization errors in Next.js development environment (hot reloading)
if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  // NEW: Get the storage bucket from environment variables for Admin SDK
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccountBase64) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY_BASE64 environment variable is not set. Please provide the Base64 encoded service account key."
    );
  }
  // NEW: Add a check for storageBucket
  if (!storageBucket) {
    // FIXED: Removed the duplicate 'new' keyword
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set. Please define your Firebase Storage bucket."
    );
  }

  // Decode the Base64 string back to JSON.
  const serviceAccountJson = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
    // FIXED: Specify the storageBucket for the Admin SDK
    storageBucket: storageBucket,
  });
}

// Export the Firestore instance from the Admin SDK
export const adminDb = admin.firestore();
// Export the Storage instance from the Admin SDK as well if needed elsewhere
export const adminStorage = admin.storage();
