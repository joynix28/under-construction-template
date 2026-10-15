# Chell — page d'accueil (chell.fr)

[![Licence : Propriétaire / Source-Available](https://img.shields.io/badge/licence-propri%C3%A9taire%20%2F%20source--available-c0392b)](LICENSE)
[![Site : chell.fr](https://img.shields.io/badge/site-chell.fr-e8590c)](https://chell.fr)

Site vitrine officiel du bot Discord **Chell**, déployé sur **Cloudflare Pages**.
Statique, sans dépendance, sans étape de compilation : le HTML, le CSS et le JS
sont livrés tels quels.

> **Bot Discord** : [Ajouter Chell](https://discord.com/oauth2/authorize?client_id=1383154920231796736&permissions=8&scope=bot%20applications.commands) · [Dashboard](https://dash.chell.fr) · [Commandes](https://dash.chell.fr/commandes) · [Support](https://discord.gg/pKj8U2enwD)

---

## Sommaire

- [Aperçu](#aperçu)
- [Structure](#structure)
- [Développement local](#développement-local)
- [Déploiement (Cloudflare Pages)](#déploiement-cloudflare-pages)
- [SEO & GEO](#seo--geo)
- [Comparatif des données](#comparatif-des-données)
- [Licence & attribution](#licence--attribution)

---

## Aperçu

La page rassemble tout ce qu'un visiteur (ou un moteur de recherche) doit
trouver sur Chell : présentation, fonctionnalités, explorateur de commandes,
statistiques en direct, équipe, FAQ et appels à l'action vers Discord, le
dashboard et Botillon.

Le **design suit la direction artistique du dashboard Chell** :

| Élément | Valeur |
|---|---|
| Accent | orange-rouge néon du triangle Chell (`#cc3418` clair, `#ff5f3d` sombre) |
| Neutres | gris à légère teinte violette |
| Forme | coins « coupés » (haut-droite + bas-gauche à 45°) — jamais d'arrondi |
| Titres | Outfit |
| Texte | Inter |
| Libellés, boutons | Manrope |
| Thème | clair/sombre, suit le système, bascule persistante |

Les polices sont **auto-hébergées** (aucune requête vers Google Fonts).

## Structure

```
.
├── content/
│   ├── index.md            # source de la version Markdown FR (agents)
│   └── en.md               # idem, anglais
├── functions/
│   ├── _middleware.js      # Markdown for Agents (négociation de contenu)
│   ├── llms.txt.js         # llms.txt régénéré en direct (GEO)
│   └── api/
│       ├── stats.js        # proxy + cache des stats Discord
│       └── reviews.js      # proxy + cache des avis Botillon
├── scripts/
│   ├── build.mjs           # copie src/ → dist/ + index.md, sitemap daté, cache-busting
│   └── serve.mjs           # serveur de prévisualisation local
├── src/
│   ├── index.html          # accueil FR
│   ├── en/index.html       # accueil EN
│   ├── 404.html
│   ├── assets/
│   │   ├── chell.css       # système de design complet
│   │   ├── app.js          # thème, menu, mot-clé rotatif, stats live (FR/EN)
│   │   ├── og.png          # image de partage 1200×630
│   │   ├── logo-96.png, brand-mark.png, icon-512.png
│   │   ├── brands/         # logos Discord, Botillon, Top.gg
│   │   └── shots/          # captures d'écran (normalisées 1200×750)
│   ├── fonts/              # woff2 auto-hébergés
│   ├── robots.txt
│   ├── sitemap.xml         # (daté à la compilation)
│   ├── site.webmanifest
│   ├── _headers            # en-têtes HTTP (Cloudflare Pages)
│   └── _redirects          # /add, /support, /dashboard, /commandes, /en…
├── package.json
└── LICENSE
```

Deux langues : **français** (`/`) et **anglais** (`/en/`), avec `hreflang`,
sélecteur de langue et versions Markdown dédiées.

`functions/` reste à la racine : Cloudflare Pages le déploie à côté du statique
et **ce n'est pas** copié dans `dist/`.

## Développement local

```bash
npm run dev       # build puis http://localhost:4321
npm run build     # génère dist/
```

`npm run dev` ne lance **pas** les Pages Functions. Le JS des statistiques
retombe alors sur un appel direct à l'API Discord — suffisant pour valider la
page. Pour tester les Functions comme en production :

```bash
npx wrangler pages dev dist
```

## Déploiement (Cloudflare Pages)

Le projet est relié au dépôt GitHub et publié automatiquement à chaque push sur
`main`. Réglages du projet :

| Réglage | Valeur |
|---|---|
| Commande de build | `npm run build` |
| Dossier de sortie | `dist` |
| Dossier racine | *(vide)* |

Le domaine `chell.fr` est associé au projet et sert la branche `main`.
Les redirections (`/add`, `/support`, `/dashboard`, `/commandes`, `/CGU`,
`/privacy`…) sont déclarées dans `src/_redirects`.

## SEO & GEO

- Balises `title`, `description`, `keywords`, `canonical`, `hreflang`
  (fr / x-default), Open Graph et Twitter Card complets.
- **Données structurées JSON-LD** : `Organization` (+ `contactPoint`),
  `WebSite`, `WebPage`, `SoftwareApplication` (featureList, screenshots, offers,
  award), fondateurs (`Person`), `BreadcrumbList` et `FAQPage`.
- `sitemap.xml` (daté à la compilation, image sitemap), `robots.txt` (robots IA
  explicitement autorisés), métadonnées géographiques.
- **`llms.txt` régénéré en direct** par `functions/llms.txt.js` : date et nombre
  de serveurs rafraîchis chaque heure, sans redéploiement.

### Markdown for Agents (version maison, gratuite)

Cloudflare propose cette fonctionnalité sur les offres payantes ; elle est ici
réimplémentée sans surcoût :

1. `content/index.md` est la source de la fiche en Markdown.
2. `scripts/build.mjs` en génère `dist/index.md` (frontmatter repris du HTML,
   nombre de serveurs récupéré au build, blocs JSON-LD recopiés à l'identique).
3. `functions/_middleware.js` renvoie ce Markdown avec
   `Content-Type: text/markdown` quand un agent envoie `Accept: text/markdown`
   (sinon le HTML). En-têtes `Vary: Accept`, `Content-Signal` et
   `X-Robots-Tag: noindex` (pas de contenu dupliqué).

```bash
curl https://chell.fr/ -H "Accept: text/markdown"
```

- Accessibilité : lien d'évitement, contrastes, `aria-*`, respect de
  `prefers-reduced-motion`. Le contenu reste visible sans JavaScript (animations
  d'apparition conditionnées à une classe `.js`).
- Performance : aucune dépendance, polices locales préchargées, images en
  `loading="lazy"`, et **cache-busting par empreinte** (`?v=…` posé à la
  compilation) : les assets sont servis immuables un an sans jamais rester
  périmés après un déploiement.

## Langues

- `/` — français (langue par défaut, `x-default`).
- `/en/` — anglais.
- `hreflang` croisés dans les deux pages et dans le sitemap, sélecteur FR/EN
  dans l'en-tête, et un fichier Markdown par langue.

## Données

- **Serveurs, en direct** : lus depuis l'annuaire officiel des applications
  Discord via `GET /api/stats` (mis en cache une heure côté Cloudflare), avec
  repli sur un appel direct puis sur la valeur de la page. Les **tags, catégories
  et la certification** affichés dans la section Statistiques proviennent aussi
  de cet annuaire.
- **Utilisateurs cumulés, commandes, catégories** : valeurs figées, à mettre à
  jour dans `src/index.html` et `content/index.md` si les chiffres évoluent.
- **Avis et note Botillon, en direct** : `GET /api/reviews` agrège
  `/api/v1/bots/{id}/stats` et `/community` de l'API publique de Botillon
  (aucune clé requise), les compacte et les met en cache une heure. La section
  « Avis » affiche la note moyenne, le nombre d'avis, les votes, les j'aime et
  les derniers avis. Le `aggregateRating` du JSON-LD est figé à la compilation
  avec la note du moment.

## ⚠️ Licence & Conditions d'utilisation

Ce projet n'est **pas open source**. Il est publié sous une licence propriétaire
« à code source disponible » (Source-Available), version 1.0, © 2026 joynix28.

- **Usage commercial interdit** sans autorisation écrite préalable (vente,
  Premium, publicité, dons, vitrine commerciale).
- **Projets concurrents interdits**, même gratuits : pas de réutilisation du
  code, de l'architecture ou du design pour un autre bot ou service.
- **Attribution visible obligatoire** pour toute utilisation ou version
  modifiée : la mention « Propulsé par Chell — Créé originalement par joynix28 »,
  avec un lien actif vers https://github.com/joynix28/under-construction-template,
  dans le footer de toutes les pages publiques (ou la commande `/help` du bot).
- **Pas de sous-licence** : interdiction de republier ce code sous MIT, GPL, etc.
- Le texte complet fait foi : voir le fichier [`LICENSE`](LICENSE).

Pour toute demande d'autorisation (usage commercial, projet similaire, retrait de
l'obligation de crédit) : https://discord.gg/pKj8U2enwD

---

Site indépendant, non affilié à Discord Inc.
