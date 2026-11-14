import { type FirebaseApp, initializeApp } from 'firebase/app';

function config() {
  // Each value is named on its own, so the build puts in these six and nothing else from the environment.
  const values = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  };
  if (!values.apiKey || !values.projectId || !values.appId) {
    throw new Error('Firebase is not configured. Copy .env.example to .env.local and fill it in.');
  }
  return values;
}

let reading: FirebaseApp | undefined;
let outbound: FirebaseApp | undefined;
let baseline: FirebaseApp | undefined;

/**
 * The Firebase app the model in the browser is reached through, created on
 * first use from the build-time environment. App Check is never attached to
 * it, so nothing done through it loads reCAPTCHA.
 */
export function firebaseApp(): FirebaseApp {
  return (reading ??= initializeApp(config()));
}

/**
 * A second instance of the same app, for requests that leave the device.
 *
 * It is kept apart for a practical reason: the AI service takes up App Check
 * at the moment it is first built for an app, and reading a letter builds it
 * long before any request goes out. Only `src/outbound/` may use this one.
 */
export function outboundApp(): FirebaseApp {
  return (outbound ??= initializeApp(config(), 'outbound'));
}

/**
 * A third instance, for the evaluation's cloud baseline only: the page at
 * eval-cloud.html gives the evaluation set's made-up letters, whole, to the
 * cloud model, to measure what reading on the device costs in accuracy. The
 * app never imports that page, and a test fails the build if anything outside
 * `src/evalcloud/` uses this.
 */
export function baselineApp(): FirebaseApp {
  return (baseline ??= initializeApp(config(), 'baseline'));
}
