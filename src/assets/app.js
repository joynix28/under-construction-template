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
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* --------------------------- Année du footer -------------------------- */
  (function year() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();

  /* ------------------------ Explorateur de commandes -------------------- */
  (function commands() {
    var grid = $('#cmd-grid');
    var filters = $('#cmd-filters');
    if (!grid || !filters || !window.CHELL_COMMANDS) return;

    var cats = window.CHELL_COMMAND_CATEGORIES || [];
    var commands = window.CHELL_COMMANDS || [];
    var PER_PAGE = 9;
    var active = 'all';
    var limit = PER_PAGE;

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    function render() {
      var list = active === 'all' ? commands : commands.filter(function (c) { return c.category === active; });
      grid.textContent = '';
      list.slice(0, limit).forEach(function (c) {
        var card = el('article', 'cmd cut-sm');
        var name = el('div', 'name');
        name.appendChild(el('span', 'slash', '/'));
        name.appendChild(document.createTextNode(c.name));
        if (c.kind !== 'slash') name.appendChild(el('span', 'slash', ' (menu)'));
        card.appendChild(name);
        card.appendChild(el('p', null, c.description));
        grid.appendChild(card);
      });

      var rest = list.length - limit;
      var more = $('#cmd-rest');
      if (!more) {
        more = el('p', 'cmd-rest');
        more.id = 'cmd-rest';
        more.style.cssText = 'text-align:center;color:var(--muted);font-size:.9rem;margin-top:1.2rem';
        grid.parentNode.insertBefore(more, grid.nextSibling);
      }
      if (rest > 0) {
        more.textContent = '';
        var btn = el('button', 'btn btn-ghost btn-sm cut', '+' + rest + ' autres commandes');
        btn.type = 'button';
        btn.addEventListener('click', function () { limit += 9; render(); });
        more.appendChild(btn);
      } else {
        more.textContent = '';
      }
    }

    function chip(id, label, count) {
      var b = el('button', 'chip cut-sm');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.cat = id;
      b.appendChild(document.createTextNode(label));
      if (count != null) b.appendChild(el('span', 'n', String(count)));
      b.addEventListener('click', function () {
        active = id; limit = PER_PAGE;
        $$('.chip', filters).forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        render();
      });
      return b;
    }

    filters.appendChild(chip('all', 'Toutes', commands.length));
    cats.forEach(function (c) { filters.appendChild(chip(c.id, c.label, c.count)); });
    $('.chip', filters).classList.add('active');
    render();
    grid.setAttribute('data-ready', '1');
  })();

  /* --------------------------- Statistiques live ------------------------ */
  (function stats() {
    var fmt = new Intl.NumberFormat('fr-FR');
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
        el.textContent = fmt.format(n) + '+ serveurs';
      });
    }

    function fromDirect() {
      return fetch('https://discord.com/api/v9/application-directory-static/applications/' + APP_ID, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j && j.directory_entry ? j.directory_entry.guild_count : null; })
        .catch(function () { return null; });
    }

    function fromProxy() {
      return fetch('/api/stats', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j && typeof j.guilds === 'number' ? j.guilds : null; })
        .catch(function () { return null; });
    }

    fromProxy().then(function (n) {
      if (n != null) { applyGuilds(n); return; }
      return fromDirect().then(applyGuilds);
    });
  })();
})();
