// Rename this file to firebase-config.js and paste your Firebase Web App config.
// This config is not a password. Firebase security must be enforced by Firestore rules.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Put your own Firebase Authentication UID here after creating your admin account.
// The Firestore rules must contain the same UID.
export const ADMIN_UID = "YOUR_ADMIN_FIREBASE_UID";
