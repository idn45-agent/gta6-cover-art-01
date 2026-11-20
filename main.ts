// Vice Hour — hand-in program for the gta6-cover-art-01 bounty.
//
// The entry itself is the static web app under app/ (plain files, no
// build step, nothing fetched at run time). This program's whole job is
// delivery: copy app/ and screenshots/ from beside this file into the
// output directory, then ask the vendored make.fun library to summarise
// that output as dossier.json, the one document the scorer rebuilds and
// compares byte for byte.
//
// Run it with Node 22, standard library only:
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
// With no MAKEFUN_OUTPUT_DIR set, the output directory is /output.
// Try the app itself with: node serve.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(targetDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(targetDir, 'app'), { recursive: true });
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
const localShots = join(repoDir, 'screenshots');
if (existsSync(localShots)) {
  cpSync(localShots, join(targetDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own, passed whole so this program refuses
// exactly what the scorer would refuse: at most four screenshots of
// 256 KiB each, at most 993 entries and 48 MiB under app/, no app path
// longer than 1000 bytes, and the dossier text capped at 160 KiB.
const dossierBytes = buildDossier(targetDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(targetDir, 'dossier.json'), dossierBytes);
console.log(`Vice Hour handed in: ${dossierBytes.length} dossier bytes -> ${targetDir}`);
