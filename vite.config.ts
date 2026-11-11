import { execFileSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  build: {
    rollupOptions: {
      // Two pages: the app, and the evaluation page anyone can run for themselves.
      input: { main: 'index.html', eval: 'eval.html' },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
