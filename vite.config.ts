import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/** The commit a build was made from, so an evaluation result can say which code produced it. */
function buildCommit(): string {
  const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return git('rev-parse', '--short', 'HEAD') + (git('status', '--porcelain') === '' ? '' : '-dirty');
  } catch {
    return 'unknown';
  }
}

/** The response headers the hosted site sends, so a local preview is held to the same content security policy. */
function hostedHeaders(): Record<string, string> {
  const { hosting } = JSON.parse(readFileSync('firebase.json', 'utf8')) as {
    hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] };
  };
  const everywhere = hosting.headers.find((rule) => rule.source === '**');
  return Object.fromEntries((everywhere?.headers ?? []).map(({ key, value }) => [key, value]));
}

export default defineConfig(({ mode }) => {
  // An App Check debug token lets any machine pass for this app. It belongs in
  // .env.development.local only; a build that could carry one is refused.
  if (mode === 'production' && loadEnv(mode, process.cwd(), 'VITE_').VITE_APPCHECK_DEBUG_TOKEN) {
    throw new Error('VITE_APPCHECK_DEBUG_TOKEN is set for a production build. Keep it in .env.development.local only.');
  }
  return config;
});

const config = {
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  preview: { headers: hostedHeaders() },
  build: {
    rollupOptions: {
      // The app; the evaluation page anyone can run for themselves on the model in their browser;
      // and the cloud baseline the evaluation is compared with, which the app never loads.
      input: { main: 'index.html', eval: 'eval.html', evalCloud: 'eval-cloud.html' },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node' as const,
  },
};
