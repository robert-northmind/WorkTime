import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Check if config is valid (basic check)
export const USE_MOCK = !config.apiKey || config.apiKey === "your_api_key";

let app;
let authInstance;
let dbInstance;
let analyticsInstance: Analytics | undefined;

if (!USE_MOCK) {
  try {
    app = initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    analyticsInstance = getAnalytics(app);
  } catch (error) {
    console.warn(
      "Firebase initialization failed, falling back to mock mode:",
      error
    );
    // Fallback if initialization fails even with keys
    app = initializeApp({}); // Dummy init to satisfy types if needed, or just leave null
    // actually we can't really init with empty config if we want to avoid errors.
    // We'll just handle the nulls in the services or rely on USE_MOCK
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const analytics = analyticsInstance;
