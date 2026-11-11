// Fails if the working tree or any commit carries something that should not be
// published: local user or host names, absolute home-directory paths, API keys,
// App Check debug tokens, private keys.
//
// The current OS user name and host name are checked automatically, so they are
// never written in this file. Extra words can be listed one per line in
// .prepublish-deny.local (git-ignored).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const patterns = [
  ['Windows home path', /[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"']+/],
  ['macOS home path', /\/Users\/[A-Za-z0-9._-]+\//],
  ['Linux home path', /\/home\/(?!runner\/)[A-Za-z0-9._-]+\//],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['App Check debug token', /DEBUG_TOKEN["']?\s*[:=]\s*["']?[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['bearer token', /\bBearer\s+[A-Za-z0-9._-]{24,}/],
];

const words = new Set();
const addWord = (w) => {
  const word = (w ?? '').trim();
  if (word.length >= 3) words.add(word);
};
try {
  addWord(os.userInfo().username);
} catch {
  // No user database entry (some containers); nothing to add.
}
addWord(os.hostname());
if (existsSync('.prepublish-deny.local')) {
  for (const line of readFileSync('.prepublish-deny.local', 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('#')) addWord(line);
  }
}
// CI runners have generic names that can legitimately appear in docs.
for (const generic of ['runner', 'root', 'node', 'localhost']) words.delete(generic);
for (const word of words) {
  patterns.push([`local name "${word.slice(0, 2)}…"`, new RegExp(`\\b${escape(word)}\\b`, 'i')]);
}

const findings = [];
const scan = (where, text) => {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [label, re] of patterns) {
      if (re.test(lines[i])) findings.push(`${where}:${i + 1}: ${label}`);
    }
  }
};

const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
for (const file of tracked) {
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|pdf)$/i.test(file)) continue;
  if (!existsSync(file)) continue;
  scan(file, readFileSync(file, 'utf8'));
}

let hasCommits = true;
try {
  git('rev-parse', '--verify', 'HEAD');
} catch {
  hasCommits = false;
}
if (hasCommits) {
  // Every added line in every commit on every ref, plus author and message.
  const history = git('log', '--all', '-p', '--no-color', '--format=commit %H%n%an <%ae>%n%cn <%ce>%n%B');
  let commit = '';
  for (const line of history.split('\n')) {
    if (line.startsWith('commit ')) commit = line.slice(7, 17);
    if (line.startsWith('-') && !line.startsWith('---')) continue;
    for (const [label, re] of patterns) {
      if (re.test(line)) findings.push(`history ${commit}: ${label}`);
    }
  }
}

if (findings.length > 0) {
  console.error(`prepublish-check: ${findings.length} problem(s)`);
  for (const f of [...new Set(findings)].slice(0, 50)) console.error('  ' + f);
  process.exit(1);
}
console.log(
  `prepublish-check: clean (${tracked.length} tracked files, ${patterns.length} patterns, history ${hasCommits ? 'scanned' : 'empty'})`,
);
