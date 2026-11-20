// Vice Hour v2 — hand-in program for the gta6-cover-art-01 bounty.
// The deliverable is the static web app in app/ (plain HTML, CSS and ES
// modules; no build step, no network). This program copies app/ and
// screenshots/ into the output directory and writes dossier.json there
// with the vendored make.fun library, exactly as the scorer expects.
// Node 22 standard library only. Run locally with:
//   MAKEFUN_OUTPUT_DIR=/tmp/vice-hour-out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(targetDir, { recursive: true });
cpSync(join(rootDir, 'app'), join(targetDir, 'app'), { recursive: true });
if (existsSync(join(rootDir, 'screenshots'))) {
  mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
  cpSync(join(rootDir, 'screenshots'), join(targetDir, 'screenshots'), { recursive: true });
}

const dossierBytes = buildDossier(targetDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(targetDir, 'dossier.json'), dossierBytes);
console.log(`Vice Hour handed in to ${targetDir} (dossier ${dossierBytes.length} bytes)`);
