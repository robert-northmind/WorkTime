import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { hasCompleteFirebaseConfig } from "./configValidation";

// TODO: Replace with your app's Firebase project configuration
// For development, we can use emulators or a dev project
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = hasCompleteFirebaseConfig(config);

export let USE_MOCK = import.meta.env.DEV && !hasFirebaseConfig;

let app;
let authInstance;
let dbInstance;
let analyticsInstance: Analytics | undefined;

if (!hasFirebaseConfig && import.meta.env.PROD) {
  throw new Error("Missing required Firebase configuration for production build");
}

if (!hasFirebaseConfig) {
  console.warn("Firebase configuration missing, using local mock mode.");
}

if (hasFirebaseConfig) {
  try {
    app = initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (error) {
    if (import.meta.env.PROD) {
      throw error;
    }

    console.warn("Firebase initialization failed, using local mock mode:", error);
    USE_MOCK = true;
  }

  // Analytics is non-critical. Initialize it separately so a failure here
  // (e.g. unsupported environment or missing measurementId) never breaks
  // auth/firestore or crashes the production build.
  if (app) {
    try {
      analyticsInstance = getAnalytics(app);
    } catch (error) {
      console.warn(
        "Firebase Analytics initialization failed; continuing without analytics:",
        error
      );
    }
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const analytics = analyticsInstance;
