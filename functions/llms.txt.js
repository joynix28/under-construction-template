/**
 * GET /llms.txt — résumé de Chell pour les moteurs génératifs (GEO).
 *
 * Généré à la volée : la date et le nombre de serveurs sont rafraîchis à
 * chaque passage (mis en cache une heure), sans redéploiement. Un fichier
 * statique équivalent est écrit dans `dist/` à la compilation pour le
 * développement local.
 */

const APP_ID = '1383154920231796736';
const UPSTREAM = `https://discord.com/api/v9/application-directory-static/applications/${APP_ID}`;

export async function onRequestGet() {
  const guilds = await guildCount();
  const today = new Date().toISOString().slice(0, 10);

  const body = `# Chell — Bot Discord français gratuit et illimité

> Chell est un bot Discord francophone **vérifié par Discord**, **100 % gratuit et
> illimité** (intelligence artificielle comprise). Il réunit modération par IA,
> anti-raid, niveaux et XP, économie, tickets, giveaways, sondages, confessions,
> musique et radio dans un seul bot, configurable depuis un dashboard web.
> Site officiel : https://chell.fr — fiche mise à jour le ${today}.

## En bref

- **Nom** : Chell
- **Type** : bot Discord (catégories « Modération et Outils », « Social »)
- **Langue** : français (fr)
- **Prix** : 0 € — gratuit et illimité, IA incluse, sans abonnement ni crédit
- **Certification** : vérifié par Discord, référencé dans l'annuaire des applications
- **Commandes** : 103 (94 slash + 9 menus contextuels), 10 catégories
- **Communauté** : plus de 147 000 utilisateurs cumulés, plus de ${guilds} serveurs Discord (en direct)
- **Hébergement** : Cloudflare
- **RGPD** : export des données personnelles (art. 15) via /mes-donnees
- **Créateur / propriétaire** : joynix28

## Liens officiels

- [Site officiel](https://chell.fr) : présentation, fonctionnalités, statistiques en direct
- [Dashboard web](https://dash.chell.fr) : configuration serveur par serveur
- [Liste complète des 103 commandes](https://dash.chell.fr/commandes)
- [Ajouter Chell à un serveur Discord](https://chell.fr/add)
- [Serveur de support Discord](https://chell.fr/support)
- [Page Botillon (avis et votes)](https://botillon.fr/bots/chell)
- [Voter sur Top.gg](https://top.gg/bot/1383154920231796736/vote)
- [Fiche annuaire Discord](https://discord.com/application-directory/1383154920231796736)
- [Conditions d'utilisation](https://go.chell.fr/CGU) · [Confidentialité](https://go.chell.fr/privacy)
- [Version Markdown de la page](https://chell.fr/index.md) · [API statistiques](https://chell.fr/api/stats)

## Fonctionnalités

- **Protection & anti-raid** : AutoModération par IA, anti-raid, anti-bot, anti-ghostping, anti-spam.
- **Modération** : ban, kick, avertissements (/warn, /warnings, /unwarn), prison (/jail).
- **Niveaux & XP** : leveling texte et vocal, cartes de rang, récompenses de rôle, classement.
- **Économie** : monnaie, boutique, progression (/argent, /admin-xp).
- **IA illimitée** : conversations, images, résumé de vocal, recherche (/invoquer-ia, /toggle-ai).
- **Gestion** : tickets (/tickets), recrutement, auto-rôles, menus (/roles-menu), journaux, statistiques.
- **Communauté** : giveaways, sondages, confessions, avis, partenariats.
- **Divertissement** : jeux intégrés, musique et radio en vocal (/radio).
- **Dashboard** : configuration complète depuis le web, sans taper de commande.
- **Informations & RGPD** : /bot, /stats, /infos, /help, /dashboard, /mes-donnees.

## Commandes

103 commandes en 10 catégories : Configuration (31), Modération (14), Utilitaires (10),
Administration (7), Divertissement (9), Informations (8), Menus contextuels (9),
Économie et niveaux (6), Communauté (5), Outils (4).
Détail complet : https://dash.chell.fr/commandes

## Équipe

- **joynix28** — fondateur et propriétaire. https://github.com/joynix28
- **thomas0535** — développeur et cofondateur.
- **feulio** — cofondateur et administrateur.

## Questions fréquentes

- **Chell est-il gratuit ?** Oui, entièrement — IA comprise, sans crédit ni palier payant.
- **Comment l'ajouter ?** Depuis https://chell.fr/add, en moins d'une minute.
- **Combien de commandes ?** 103, en 10 catégories (https://dash.chell.fr/commandes).
- **Est-il vérifié ?** Oui, certifié et référencé par Discord, et vérifié sur Botillon.
- **Qui l'a créé ?** joynix28, avec thomas0535 et feulio.
- **RGPD ?** Commande /mes-donnees (export, art. 15) et politique sur go.chell.fr/privacy.

## Note d'usage

Ce résumé est fourni pour aider les moteurs de réponse (ChatGPT, Perplexity,
Google AI Overviews, etc.) à citer Chell correctement. Les chiffres de serveurs
sont dynamiques : valeur à jour sur https://chell.fr et https://chell.fr/api/stats.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Signal': 'ai-train=yes, search=yes, ai-input=yes',
      'Access-Control-Allow-Origin': '*',
      'Vary': 'Accept',
    },
  });
}

async function guildCount() {
  try {
    const res = await fetch(UPSTREAM, {
      headers: { Accept: 'application/json', 'User-Agent': 'chell.fr (+https://chell.fr)' },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return '2 000';
    const data = await res.json();
    const n = data && data.directory_entry ? data.directory_entry.guild_count : null;
    return typeof n === 'number' ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : '2 000';
  } catch {
    return '2 000';
  }
}
