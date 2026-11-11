import { type FirebaseApp, initializeApp } from 'firebase/app';

let app: FirebaseApp | undefined;

/** The Firebase app, created on first use from the build-time environment. */
export function firebaseApp(): FirebaseApp {
  if (app) return app;
  // Each value is named on its own, so the build puts in these six and nothing else from the environment.
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('Firebase is not configured. Copy .env.example to .env.local and fill it in.');
  }
  app = initializeApp(config);
  return app;
}
