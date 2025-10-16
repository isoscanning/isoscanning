// Firebase Configuration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if all required environment variables are set
export const FIREBASE_ENABLED =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

// Initialize Firebase services
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (FIREBASE_ENABLED) {
  try {
    // Initialize Firebase
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Initialize Analytics (only on client side and if supported)
    if (typeof window !== "undefined") {
      isSupported().then((supported) => {
        if (supported && firebaseConfig.measurementId) {
          analytics = getAnalytics(app);
        }
      });
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    throw new Error(
      "Failed to initialize Firebase. Please check your configuration."
    );
  }
} else {
  console.warn("⚠️ Firebase not initialized - missing environment variables");
  throw new Error(
    "Firebase configuration is incomplete. Please check your environment variables."
  );
}

export { app, auth, db, storage, analytics };
