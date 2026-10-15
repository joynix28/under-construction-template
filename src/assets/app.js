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
})();
