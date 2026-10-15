/**
 * Markdown for Agents, version maison (sans l'offre payante de Cloudflare).
 *
 * Quand un agent envoie `Accept: text/markdown`, on renvoie la version Markdown
 * pré-générée de la page au lieu du HTML, avec le bon `Content-Type`, `Vary`
 * et les signaux de contenu. Sinon, on laisse passer la requête normalement.
 *
 * Le fichier Markdown est produit à la compilation (`content/index.md` ->
 * `dist/index.md`) : pas de conversion HTML->Markdown runtime, donc pas de coût
 * ni de risque de rendu approximatif.
 */

export async function onRequest(context) {
  const { request, next, env } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const accept = request.headers.get('Accept') || '';
  if (!/text\/markdown/i.test(accept)) return next();

  const url = new URL(request.url);
  const path = url.pathname;

  let mdPath;
  if (path === '/' || path === '') mdPath = '/index.md';
  else if (path.endsWith('/')) mdPath = `${path}index.md`;
  else if (path.endsWith('.html')) mdPath = `${path.slice(0, -5)}.md`;
  else if (path.endsWith('.md')) return next();
  else mdPath = `${path}.md`;

  try {
    const asset = await env.ASSETS.fetch(new URL(mdPath, url.origin));
    if (asset.ok) {
      const body = await asset.text();
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600',
          'Content-Signal': 'ai-train=yes, search=yes, ai-input=yes',
          'X-Robots-Tag': 'noindex',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch {
    /* fichier absent : on sert le HTML */
  }

  return next();
}
