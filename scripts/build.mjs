// Build statique — copie `src/` vers `dist/`, puis génère les fichiers pour
// les agents (Markdown) et le sitemap daté.
//
//   node scripts/build.mjs
//
// Cloudflare Pages exécute `npm run build` puis publie `dist`. Le site n'a
// aucune dépendance ni étape de compilation : le HTML, le CSS et le JS sont
// livrés tels quels. `functions/` (Pages Functions) reste à la racine et n'est
// pas copié : Cloudflare le déploie séparément, à côté du statique.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const content = join(root, 'content');

const APP_ID = '1383154920231796736';
const today = new Date().toISOString().slice(0, 10);

if (!existsSync(src)) {
  console.error('✗ dossier src/ introuvable');
  process.exit(1);
}

/* 1. Copie du site statique. */
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });

/* 2. YAML frontmatter : le titre et la description sont lus depuis le HTML
      pour que les deux versions ne puissent pas diverger. */
function metaFromHtml() {
  const html = readFileSync(join(src, 'index.html'), 'utf8');
  const decode = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  const pick = (re) => {
    const m = html.match(re);
    return m ? decode(m[1].replace(/\s+/g, ' ').trim()) : '';
  };
  return {
    html,
    title: pick(/<title>([\s\S]*?)<\/title>/i),
    description: pick(/<meta name="description" content="([^"]*)"/i),
    image: pick(/<meta property="og:image" content="([^"]*)"/i),
  };
}

/* 3. Nombre de serveurs : récupéré à la compilation (Cloudflare a le réseau).
      En cas d'échec, on retombe sur la valeur de la page. */
async function guildCount() {
  try {
    const res = await fetch(
      `https://discord.com/api/v9/application-directory-static/applications/${APP_ID}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'chell.fr build' } }
    );
    if (!res.ok) return '2 000';
    const data = await res.json();
    const n = data?.directory_entry?.guild_count;
    return typeof n === 'number' ? new Intl.NumberFormat('fr-FR').format(n) : '2 000';
  } catch {
    return '2 000';
  }
}

/* 4. Blocs JSON-LD, repris tels quels depuis la page : les données
      structurées de la version Markdown restent identiques à celles du HTML. */
function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

const meta = metaFromHtml();

/* 5. index.md — Markdown for Agents, servi en content negotiation. */
const mdTemplate = join(content, 'index.md');
if (existsSync(mdTemplate)) {
  const guilds = await guildCount();
  const jsonld = jsonLdBlocks(meta.html);
  const block = jsonld.length ? '\n```json\n' + jsonld.join('\n') + '\n```\n' : '';
  let md = readFileSync(mdTemplate, 'utf8')
    .replaceAll('__DATE__', today)
    .replaceAll('__GUILDS__', guilds)
    .replace('__JSONLD__', block);
  // Le frontmatter est réécrit depuis le HTML : source de vérité unique.
  const fm = `---\ntitle: ${meta.title}\ndescription: ${meta.description}\nimage: ${meta.image}\n---\n`;
  md = md.replace(/^---[\s\S]*?---\n/, fm);
  writeFileSync(join(dist, 'index.md'), md);
}

/* 6. Sitemap daté. */
const sitemap = join(src, 'sitemap.xml');
if (existsSync(sitemap)) {
  writeFileSync(
    join(dist, 'sitemap.xml'),
    readFileSync(sitemap, 'utf8').replaceAll('__DATE__', today)
  );
}

/* 7. Récapitulatif. */
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

console.log(`✓ dist construit : ${files} fichiers, ${(bytes / 1024 / 1024).toFixed(2)} Mo (${today})`);
