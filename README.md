# Chell — page d'accueil (chell.fr)

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
├── functions/
│   └── api/stats.js        # Pages Function : proxy + cache des stats Discord
├── scripts/
│   ├── build.mjs           # copie src/ → dist/   (`npm run build`)
│   └── serve.mjs           # serveur de prévisualisation local
├── src/
│   ├── index.html          # la page d'accueil
│   ├── 404.html
│   ├── assets/
│   │   ├── chell.css       # système de design complet
│   │   ├── app.js          # thème, menu, explorateur de commandes, stats live
│   │   ├── commands.js     # catalogue des 103 commandes (généré)
│   │   ├── og.png          # image de partage 1200×630
│   │   ├── logo-96.png, brand-mark.png, icon-512.png
│   │   └── shots/          # captures d'écran
│   ├── fonts/              # woff2 auto-hébergés
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── llms.txt            # résumé pour les moteurs génératifs (GEO)
│   ├── site.webmanifest
│   ├── _headers            # en-têtes HTTP (Cloudflare Pages)
│   └── _redirects          # /add, /support, /dashboard, /commandes…
├── package.json
└── LICENSE
```

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

- Balises `title`, `description`, `canonical`, `hreflang` (fr / x-default),
  Open Graph et Twitter Card complets.
- **Données structurées JSON-LD** : `Organization`, `WebSite`,
  `SoftwareApplication`, fondateurs (`Person`) et `FAQPage`.
- `sitemap.xml`, `robots.txt` (robots IA explicitement autorisés), `llms.txt`
  pour la citabilité par les moteurs génératifs (AI Overviews, ChatGPT,
  Perplexity).
- Métadonnées géographiques (`geo.region`, `geo.placename`, `ICBM`).
- Accessibilité : lien d'évitement, contrastes, `aria-*`, respect de
  `prefers-reduced-motion`.
- Performance : aucune dépendance, polices locales préchargées, images en
  `loading="lazy"`.

## Comparatif des données

- **Serveurs, en direct** : lus depuis l'annuaire officiel des applications
  Discord via `GET /api/stats` (mis en cache 5 min côté Cloudflare), avec repli
  sur un appel direct puis sur la valeur de la page.
- **Utilisateurs cumulés, commandes, catégories** : valeurs figées, mises à jour
  dans `src/index.html`. Le catalogue de commandes (`src/assets/commands.js`)
  reflète celui du dashboard ; le régénérer depuis `chell-dashboard` après
  toute évolution des commandes du bot.

## Licence & attribution

Ce site est publié sous la [licence Chell](LICENSE) : réutilisation libre **à
condition de citer joynix28 / le projet Chell** et de conserver un lien vers
[chell.fr](https://chell.fr). La marque, le nom « Chell » et le logo ne peuvent
pas être réutilisés pour un autre projet.

Certaines parties du dépôt sont issues du gabarit MIT
[under-construction-template](https://github.com/hendrikdemir/under-construction-template)
(Hendrik Demir) ; sa notice est conservée dans le fichier `LICENSE`.

---

Site indépendant, non affilié à Discord Inc.
