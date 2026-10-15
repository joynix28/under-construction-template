/**
 * GET /api/stats — statistiques publiques du bot Chell.
 *
 * L'annuaire des applications Discord expose le nombre de serveurs en direct à
 * l'adresse application-directory-static. Il est interrogé côté serveur pour que
 * le navigateur n'ait jamais à parler à discord.com, et la réponse est mise en
 * cache cinq minutes : une seule requête Discord sert tous les visiteurs.
 *
 * En cas d'indisponibilité, la fonction renvoie 503 : le client retombe alors
 * sur un appel direct puis, en dernier recours, sur les valeurs déjà présentes
 * dans la page.
 */

const APP_ID = '1383154920231796736';
const UPSTREAM = `https://discord.com/api/v9/application-directory-static/applications/${APP_ID}`;
const CACHE_TTL = 300; // secondes

export async function onRequestGet(context) {
  const { request, waitUntil } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/stats', { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'chell.fr (+https://chell.fr)',
      },
      cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
    });

    if (!upstream.ok) {
      return json({ error: 'upstream_unavailable' }, 503);
    }

    const data = await upstream.json();
    const entry = data && data.directory_entry ? data.directory_entry : {};
    const payload = {
      bot: 'Chell',
      id: APP_ID,
      guilds: typeof entry.guild_count === 'number' ? entry.guild_count : null,
      verified: data && data.is_verified === true,
      categories: Array.isArray(data && data.categories)
        ? data.categories.map((c) => c.name)
        : [],
      tags: Array.isArray(data && data.tags) ? data.tags : [],
      updated: new Date().toISOString(),
    };

    const response = json(payload, 200, {
      'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`,
      'Access-Control-Allow-Origin': '*',
    });

    if (waitUntil) waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return json({ error: 'fetch_failed' }, 502);
  }
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
