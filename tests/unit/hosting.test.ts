import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The outbound channel limits what can be sent. The content security policy
// the site is served with limits where the browser will send anything at all.
// These tests pin that policy, so widening it is a visible, reviewed change.

interface Rule {
  source: string;
  headers: { key: string; value: string }[];
}

const { hosting } = JSON.parse(readFileSync('firebase.json', 'utf8')) as { hosting: { public: string; headers: Rule[] } };

const everywhere = hosting.headers.find((rule) => rule.source === '**');
const header = (key: string): string => everywhere?.headers.find((h) => h.key === key)?.value ?? '';

const policy = new Map(
  header('Content-Security-Policy')
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .map(([name = '', ...values]) => [name, values] as const),
);

describe('the policy the site is served with', () => {
  it('serves the built app', () => {
    expect(hosting.public).toBe('dist');
  });

  it('lets the page connect to itself, the cloud model, App Check and reCAPTCHA, and nowhere else', () => {
    expect([...(policy.get('connect-src') ?? [])].sort()).toEqual(
      [
        "'self'",
        'blob:',
        'data:',
        'https://content-firebaseappcheck.googleapis.com',
        'https://firebasevertexai.googleapis.com',
        'https://www.google.com/recaptcha/',
      ].sort(),
    );
  });

  it('runs only its own scripts and reCAPTCHA, with nothing inline and nothing evaluated', () => {
    const scripts = policy.get('script-src') ?? [];
    expect([...scripts].sort()).toEqual(["'self'", 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'].sort());
    for (const values of policy.values()) {
      expect(values).not.toContain("'unsafe-inline'");
      expect(values).not.toContain("'unsafe-eval'");
      expect(values).not.toContain('*');
    }
  });

  it('falls back to the site itself for anything not named', () => {
    expect(policy.get('default-src')).toEqual(["'self'"]);
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'none'"]);
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('frames nothing but reCAPTCHA', () => {
    expect([...(policy.get('frame-src') ?? [])].sort()).toEqual(['https://recaptcha.google.com/recaptcha/', 'https://www.google.com/recaptcha/']);
  });

  it('has the browser ask for the page each time, and keeps only the fingerprinted files', () => {
    // A stale page would keep running an old build, with whatever it used to allow.
    expect(header('Cache-Control')).toBe('no-cache');
    const assets = hosting.headers.find((rule) => rule.source === '/assets/**');
    expect(assets?.headers.find((h) => h.key === 'Cache-Control')?.value).toContain('immutable');
    // The later rule wins where both match, so it has to be the one for the fingerprinted files.
    expect(hosting.headers.indexOf(assets!)).toBeGreaterThan(hosting.headers.indexOf(everywhere!));
  });

  it('sends no referrer and no guessed content types', () => {
    expect(header('Referrer-Policy')).toBe('no-referrer');
    expect(header('X-Content-Type-Options')).toBe('nosniff');
  });
});
