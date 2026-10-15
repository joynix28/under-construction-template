// Build statique — copie `src/` vers `dist/`.
//
//   node scripts/build.mjs
//
// Cloudflare Pages exécute `npm run build` puis publie `dist`. Le site n'a
// aucune dépendance ni étape de compilation : le HTML, le CSS et le JS sont
// livrés tels quels, ce qui garde le build instantané et sans surprise.
// `functions/` (les Pages Functions) reste à la racine et n'est pas copié :
// Cloudflare le déploie séparément, à côté du statique.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

if (!existsSync(src)) {
  console.error('✗ dossier src/ introuvable');
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });

let files = 0;
let bytes = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else { files++; bytes += s.size; }
  }
})(dist);

console.log(
  `✓ dist construit : ${files} fichiers, ${(bytes / 1024 / 1024).toFixed(2)} Mo`
);
