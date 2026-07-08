// Writes a `{ "type": "module" }` marker into an ESM build output directory so
// Node treats the emitted `.js` files as ES modules (the root package is CJS).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('usage: write-esm-marker.mjs <dir>');
  process.exit(1);
}

const dir = resolve(process.cwd(), target);
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
