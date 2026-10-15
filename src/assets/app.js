/* ==========================================================================
   Chell — chell.fr
   Vanilla, sans dépendance. Chaque bloc est autonome : si l'un échoue, les
   autres continuent (le contenu essentiel reste dans le HTML).
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------- Thème -------------------------------- */
  (function theme() {
    var btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('chell-theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  })();

  /* ----------------------------- Menu mobile ---------------------------- */
  (function nav() {
    var toggle = $('#nav-toggle');
    var menu = $('#nav-mobile');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ------------------------- Révélation au scroll ----------------------- */
  (function reveal() {
    var nodes = $$('.reveal');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Sans IntersectionObserver, ou si l'utilisateur réduit les animations, on ne
    // masque jamais rien : le contenu reste visible tel quel.
    if (!('IntersectionObserver' in window) || reduce) return;

    var vh = window.innerHeight || document.documentElement.clientHeight;
    var pending = [];
    nodes.forEach(function (n) {
      // Seuls les blocs encore sous la ligne de flottaison sont masqués : le
      // contenu visible au chargement ne clignote pas et ne disparaît jamais.
      if (n.getBoundingClientRect().top > vh * 0.9) {
        n.classList.add('pre');
        pending.push(n);
      }
    });
    if (!pending.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.remove('pre');
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
    pending.forEach(function (n) { io.observe(n); });

    // Filet de sécurité : quoi qu'il arrive, rien ne reste masqué au bout de 2 s.
    window.setTimeout(function () {
      pending.forEach(function (n) {
        if (n.classList.contains('pre')) { n.classList.remove('pre'); n.classList.add('in'); }
      });
    }, 2000);
  })();

  /* --------------------------- Année du footer -------------------------- */
  (function year() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();

  /* --------------------- Mot-clé rotatif dans le hero ------------------- */
  (function rotator() {
    var el = $('#hero-rot');
    if (!el) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    var lang = (document.documentElement.lang || 'fr').slice(0, 2);
    var words = lang === 'en'
      ? [
          'AI moderation',
          'levels & XP',
          'tickets & recruitment',
          'giveaways & polls',
          'music & radio',
          'anti-raid',
          'economy & shop',
          'configuration (dashboard)'
        ]
      : [
          'la modération par IA',
          'les niveaux & l’XP',
          'les tickets & le recrutement',
          'les giveaways & sondages',
          'la musique & la radio',
          "l'anti-raid",
          "l'économie & la boutique",
          'la configuration (dashboard)'
        ];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove('swap');
      void el.offsetWidth;
      el.classList.add('swap');
    }, 2400);
  })();

  /* ------------------ Statistiques live + annuaire Discord -------------- */
  (function live() {
    var lang = (document.documentElement.lang || 'fr').slice(0, 2);
    var fmt = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'fr-FR');
    var guildSuffix = lang === 'en' ? 'servers' : 'serveurs';
    var APP_ID = '1383154920231796736';

    function animate(el, to) {
      var from = parseInt(String(el.textContent).replace(/[^0-9]/g, ''), 10) || 0;
      if (from === to) { el.textContent = fmt.format(to); return; }
      var start = performance.now();
      var dur = 900;
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt.format(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function applyGuilds(n) {
      if (typeof n !== 'number' || !isFinite(n) || n <= 0) return;
      $$('[data-count="guilds"]').forEach(function (el) { animate(el, n); });
      $$('[data-stat-inline="guilds"]').forEach(function (el) {
        el.textContent = fmt.format(n) + '+ ' + guildSuffix;
      });
    }

    // Les tags de l'annuaire officiel Discord : preuve de vie, en direct.
    function applyDirectory(data) {
      var host = $('#dir-tags');
      if (!host || !data) return;
      var chips = [];
      if (data.verified) chips.push('Vérifié Discord');
      (data.tags || []).forEach(function (t) { chips.push(t); });
      (data.categories || []).forEach(function (c) { chips.push(c); });
      if (!chips.length) return;
      host.textContent = '';
      chips.forEach(function (label) {
        var s = document.createElement('span');
        s.textContent = label;
        host.appendChild(s);
      });
      if (typeof data.guilds === 'number') applyGuilds(data.guilds);
    }

    function fromProxy() {
      return fetch('/api/stats', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }

    function fromDirect() {
      return fetch('https://discord.com/api/v9/application-directory-static/applications/' + APP_ID, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }

    fromProxy().then(function (data) {
      if (data && typeof data.guilds === 'number') { applyDirectory(data); return; }
      // Repli : appel direct (CORS reflété par Discord), puis valeur de la page.
      return fromDirect().then(function (j) {
        if (!j) return;
        var tags = [];
        if (j.is_verified) tags.push('Vérifié Discord');
        (j.tags || []).forEach(function (t) { tags.push(t); });
        var cats = (j.categories || []).map(function (c) { return c.name; });
        applyDirectory({ guilds: j.directory_entry && j.directory_entry.guild_count, verified: j.is_verified, tags: j.tags, categories: cats });
      });
    });
  })();

  /* ------------------- Avis Botillon (en direct, sans clé) -------------- */
  (function reviews() {
    var host = $('#reviews-list');
    if (!host) return;
    var lang = (document.documentElement.lang || 'fr').slice(0, 2);
    var fmt = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'fr-FR');
    var BOT_ID = '1383154920231796736';
    var API = 'https://botillon.fr/api/v1/bots/' + BOT_ID;

    function setAll(key, value) {
      $$('[data-review="' + key + '"]').forEach(function (el) { el.textContent = value; });
    }
    function stars(n, cls) {
      var wrap = document.createElement('div');
      wrap.className = cls || 'stars';
      for (var i = 1; i <= 5; i++) {
        var s = document.createElement('i');
        s.textContent = '★';
        if (i <= Math.round(n)) s.className = 'on';
        wrap.appendChild(s);
      }
      return wrap;
    }
    function dateLabel(iso) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { year: 'numeric', month: 'short' });
      } catch (e) { return ''; }
    }
    function ratingText(v) {
      var s = Number(v).toFixed(1);
      return lang === 'en' ? s : s.replace('.', ',');
    }

    function render(data) {
      if (!data) return;
      if (typeof data.rating === 'number') {
        setAll('rating', ratingText(data.rating));
        var target = $('[data-review="stars"]');
        if (target) {
          target.textContent = '';
          for (var i = 1; i <= 5; i++) {
            var s = document.createElement('i');
            s.textContent = '★';
            if (i <= Math.round(data.rating)) s.className = 'on';
            target.appendChild(s);
          }
        }
      }
      if (typeof data.ratingCount === 'number') setAll('ratingCount', fmt.format(data.ratingCount));
      if (typeof data.votes === 'number') setAll('votes', fmt.format(data.votes));
      if (typeof data.likes === 'number') setAll('likes', fmt.format(data.likes));

      if (!Array.isArray(data.reviews) || !data.reviews.length) return;
      host.textContent = '';
      data.reviews.forEach(function (r) {
        var card = document.createElement('article');
        card.className = 'tile plate cut-lg reveal in';
        var inner = document.createElement('div');
        inner.className = 'plate-inner cut-lg review';

        var who = document.createElement('div');
        who.className = 'who';
        if (r.author && r.author.avatar) {
          var img = document.createElement('img');
          img.src = r.author.avatar;
          img.alt = '';
          img.loading = 'lazy';
          img.width = 38;
          img.height = 38;
          who.appendChild(img);
        }
        var meta = document.createElement('div');
        var name = document.createElement('div');
        name.className = 'name';
        name.textContent = (r.author && r.author.name) || 'Anonyme';
        meta.appendChild(name);
        meta.appendChild(stars(r.rating || 0, 'stars'));
        who.appendChild(meta);
        inner.appendChild(who);

        var body = document.createElement('p');
        body.textContent = r.content || '';
        inner.appendChild(body);

        var when = document.createElement('div');
        when.className = 'rating-of';
        when.style.fontSize = '0.75rem';
        when.textContent = dateLabel(r.createdAt);
        inner.appendChild(when);

        card.appendChild(inner);
        host.appendChild(card);
      });

      var note = $('[data-review="updated"]');
      if (note) {
        note.textContent = lang === 'en'
          ? 'Source: Botillon, updated live.'
          : 'Source : Botillon, mis à jour en direct.';
      }
    }

    function fromProxy() {
      return fetch('/api/reviews', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }

    function get(url) {
      return fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }

    function fromDirect() {
      return Promise.all([get(API + '/stats'), get(API + '/community')]).then(function (res) {
        var s = res[0], c = res[1];
        if (!s && !c) return null;
        var recent = (c && c.reviews && c.reviews.recent) || [];
        return {
          rating: s && s.ratingAverage,
          ratingCount: s && s.ratingCount,
          votes: s && s.votesTotal,
          likes: s && s.likesTotal,
          reviews: recent.slice(0, 6).map(function (r) {
            return {
              rating: r.rating,
              content: r.content,
              createdAt: r.createdAt,
              author: { name: r.author && r.author.name, avatar: r.author && r.author.avatarUrl },
            };
          }),
        };
      });
    }

    fromProxy().then(function (data) {
      if (data && (typeof data.rating === 'number' || (data.reviews && data.reviews.length))) {
        render(data);
        return;
      }
      return fromDirect().then(render);
    });
  })();
})();
