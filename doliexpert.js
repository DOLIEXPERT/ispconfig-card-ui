/* =============================================================================
 * DOLIEXPERT — comportements de l'habillage "cartes" pour ISPConfig (classic)
 * Chargé par themes/classic/title.php. Ne modifie aucune donnée : il ne fait
 * que réorganiser l'affichage et lire les menus auxquels l'utilisateur a droit.
 *
 *  1. Listes : pose .dx-cards et les libellés de colonnes (data-label) pour que
 *     le CSS affiche chaque ligne comme une carte.
 *  2. Accueil : construit un bloc "outils par catégorie" + recherche, à partir
 *     des menus réels de chaque module (droits de l'utilisateur respectés).
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__dxLoaded) return;
  window.__dxLoaded = true;

  /* ---------------------------------------------------------------- utils */
  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* ======================================================= 1. LISTES ===== */
  // Ordre de priorité pour choisir le "titre" d'une carte.
  // (le plus spécifique d'abord : un utilisateur SFTP se reconnaît à son nom,
  //  pas au site auquel il est rattaché ; la liste des sites n'a que "Domaine")
  var TITLE_PRIORITY = [
    /e-?mail|adresse|address/i,
    /nom de la base|database name/i,
    /entreprise|societe|société|company/i,
    /utilisateur|user|login|identifiant/i,
    /^nom|name/i,
    /base de donn|database/i,
    /domaine|domain|site/i,
    /client|revendeur|reseller/i
  ];

  function isListTable(table) {
    if (!table.tHead || !table.tBodies.length) return false;
    var rows = table.tHead.rows;
    // une liste ISPConfig = ligne d'intitulés + ligne de filtres (inputs/selects)
    if (rows.length >= 2 && rows[1].querySelector('input, select')) return true;
    return !!table.tBodies[0].querySelector('td.text-right a.formbutton-narrow');
  }

  function cardify(table) {
    if (table.getAttribute('data-dx') === '1') return;
    if (!isListTable(table)) return;
    table.setAttribute('data-dx', '1');

    var headRow = table.tHead.rows[0];
    var labels = Array.prototype.map.call(headRow.cells, function (c) { return txt(c); });

    // index du titre
    var titleIdx = -1;
    for (var p = 0; p < TITLE_PRIORITY.length && titleIdx < 0; p++) {
      for (var i = 0; i < labels.length; i++) {
        if (labels[i] && !/^id$/i.test(labels[i]) && TITLE_PRIORITY[p].test(labels[i])) { titleIdx = i; break; }
      }
    }
    var idIdx = labels.findIndex(function (l) { return /^id$/i.test(l); });
    var stateIdx = labels.findIndex(function (l) { return /^(actif|active|activ)/i.test(l); });
    if (titleIdx < 0) {
      // à défaut : la première colonne de texte qui n'est ni l'ID ni l'état
      titleIdx = labels.findIndex(function (l, k) { return l && k !== idIdx && k !== stateIdx; });
    }

    // libellés sur la ligne de filtres
    if (table.tHead.rows[1]) {
      Array.prototype.forEach.call(table.tHead.rows[1].cells, function (c, k) {
        if (labels[k] && c.querySelector('input, select')) c.setAttribute('data-label', labels[k]);
      });
    }

    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      if (tr.cells.length === 1) { tr.classList.add('dx-empty'); return; }
      Array.prototype.forEach.call(tr.cells, function (td, k) {
        if (k === titleIdx) { td.classList.add('dx-title'); return; }
        if (k === idIdx) { td.classList.add('dx-id'); return; }
        if (td.classList.contains('text-right') && td.querySelector('a.btn, button')) {
          td.classList.add('dx-actions');
          return;
        }
        if (labels[k]) td.setAttribute('data-label', labels[k]);
        if (k === stateIdx) {
          var v = norm(txt(td));
          if (/^(oui|yes|y|ja|si|sim)$/.test(v)) td.setAttribute('data-state', 'on');
          else if (/^(non|no|n|nein|nao)$/.test(v)) td.setAttribute('data-state', 'off');
        }
      });
    });

    var wrap = table.closest('.table-wrapper');
    if (wrap) wrap.classList.add('dx-cards-wrap');
    table.classList.add('dx-cards');
  }

  /* =============================================== 2. ACCUEIL / OUTILS ===== */
  // Icônes Bootstrap Icons (déjà chargé par ISPConfig), choisies selon l'URL.
  var ICONS = [
    [/web_vhost_domain/, 'globe2'], [/type=subdomain|subdomain/, 'diagram-3'], [/aliasdomain/, 'link-45deg'],
    [/database_user/, 'person-badge'], [/database_quota/, 'pie-chart-fill'], [/database/, 'database'],
    [/ftp_sites_stats/, 'graph-up'], [/ftp_user/, 'cloud-arrow-up'], [/webdav/, 'hdd-network'],
    [/web_folder_user/, 'person-lock'], [/web_folder/, 'folder-symlink'], [/shell_user/, 'terminal'],
    [/cron/, 'clock-history'], [/web_sites_stats/, 'bar-chart-line'], [/user_quota/, 'pie-chart'],
    [/backup/, 'archive'], [/reseller_edit|client_edit/, 'person-plus'], [/reseller/, 'briefcase'],
    [/client_circle/, 'diagram-2'], [/client_message|message_template/, 'envelope-paper'],
    [/client_template/, 'sliders2'], [/client/, 'people'],
    [/mail_domain/, 'at'], [/mail_user/, 'envelope'], [/mail_alias/, 'arrow-left-right'],
    [/mail_forward/, 'forward'], [/spamfilter|spam/, 'shield-check'], [/mail_get|fetchmail/, 'inbox'],
    [/mail_transport|mail_relay/, 'truck'], [/mail/, 'envelope'],
    [/dns_wizard/, 'magic'], [/dns_slave/, 'signpost-2'], [/dns/, 'signpost-split'],
    [/server_config|system_config|interface_config/, 'sliders'], [/server/, 'hdd-rack'],
    [/users|user_list|groups/, 'person-gear'], [/language/, 'translate'], [/remote/, 'plug'],
    [/firewall/, 'bricks'], [/software|update|package/, 'box-seam'], [/log|journal|datalog/, 'journal-text'],
    [/monitor|show_|status/, 'activity'], [/password|tools|user_settings/, 'key'], [/resync/, 'arrow-repeat'],
    [/import|export/, 'arrow-down-up'], [/faq|help|support|ticket/, 'question-circle'],
    [/customizer/, 'palette'], [/vm_|openvz|vserver/, 'boxes']
  ];
  // Libellés plus parlants (sinon on garde celui du menu ISPConfig).
  var RELABEL = {
    'client/client_list.php': 'Clients',
    'client/client_edit.php': 'Nouveau client',
    'client/reseller_list.php': 'Revendeurs',
    'client/reseller_edit.php': 'Nouveau revendeur',
    'client/client_circle_list.php': 'Groupes de clients',
    'client/client_message.php': 'Envoyer un e-mail',
    'sites/web_vhost_domain_list.php?type=domain': 'Sites web',
    'sites/web_childdomain_list.php?type=subdomain': 'Sous-domaines',
    'sites/web_childdomain_list.php?type=aliasdomain': 'Alias de domaine',
    'sites/database_list.php': 'Bases de données',
    'sites/database_user_list.php': 'Utilisateurs MySQL',
    'sites/shell_user_list.php': 'Accès SSH / SFTP',
    'sites/cron_list.php': 'Tâches planifiées'
  };
  var SKIP_MODULES = { dashboard: 1, customizer: 1 };
  // Catégories repliées par défaut (longues et peu utilisées au quotidien).
  var DEFAULT_COLLAPSED = { monitor: 1, help: 1 };
  var CACHE_TTL = 30 * 60 * 1000;

  function iconFor(url) {
    for (var i = 0; i < ICONS.length; i++) if (ICONS[i][0].test(url)) return ICONS[i][1];
    return 'grid';
  }

  // Modules auxquels l'utilisateur a droit, lus dans un menu du haut.
  // Attention : ISPConfig retire data-capp du module ACTIF. On lit donc le menu
  // renvoyé par le serveur juste après être passé sur l'accueil (seul l'accueil,
  // qu'on ignore de toute façon, est alors actif) — jamais celui affiché.
  function modulesFrom(root) {
    return Array.prototype.map.call(root.querySelectorAll('a[data-capp]'), function (a) {
      return { id: a.getAttribute('data-capp'), title: txt(a.querySelector('.title')) || txt(a), icon: a.getAttribute('data-icon-class') || '' };
    }).filter(function (m) { return m.id && !SKIP_MODULES[m.id]; });
  }

  function get(url) {
    return fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (r) { return r.text(); });
  }

  function parseSideNav(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    var items = [];
    box.querySelectorAll('ul li a[data-load-content]').forEach(function (a) {
      var url = a.getAttribute('data-load-content');
      var label = txt(a);
      if (url && label) items.push({ url: url, label: RELABEL[url] || label });
    });
    return items;
  }

  // Lit le menu latéral de chaque module. capp.php change le module "courant"
  // de la session : on remet celui de l'utilisateur à la fin.
  var discovering = false, userModule = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-capp]');
    if (a && discovering && !a.closest('#dx-tools')) userModule = a.getAttribute('data-capp');
  }, true);

  function discover() {
    discovering = true; userModule = null;
    var groups = [];
    var failed = false;
    var chain = get('capp.php?mod=dashboard')
      .then(function () { return get('nav.php?nav=top'); })
      .then(function (html) {
        var box = document.createElement('div');
        box.innerHTML = html;
        var mods = modulesFrom(box);
        var c = Promise.resolve();
        mods.forEach(function (m) {
          c = c
            .then(function () { return get('capp.php?mod=' + encodeURIComponent(m.id)); })
            .then(function () { return get('nav.php?nav=side'); })
            .then(function (side) {
              var items = parseSideNav(side);
              if (items.length) groups.push({ id: m.id, title: m.title, icon: m.icon, items: items });
            })
            .catch(function () { failed = true; /* module illisible : on l'ignore */ });
        });
        return c;
      });
    return chain.then(function () {
      groups.failed = failed;
      var back = userModule || 'dashboard';
      return get('capp.php?mod=' + encodeURIComponent(back)).then(function () {
        if (userModule && window.ISPConfig) window.ISPConfig.loadMenus();
        discovering = false;
        return groups;
      });
    }, function () { discovering = false; groups.failed = true; return groups; });
  }

  function cacheKey() {
    // "v2" : invalide les caches écrits par la première version (liste incomplète possible)
    return 'dxTools.v2|' + txt(document.getElementById('logout-button'));
  }
  function readCache(key) {
    try {
      var c = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < CACHE_TTL) return c.g;
    } catch (e) { /* stockage indisponible */ }
    return null;
  }
  function writeCache(key, groups) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), g: groups })); } catch (e) { /* tant pis */ }
  }
  function collapsedState() {
    try { return JSON.parse(localStorage.getItem('dxCollapsed') || '{}'); } catch (e) { return {}; }
  }
  function isCollapsed(id) {
    var s = collapsedState();
    return (id in s) ? !!s[id] : !!DEFAULT_COLLAPSED[id];
  }
  function saveCollapsed(id, v) {
    try { var s = collapsedState(); s[id] = v; localStorage.setItem('dxCollapsed', JSON.stringify(s)); } catch (e) { /* tant pis */ }
  }

  function renderTools(container, groups) {
    var html = '<div class="dx-search"><i class="bi bi-search"></i>' +
      '<input type="search" placeholder="Rechercher un outil (site, base de données, SFTP, client…)" aria-label="Rechercher un outil"></div>' +
      '<div class="dx-nomatch">Aucun outil ne correspond.</div>';
    groups.forEach(function (g) {
      html += '<section class="dx-group' + (isCollapsed(g.id) ? ' dx-collapsed' : '') + '" data-mod="' + esc(g.id) + '">' +
        '<button type="button" class="dx-group-head"><span class="' + esc(g.icon) + '"></span>' + esc(g.title) +
        '<i class="bi bi-chevron-down dx-chevron"></i></button><div class="dx-tiles">';
      g.items.forEach(function (it) {
        html += '<a href="#" class="dx-tile" data-dx-mod="' + esc(g.id) + '" data-dx-url="' + esc(it.url) + '">' +
          '<i class="bi bi-' + iconFor(it.url) + '"></i><span>' + esc(it.label) + '</span></a>';
      });
      html += '</div></section>';
    });
    container.innerHTML = html;

    var input = container.querySelector('.dx-search input');
    input.addEventListener('input', function () {
      var q = norm(input.value.trim());
      container.classList.toggle('dx-filtering', !!q);
      var any = false;
      container.querySelectorAll('.dx-group').forEach(function (sec) {
        var visible = 0;
        sec.querySelectorAll('.dx-tile').forEach(function (t) {
          var hit = !q || norm(t.textContent + ' ' + sec.querySelector('.dx-group-head').textContent).indexOf(q) >= 0;
          t.hidden = !hit;
          if (hit) visible++;
        });
        sec.hidden = !visible;
        if (q) sec.classList.remove('dx-collapsed');
        else if (isCollapsed(sec.getAttribute('data-mod'))) sec.classList.add('dx-collapsed');
        if (visible) any = true;
      });
      container.querySelector('.dx-nomatch').style.display = any ? 'none' : 'block';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = container.querySelector('.dx-tile:not([hidden])');
        if (first) first.click();
      }
    });

    container.addEventListener('click', function (e) {
      var head = e.target.closest('.dx-group-head');
      if (head && !container.classList.contains('dx-filtering')) {
        var sec = head.parentElement;
        sec.classList.toggle('dx-collapsed');
        saveCollapsed(sec.getAttribute('data-mod'), sec.classList.contains('dx-collapsed'));
        return;
      }
      var tile = e.target.closest('.dx-tile');
      if (tile && window.ISPConfig) {
        e.preventDefault();
        // Bascule dans le module (menus à jour) puis ouvre directement la page.
        // capp.php ignore le paramètre redirect pour une page de liste : on
        // attend la bascule, puis on charge la page nous-mêmes.
        var url = tile.getAttribute('data-dx-url');
        window.ISPConfig.showLoadIndicator && window.ISPConfig.showLoadIndicator();
        get('capp.php?mod=' + encodeURIComponent(tile.getAttribute('data-dx-mod'))).then(function () {
          window.ISPConfig.loadMenus();
          window.ISPConfig.loadContent(url);
        }, function () {
          window.ISPConfig.hideLoadIndicator && window.ISPConfig.hideLoadIndicator();
        });
      }
    });
  }

  var building = false;
  function buildDashboard(pc) {
    var modulesList = pc.querySelector('ul.modules');
    if (!modulesList || pc.querySelector('#dx-tools') || building) return;

    var box = document.createElement('div');
    box.id = 'dx-tools';
    var header = pc.querySelector('.page-header');
    if (header && header.nextSibling) header.parentNode.insertBefore(box, header.nextSibling);
    else pc.insertBefore(box, pc.firstChild);

    // On masque l'ancien bloc "Modules disponibles" (son titre h2 compris)
    var h2 = modulesList.closest('div') && modulesList.closest('div').previousElementSibling;
    if (h2 && h2.tagName === 'H2') h2.classList.add('dx-hidden-modules-title');

    var key = cacheKey();
    var cached = readCache(key);
    if (cached) {
      renderTools(box, cached);
      pc.classList.add('dx-has-tools');
      return;
    }
    building = true;
    box.innerHTML = '<div class="dx-nomatch" style="display:block">Chargement des outils…</div>';
    discover().then(function (groups) {
      building = false;
      if (!document.body.contains(box)) return; // l'utilisateur a quitté l'accueil
      if (!groups.length) { box.remove(); return; }
      // une liste incomplète (requête en échec) s'affiche mais n'est pas mise
      // en cache : elle sera relue au prochain passage sur l'accueil
      if (!groups.failed) writeCache(key, groups);
      renderTools(box, groups);
      pc.classList.add('dx-has-tools');
    });
  }

  /* ============================================================ moteur ===== */
  var scheduled = false;
  function scan() {
    scheduled = false;
    var pc = document.getElementById('pageContent');
    if (!pc) return;
    pc.querySelectorAll('table.table').forEach(cardify);
    buildDashboard(pc);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(scan);
  }

  function start() {
    var pc = document.getElementById('pageContent');
    if (!pc) return; // écran de connexion : rien à faire
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length) { schedule(); return; }
      }
    }).observe(pc, { childList: true, subtree: true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
