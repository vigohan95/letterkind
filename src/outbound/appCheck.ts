import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { outboundApp } from '../firebase';

/**
 * Proof, for the server, that a request comes from this app.
 *
 * Firebase App Check is what stops anyone with the project's public web
 * config from using its cloud model. It works by loading Google reCAPTCHA
 * on the page, and that is traffic to a third party. So it is not started
 * when the page opens, and reading a letter never starts it. The outbound
 * channel starts it, once, at the moment a request is about to go to the
 * cloud, and the page says so next to the list of what has left the device.
 *
 * Nothing from a letter is passed to it. No background refresh is asked for,
 * so it makes no further requests until the next time the channel needs it.
 */

let started = false;

export function startAppCheck(): void {
  if (started) return;
  started = true;

  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
  if (!siteKey) return;

  if (import.meta.env.DEV) {
    // The dev server's address is not a registered reCAPTCHA domain. A debug token from
    // .env.development.local stands in for it; without one, cloud requests are refused.
    const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    if (!debugToken) return;
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  initializeAppCheck(outboundApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: false,
  });
}
