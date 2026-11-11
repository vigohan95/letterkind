import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The Firebase AI SDK is the only way anything in this app can reach a model.
// Two files may import it, and nothing else:
//   src/ai/onDevice.ts      builds models that can only run on the device
//   src/outbound/channel.ts builds the models that may reach the cloud, and
//                           only accepts the closed request types
// App Check loads a third-party script, so it too has one home:
//   src/outbound/appCheck.ts, started only by the channel
const AI_SDK_BOUNDARY = {
  paths: [
    {
      name: 'firebase/ai',
      message:
        'Only src/ai/onDevice.ts and src/outbound/channel.ts may import firebase/ai. Go through one of them.',
    },
    {
      name: 'firebase/app-check',
      message: 'Only src/outbound/appCheck.ts may import firebase/app-check. The outbound channel starts it.',
    },
  ],
  patterns: [
    {
      group: ['@firebase/ai', '@firebase/ai/*', 'firebase/ai/*'],
      message: 'Only src/ai/onDevice.ts and src/outbound/channel.ts may import the AI SDK.',
    },
    {
      group: ['@firebase/app-check', '@firebase/app-check/*', 'firebase/app-check/*'],
      message: 'Only src/outbound/appCheck.ts may import App Check.',
    },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', AI_SDK_BOUNDARY],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'No direct network calls. Outbound traffic goes through src/outbound/channel.ts.' },
        { name: 'XMLHttpRequest', message: 'No direct network calls.' },
        { name: 'WebSocket', message: 'No direct network calls.' },
        { name: 'EventSource', message: 'No direct network calls.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'No direct network calls.' },
      ],
    },
  },
  {
    files: ['src/ai/onDevice.ts', 'src/outbound/channel.ts', 'src/outbound/appCheck.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
);
