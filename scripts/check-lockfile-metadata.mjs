#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const [manifestText, lockText] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../package-lock.json', import.meta.url), 'utf8'),
]);
const manifest = JSON.parse(manifestText);
const lock = JSON.parse(lockText);
const root = lock.packages?.[''];

if (!root) {
  console.error('package-lock.json is missing packages[""] root metadata');
  process.exit(1);
}

for (const field of ['name', 'version', 'license', 'bin', 'engines', 'scripts']) {
  const expected = manifest[field];
  const actual = root[field];
  const normalize = (field, value) => field === 'bin' && value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([name, target]) => [name, target.replace(/^\.\//, '')]))
    : value;
  if (JSON.stringify(normalize(field, actual)) !== JSON.stringify(normalize(field, expected))) {
    console.error(`package-lock.json root ${field} does not match package.json`);
    process.exitCode = 1;
  }
}

if (process.exitCode) process.exit();
console.log('package-lock.json root metadata matches package.json');
