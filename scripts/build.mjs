// Build statique — copie `src/` vers `dist/`, génère les versions Markdown pour
// les agents, un sitemap daté, et pose un cache-busting sur les assets.
//
//   node scripts/build.mjs
//
// Cloudflare Pages exécute `npm run build` puis publie `dist`. Aucune
// dépendance : HTML, CSS et JS sont livrés tels quels. `functions/` (Pages
// Functions) reste à la racine et n'est pas copié.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

/* 2. Métadonnées lues depuis le HTML (source de vérité unique). */
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

function metaFromHtml(path) {
  const html = readFileSync(path, 'utf8');
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

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/* 3. Nombre de serveurs : récupéré à la compilation (Cloudflare a le réseau). */
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

/* 4. Versions Markdown (Markdown for Agents), une par langue. */
const guilds = await guildCount();
const mdJobs = [
  { tpl: join(content, 'index.md'), page: join(src, 'index.html'), out: join(dist, 'index.md') },
  { tpl: join(content, 'en.md'), page: join(src, 'en', 'index.html'), out: join(dist, 'en', 'index.md') },
];

for (const job of mdJobs) {
  if (!existsSync(job.tpl) || !existsSync(job.page)) continue;
  const meta = metaFromHtml(job.page);
  const jsonld = jsonLdBlocks(meta.html);
  const block = jsonld.length ? '\n```json\n' + jsonld.join('\n') + '\n```\n' : '';
  let md = readFileSync(job.tpl, 'utf8')
    .replaceAll('__DATE__', today)
    .replaceAll('__GUILDS__', guilds)
    .replace('__JSONLD__', block);
  const fm = `---\ntitle: ${meta.title}\ndescription: ${meta.description}\nimage: ${meta.image}\n---\n`;
  md = md.replace(/^---[\s\S]*?---\n/, fm);
  mkdirSync(dirname(job.out), { recursive: true });
  writeFileSync(job.out, md);
}

/* 5. Sitemap daté. */
const sitemap = join(src, 'sitemap.xml');
if (existsSync(sitemap)) {
  writeFileSync(join(dist, 'sitemap.xml'), readFileSync(sitemap, 'utf8').replaceAll('__DATE__', today));
}

/* 6. Note moyenne et nombre d'avis, lus depuis l'API publique de Botillon.
      Ils alimentent le `aggregateRating` du JSON-LD (données structurées), donc
      ils sont figés à la compilation. La page affiche en plus la valeur en
      direct (via /api/reviews). */
async function botillonRating() {
  try {
    const res = await fetch(`https://botillon.fr/api/v1/bots/${APP_ID}/stats`, {
      headers: { Accept: 'application/json', 'User-Agent': 'chell.fr build' },
    });
    if (!res.ok) return { rating: null, count: null };
    const s = await res.json();
    return {
      rating: typeof s.ratingAverage === 'number' ? s.ratingAverage : null,
      count: typeof s.ratingCount === 'number' ? s.ratingCount : null,
    };
  } catch {
    return { rating: null, count: null };
  }
}

function htmlFilesIn(dir) {
  const out = [];
  (function collect(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) collect(p);
      else if (name.endsWith('.html')) out.push(p);
    }
  })(dir);
  return out;
}

const rating = await botillonRating();
for (const file of htmlFilesIn(dist)) {
  // `aggregateRating` doit rester un nombre au format JSON : point décimal,
  // quelle que soit la langue. La valeur visible est mise en forme par app.js.
  // Dans la source, les placeholders sont entre guillemets pour que le JSON-LD
  // reste valide ; ici on les remplace par des nombres bruts (JSON numérique).
  const value = rating.rating == null ? '4.9' : String(rating.rating);
  const count = rating.count == null ? '12' : String(rating.count);
  writeFileSync(
    file,
    readFileSync(file, 'utf8')
      .replaceAll('"__RATING__"', value)
      .replaceAll('"__RATING_COUNT__"', count)
  );
}

/* 6. Cache-busting des assets.
      Les fichiers sous /assets/ sont servis immuables un an (voir _headers).
      On ajoute donc une empreinte du contenu en paramètre d'URL : dès qu'un
      fichier change, l'URL change et le cache est contourné. Le HTML, lui, est
      revalidé à chaque visite. */
function bustAssets() {
  const htmlFiles = [];
  (function collect(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) collect(p);
      else if (name.endsWith('.html')) htmlFiles.push(p);
    }
  })(dist);

  const hashes = new Map();
  const ref = /(?<!chell\.fr)(\/assets\/[A-Za-z0-9._\-/]+)/g;

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    writeFileSync(
      file,
      html.replace(ref, (m) => {
        if (!hashes.has(m)) {
          const local = join(dist, m);
          hashes.set(m, existsSync(local) ? createHash('sha1').update(readFileSync(local)).digest('hex').slice(0, 10) : '0');
        }
        return `${m}?v=${hashes.get(m)}`;
      })
    );
  }
}
bustAssets();

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
