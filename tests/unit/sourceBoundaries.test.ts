import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// These tests read the source tree itself. They exist so that the privacy
// boundary is something the build enforces rather than something a reviewer
// has to take on trust.

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = sourceFiles(SRC).map((full) => ({
  path: relative(SRC, full).split(sep).join('/'),
  text: readFileSync(full, 'utf8'),
}));

const CLOUD_CAPABLE_MODES = ['ONLY_IN_CLOUD', 'PREFER_IN_CLOUD', 'PREFER_ON_DEVICE'];
const CHANNEL = 'outbound/channel.ts';
const ON_DEVICE = 'ai/onDevice.ts';
const APP_CHECK = 'outbound/appCheck.ts';

describe('source boundaries', () => {
  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('names a cloud-capable inference mode only in the outbound channel', () => {
    const offenders = files
      .filter((f) => f.path !== CHANNEL)
      .filter((f) => CLOUD_CAPABLE_MODES.some((mode) => f.text.includes(mode)))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('imports the AI SDK only in the on-device module and the outbound channel', () => {
    const offenders = files
      .filter((f) => f.path !== CHANNEL && f.path !== ON_DEVICE)
      .filter((f) => /from\s+['"](?:firebase\/ai|@firebase\/ai)/.test(f.text) || /import\(\s*['"](?:firebase\/ai|@firebase\/ai)/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('makes no direct network calls outside the outbound channel', () => {
    const direct = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew\s+WebSocket\b|\bsendBeacon\s*\(|\bnew\s+EventSource\b/;
    const offenders = files
      .filter((f) => f.path !== CHANNEL)
      .filter((f) => direct.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('imports App Check only in its own module, and starts it only from the outbound channel', () => {
    const importers = files
      .filter((f) => /['"](?:firebase\/app-check|@firebase\/app-check)/.test(f.text))
      .map((f) => f.path);
    expect(importers).toEqual([APP_CHECK]);

    const starters = files
      .filter((f) => f.path !== APP_CHECK)
      .filter((f) => /\bstartAppCheck\b/.test(f.text))
      .map((f) => f.path);
    expect(starters).toEqual([CHANNEL]);
  });

  it('keeps the app that carries App Check apart from the one that reads letters', () => {
    // The AI service takes up App Check when it is first built for an app. A request sent
    // through the app the reader already used would go out without proof and be refused.
    const users = files
      .filter((f) => f.path !== 'firebase.ts')
      .filter((f) => /\boutboundApp\b/.test(f.text))
      .map((f) => f.path)
      .sort();
    expect(users).toEqual([APP_CHECK, CHANNEL]);

    const appCheck = files.find((f) => f.path === APP_CHECK)!.text;
    expect(appCheck).toContain('initializeAppCheck(outboundApp(),');
    expect(appCheck).not.toMatch(/\bfirebaseApp\b/);

    const channel = files.find((f) => f.path === CHANNEL)!.text;
    expect(channel).toContain("getAI(where === 'device' ? firebaseApp() : outboundApp(),");
  });

  it('starts App Check after the on-device attempt, never when a module loads', () => {
    const channel = files.find((f) => f.path === CHANNEL)!.text;
    const calls = [...channel.matchAll(/^(\s*)startAppCheck\(\);$/gm)];
    expect(calls).toHaveLength(1);
    // Indented, so inside a function body rather than at the top of the module.
    expect(calls[0]![1]!.length).toBeGreaterThan(0);
    expect(channel.indexOf("modelFor(prepared, 'device')")).toBeLessThan(calls[0]!.index);
    expect(channel.indexOf("modelFor(prepared, 'cloud')")).toBeGreaterThan(calls[0]!.index);
  });

  it('never takes the build environment as a whole, only named values from it', () => {
    // `import.meta.env` used as an object is replaced by every VITE_ value at build time.
    const offenders = files.filter((f) => /import\.meta\.env(?!\.[A-Z_]+\b)/.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('keeps the on-device module on-device only', () => {
    const onDevice = files.find((f) => f.path === ON_DEVICE);
    if (!onDevice) return; // not written yet
    for (const mode of CLOUD_CAPABLE_MODES) expect(onDevice.text).not.toContain(mode);
    expect(onDevice.text).toContain('ONLY_ON_DEVICE');
  });
});
