/**
 * GET /api/reviews — avis et notes de Chell sur Botillon, en direct.
 *
 * L'API publique de Botillon (https://botillon.fr/api-docs) n'exige aucune clé.
 * On interroge ici deux de ses endpoints côté serveur, on compacte la réponse
 * pour le navigateur, et on la met en cache une heure : une requête Botillon
 * sert tous les visiteurs.
 *
 * Le client retombe sur un appel direct à Botillon si cette fonction échoue,
 * puis masque simplement la section si tout échoue.
 */

const BOT_ID = '1383154920231796736';
const BASE = 'https://botillon.fr';
const CACHE_TTL = 3600; // secondes

export async function onRequestGet(context) {
  const { request, waitUntil } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/reviews', { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const [communityRes, statsRes] = await Promise.all([
      fetch(`${BASE}/api/v1/bots/${BOT_ID}/community`, {
        headers: { Accept: 'application/json', 'User-Agent': 'chell.fr (+https://chell.fr)' },
        cf: { cacheTtl: 1800, cacheEverything: true },
      }),
      fetch(`${BASE}/api/v1/bots/${BOT_ID}/stats`, {
        headers: { Accept: 'application/json', 'User-Agent': 'chell.fr (+https://chell.fr)' },
        cf: { cacheTtl: 1800, cacheEverything: true },
      }),
    ]);

    if (!communityRes.ok || !statsRes.ok) {
      return json({ error: 'upstream_unavailable' }, 503);
    }

    const community = await communityRes.json();
    const stats = await statsRes.json();
    const reviews = Array.isArray(community?.reviews?.recent) ? community.reviews.recent : [];

    const payload = {
      bot: 'Chell',
      id: BOT_ID,
      rating: num(stats.ratingAverage, community?.reviews?.average),
      ratingCount: num(stats.ratingCount, community?.reviews?.count, 0),
      votes: num(stats.votesTotal, 0),
      votesMonth: num(stats.votesMonth, 0),
      likes: num(stats.likesTotal, community?.likes?.total, 0),
      reviews: reviews.slice(0, 6).map((r) => ({
        rating: num(r.rating, 0),
        content: String(r.content || '').replace(/\s+/g, ' ').trim().slice(0, 300),
        createdAt: r.createdAt || null,
        author: {
          name: String(r.author?.name || '').trim() || 'Anonyme',
          avatar: r.author?.avatarUrl || null,
        },
      })),
      updated: new Date().toISOString(),
    };

    const response = json(payload, 200, {
      'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`,
      'Access-Control-Allow-Origin': '*',
    });

    if (waitUntil) waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return json({ error: 'fetch_failed' }, 502);
  }
}

function num(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'number' && isFinite(c)) return c;
  }
  return null;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      extraHeaders || {}
    ),
  });
}
