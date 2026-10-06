const L = value => NexusI18n.fragment(value);
if (location.protocol !== 'file:') {
  const shell = document.querySelector('.app-shell'); shell.hidden = true;
  const gate = document.createElement('section'); gate.className = 'login-screen'; document.body.append(gate);
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const bytes = n => {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    const units = NexusI18n.language() === 'en' ? ['B', 'KiB', 'MiB', 'GiB', 'TiB'] : ['o', 'Ko', 'Mo', 'Gio', 'Tio'];
    const index = n > 0 ? Math.min(4, Math.floor(Math.log(n) / Math.log(1024))) : 0;
    return `${new Intl.NumberFormat(NexusI18n.locale(), { maximumFractionDigits: index ? 1 : 0 }).format(n / 1024 ** index)} ${units[index]}`;
  };
  const glyphs = {
    cpu: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 9h6v6H9zM9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
    memory: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 10v4m5-4v4m5-4v4M6 18v3m6-3v3m6-3v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 14h8m-8 3h5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    download: '<path d="M12 3v13m-4-4 4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M20 7v5h-5M4.7 10a7.5 7.5 0 0 1 12.8-3L20 9M4 17v-5h5m10.3 2a7.5 7.5 0 0 1-12.8 3L4 15"/>',
    disk: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M3 14h18M7 17h.01m4 0h.01"/>',
    link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
    arrow: '<path d="M12 19V5m-5 5 5-5 5 5"/>',
    trash: '<path d="M3 6h18m-16 0 1 15h12l1-15M9 6V3h6v3m-5 4v6m4-6v6"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  };
  const icon = (name, className = '') => `<span class="ui-icon ${className}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">${glyphs[name] || glyphs.file}</svg></span>`;
  let uptimeAnchor = null;
  const uptime = seconds => {
    if (!Number.isFinite(seconds)) return '—';
    const n = Math.max(0, Math.floor(seconds)), days = Math.floor(n / 86400), hours = Math.floor(n % 86400 / 3600), minutes = Math.floor(n % 3600 / 60), secs = n % 60;
    return `${days ? days + (NexusI18n.language() === 'en' ? ' d ' : ' j ') : ''}${hours} h ${String(minutes).padStart(2, '0')} min ${String(secs).padStart(2, '0')} s`;
  };
  function tickUptime() {
    const node = document.querySelector('#uptime-value');
    if (node && uptimeAnchor) node.textContent = uptime(uptimeAnchor.seconds + (performance.now() - uptimeAnchor.at) / 1000);
  }
  setInterval(tickUptime, 1000);
  let me, info, shares = [], users = [], folder = '', selectedShare = '', snapshotData, refreshBusy = false;
  let wizard = false;
  let gateMode = 'login', setupScreen = false, recoveryMessage = '';
  let sharesReady = false;
  const initialPages = new Map([...document.querySelectorAll('.page-view')].map(view => [view, view.innerHTML]));
  const emptySystem = version => ({ version, hostname: null, system: null, architecture: null, uptimeSeconds: null, cpuPercent: null, memory: { total: null, available: null }, network: [], storage: null, diagnostics: [] });
  const status = document.createElement('p'); status.className = 'console-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); document.querySelector('.page-container').prepend(status);
  function notify(message) { status.textContent = message; showNotice(message); }
  async function api(url, { method = 'GET', body, raw, timeout = 15000 } = {}) {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'X-Nexus-Request': '1', ...(raw ? {} : { 'Content-Type': 'application/json' }) }, body: raw || (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(timeout) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401 && !url.includes('login')) { me = null; shell.hidden = true; await loginScreen(); } throw new Error(NexusI18n.message(data.error) || `HTTP ${response.status}`); }
    return data;
  }
  function formSubmit(form, work) {
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('[type=submit]'); if (button) button.disabled = true;
      const error = form.querySelector('[role=alert]'); if (error) error.textContent = '';
      try { await work(Object.fromEntries(new FormData(form))); }
      catch (e) { if (error) error.textContent = e.message; else notify(e.message); }
      finally { if (button) button.disabled = false; }
    });
  }
  function heading(title, subtitle) { return `<div class="page-heading"><div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div></div>`; }
  const field = (label, name, type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
  async function loginScreen(setup = false) {
    gateMode = 'login'; setupScreen = setup;
    me = null; info = null; shares = []; users = []; snapshotData = null; sharesReady = false; wizard = false;
    uptimeAnchor = null;
    fileEntries = [];
    for (const [view, html] of initialPages) view.innerHTML = html;
    status.textContent = '';
    gate.hidden = false; shell.hidden = true;
    gate.innerHTML = `<form class="panel login-panel"><img src="nexus-icon.svg" alt="Nexus" width="64" height="64"><h1>${setup ? L("Installer votre NAS") : L("Bienvenue sur Nexus")}</h1><p>${setup ? L("Entrez le code affiché à la fin de l’installation, puis créez votre compte administrateur.") : L("Connectez-vous avec votre compte Nexus.")}</p>${setup ? field(L("Code d’installation"), 'token', 'password', 'required autocomplete="off"') : ''}${field(L("Nom d’utilisateur"), 'name', 'text', 'required pattern="[a-z][a-z0-9_-]{2,19}" autocomplete="username"')}${field(L("Mot de passe"), 'password', 'password', `required minlength="12" maxlength="256" autocomplete="${setup ? 'new-password' : 'current-password'}"`)}${setup ? field(L("Nom du serveur"), 'hostname', 'text', 'required value="nexus-nas" pattern="[a-z][a-z0-9-]{0,62}"') : ''}<button class="primary-button" type="submit">${setup ? L("Créer mon serveur") : L("Se connecter")}</button><p class="login-error" role="alert"></p></form>`;
    formSubmit(gate.querySelector('form'), async data => {
      if (setup) await api('/api/setup', { method: 'POST', body: data });
      await api('/api/login', { method: 'POST', body: { name: data.name, password: data.password } });
      gate.querySelector('[name=password]').value = ''; await connected();
    });
  }
  function buttons(scope, selector, work) {
    scope.querySelectorAll(selector).forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { await work(button); } catch (e) { notify(e.message); } finally { button.disabled = false; } }));
  }
  async function connected() {
    const identity = await api('/api/me'); me = identity.user;
    snapshotData = emptySystem(identity.version);
    document.querySelector('.profile-copy strong').textContent = me.name;
    document.querySelector('.profile-copy small').textContent = me.role === 'admin' ? L("Administrateur") : L("Utilisateur");
    document.querySelector('.demo-tag').textContent = L("CONNECTÉ");
    document.querySelectorAll('[data-page]').forEach(b => { b.hidden = me.role !== 'admin' && b.dataset.page !== 'files'; });
    try {
      if (me.role === 'admin' && !identity.onboarding) {
        info = await api('/api/agent');
        if (!Array.isArray(info.volumes)) throw new Error(L("Le service Linux n’a pas retourné la liste des volumes"));
        wizard = true; showWizard(); return;
      }
      await refresh(true, true);
      if (!me) return;
      gate.hidden = true; shell.hidden = false;
      showPage(me.role === 'admin' ? (pageNames.fr[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard') : 'files');
    } catch (error) { if (me) recoveryScreen(error.message); }
  }
  function recoveryScreen(message) {
    gateMode = 'recovery'; recoveryMessage = message;
    gate.hidden = false; shell.hidden = true;
    gate.innerHTML = `${L("<section class=\"panel login-panel\"><img src=\"nexus-icon.svg\" alt=\"\" width=\"64\"><h1>Compte connecté</h1><p>Votre compte est enregistré. Le serveur ne peut pas encore charger la configuration.</p><p class=\"login-error\" role=\"alert\">")}${E(message)}${L("</p><button class=\"primary-button\" id=\"setup-retry\">Réessayer</button><button class=\"secondary-button\" id=\"setup-signout\">Déconnexion</button><p>Si le problème persiste, consultez les journaux du service Nexus et de Nexus Agent.</p></section>")}`;
    gate.querySelector('#setup-retry').onclick = async event => { event.target.disabled = true; try { await connected(); } catch (error) { recoveryScreen(error.message); } };
    gate.querySelector('#setup-signout').onclick = async () => { await api('/api/logout', { method: 'POST', body: {} }); me = null; await loginScreen(); };
  }
  async function refresh(full = false, strict = false) {
    if (refreshBusy || !me) return; refreshBusy = true;
    try {
      const admin = me.role === 'admin';
      const routes = admin ? ['/api/shares', '/api/agent', '/api/system', '/api/users'] : ['/api/shares'];
      const results = await Promise.allSettled(routes.map(route => api(route)));
      if (!me) return;
      const issues = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
      const shareResult = results[0];
      if (shareResult.status === 'fulfilled') { shares = shareResult.value; sharesReady = true; }
      if (admin) {
        const [, agentResult, systemResult, userResult] = results;
        if (agentResult.status === 'fulfilled') info = agentResult.value;
        if (systemResult.status === 'fulfilled') snapshotData = systemResult.value;
        if (userResult.status === 'fulfilled') users = userResult.value;
        if (systemResult.status === 'rejected') snapshotData.diagnostics = [L("Mesures système indisponibles : ") + systemResult.reason.message];
        renderDashboard();
        renderJobs();
        if (full) {
          if (info) renderStorage(); else unavailablePage('storage', L("Stockage"), agentResult.reason.message);
          if (shareResult.status === 'fulfilled' && info && userResult.status === 'fulfilled') renderShares(); else unavailablePage('shares', L("Partages réseau"), L("La configuration des partages ne peut pas être chargée."));
          if (userResult.status === 'fulfilled') renderUsers(); else unavailablePage('users', L("Utilisateurs"), userResult.reason.message);
          renderSettings();
        }
      }
      if (full) {
        if (shareResult.status === 'fulfilled') { renderFiles(); await loadFiles(); }
        else unavailablePage('files', L("Fichiers"), shareResult.reason.message);
      }
      status.textContent = [...new Set([...issues, ...(snapshotData?.diagnostics || [])])].map(NexusI18n.message).join(' · ');
    } catch (e) { if (strict) throw e; notify(`${L("Connexion interrompue : ")}${e.message}`); }
    finally { refreshBusy = false; }
  }
  function unavailablePage(page, title, message) {
    const target = document.querySelector(`#page-${page}`);
    target.innerHTML = `${heading(title, L("Service temporairement indisponible"))}<section class="panel"><p role="alert">${E(message)}${L("</p><button class=\"secondary-button\">Réessayer</button></section>")}`;
    target.querySelector('button').onclick = () => refresh(true);
  }
  function chartMarkup(key, title, subtitle) {
    return '<section class="chart-card panel" data-chart="' + key + '"><div class="chart-heading"><div><span class="chart-kicker">' + (key === 'cpu' ? L("PROCESSEUR") : L("MÉMOIRE VIVE")) + '</span><h3>' + title + '</h3><p>' + subtitle + '</p></div><div class="chart-current" id="chart-value-' + key + L("\">—</div></div><div class=\"chart-plot\"><svg viewBox=\"0 0 720 190\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Historique réel de ") + title + '"><defs><linearGradient id="chart-gradient-' + key + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".24"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' + [22, 61, 100, 139, 178].map(y => '<path class="chart-grid-line" d="M32 ' + y + ' H712"/>').join('') + '<text class="chart-axis" x="0" y="26">100</text><text class="chart-axis" x="7" y="104">50</text><text class="chart-axis" x="14" y="180">0</text><path class="chart-area" fill="url(#chart-gradient-' + key + L(")\"/><path class=\"chart-line\"/><circle class=\"chart-end\" r=\"4\" hidden/></svg><span class=\"chart-crosshair\" hidden></span><div class=\"chart-tooltip\" hidden></div></div><div class=\"chart-time-axis\"><span>−10 min</span><span>−5 min</span><span>Maintenant</span></div><p class=\"chart-note\">En attente de la première mesure…</p></section>");
  }
  function renderChart(key, data) {
    const chart = document.querySelector('[data-chart="' + key + '"]'); if (!chart) return;
    const history = Array.isArray(data.history) ? data.history : [];
    const points = history.filter(p => Number.isFinite(Date.parse(p.time))).map(p => ({ time: Date.parse(p.time), value: p[key] }));
    const latest = points.at(-1)?.time || Date.now();
    const from = latest - 600000;
    let line = '', area = '', segment = [], lastPoint;
    const finish = () => {
      if (!segment.length) return;
      line += 'M' + segment.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' L') + ' ';
      if (segment.length > 1) area += 'M' + segment[0].x + ',178 L' + segment.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' L') + ' L' + segment.at(-1).x + ',178 Z ';
      segment = [];
    };
    for (const p of points) {
      if (p.time < from) continue;
      if (p.value == null || !Number.isFinite(p.value)) { finish(); continue; }
      const point = { x: 32 + 680 * (p.time - from) / 600000, y: 178 - Math.max(0, Math.min(100, p.value)) * 1.56 };
      segment.push(point); lastPoint = point;
    }
    finish();
    chart.querySelector('.chart-line').setAttribute('d', line); chart.querySelector('.chart-area').setAttribute('d', area);
    const dot = chart.querySelector('.chart-end'); dot.toggleAttribute('hidden', !lastPoint);
    if (lastPoint) { dot.setAttribute('cx', lastPoint.x); dot.setAttribute('cy', lastPoint.y); }
    const current = points.at(-1)?.value;
    chart.querySelector('.chart-current').textContent = current == null ? '—' : current + ' %';
    chart.querySelector('.chart-note').textContent = points.length ? (points.length === 1 ? L("Première mesure reçue. La courbe se construit toutes les 10 secondes.") : points.length + L(" mesures réelles · actualisation toutes les 10 secondes")) : L("Les mesures sont temporairement indisponibles.");
    const plot = chart.querySelector('.chart-plot'), tip = chart.querySelector('.chart-tooltip'), cross = chart.querySelector('.chart-crosshair');
    const inspect = event => {
      const rect = plot.getBoundingClientRect(), x = Math.max(32, Math.min(712, (event.clientX - rect.left) / rect.width * 720));
      const targetTime = from + (x - 32) / 680 * 600000;
      const valid = points.filter(p => p.value != null && Number.isFinite(p.value));
      if (!valid.length) return;
      const nearest = valid.reduce((a, b) => Math.abs(a.time - targetTime) < Math.abs(b.time - targetTime) ? a : b);
      const position = (32 + 680 * (nearest.time - from) / 600000) / 720 * 100;
      tip.textContent = new Date(nearest.time).toLocaleTimeString(NexusI18n.locale()) + ' · ' + nearest.value + ' %';
      tip.hidden = false; cross.hidden = false; cross.style.left = position + '%'; tip.style.left = Math.max(14, Math.min(82, position)) + '%';
    };
    plot.onpointermove = inspect; plot.onpointerleave = () => { tip.hidden = true; cross.hidden = true; };
  }
  function setMetric(id, value) {
    const node = document.querySelector('#' + id); if (!node || node.textContent === String(value)) return;
    node.textContent = value;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && node.animate) node.animate([{ opacity: .45, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'ease-out' });
  }
  function renderDashboard() {
    const d = snapshotData, target = document.querySelector('#page-dashboard'), host = d.hostname || location.hostname;
    document.querySelector('.server-card strong').textContent = d.hostname || 'NAS Nexus';
    document.querySelector('.server-card small').textContent = (d.system || L("Service Linux")) + ' · v' + (d.version || '—');
    if (!target.querySelector('#dashboard-live')) {
      target.innerHTML = L("<div id=\"dashboard-live\"><div class=\"dashboard-heading\"><div><p class=\"eyebrow\">VOTRE ESPACE, EN TOUTE SÉRÉNITÉ</p><h1>Bonjour, <span id=\"dashboard-name\"></span><span class=\"greeting-dot\">.</span></h1><p class=\"page-subtitle\">Vos données à portée de main. Votre serveur sous contrôle.</p></div><div class=\"live-badge\"><span></span>Connecté au NAS</div></div><div class=\"metric-grid\">") + [['cpu', L("Processeur"), L("Charge actuelle"), 'cpu'], ['memory', L("Mémoire"), L("Mémoire utilisée"), 'memory'], ['shares', L("Partages"), L("Vos espaces accessibles"), 'folder'], ['uptime', L("Durée de fonctionnement"), L("Depuis le dernier démarrage"), 'clock']].map(([key, title, caption, glyph]) => '<article class="metric-card metric-' + key + '"><div class="metric-heading"><span>' + title + '</span>' + icon(glyph, 'metric-symbol') + '</div><div class="metric-value" id="' + key + '-value">—</div><div class="metric-foot"><span class="metric-caption">' + caption + '</span>' + (key === 'cpu' || key === 'memory' ? '<div class="metric-meter"><span id="meter-' + key + '"></span></div>' : '<span class="metric-tiny-dot"></span>') + '</div></article>').join('') + L("</div><div class=\"section-heading activity-heading\"><div><h2>Le rythme de votre serveur</h2><p>Les dix dernières minutes, mesurées en direct.</p></div><span class=\"collection-badge\"><span></span>Une mesure / 10 s</span></div><div class=\"charts-grid\">") + chartMarkup('cpu', L("Activité du processeur"), L("Une vue précise de la charge du serveur.")) + chartMarkup('memory', L("Utilisation de la mémoire"), L("Gardez un œil sur les ressources disponibles.")) + '</div><div class="dashboard-details"><section class="panel access-panel"><div class="panel-title"><span class="panel-symbol">' + icon('link') + L("</span><div><h2>Un serveur, tous vos appareils</h2><p>Retrouvez vos données où vous en avez besoin.</p></div></div><div id=\"server-access\"></div></section><section class=\"panel capacity-panel\"><div class=\"panel-title\"><span class=\"panel-symbol\">") + icon('disk') + L("</span><div><h2>De la place pour l’essentiel</h2><p>Votre espace de stockage actuel.</p></div></div><div class=\"capacity-content\"><div class=\"usage-ring\" id=\"storage-ring\"><div><strong id=\"storage-percent\">—</strong><span>utilisé</span></div></div><div class=\"capacity-numbers\"><span>ESPACE DISPONIBLE</span><strong id=\"storage-available\">—</strong><p id=\"storage-description\"></p><div class=\"capacity-legend\"><span><i></i>Utilisé</span><span><i></i>Disponible</span></div></div></div><div class=\"capacity-footer\"><span id=\"storage-location\"></span><button class=\"text-link\" id=\"live-refresh\">Actualiser</button></div></section></div><section class=\"panel jobs-panel\" id=\"jobs\"></section><footer class=\"dashboard-footer\"><span>Nexus · votre cloud personnel</span><span id=\"server-version\"></span></footer></div>");
      target.querySelector('#live-refresh').onclick = () => refresh(true);
    }
    target.querySelector('#dashboard-name').textContent = me.name;
    const memory = d.memory?.total && d.memory.available != null ? Math.round(100 * (1 - d.memory.available / d.memory.total)) : null;
    setMetric('cpu-value', d.cpuPercent == null ? '—' : d.cpuPercent + ' %');
    setMetric('memory-value', memory == null ? '—' : memory + ' %');
    setMetric('shares-value', sharesReady ? shares.length : '—');
    uptimeAnchor = d.uptimeSeconds == null ? null : { seconds: d.uptimeSeconds, at: performance.now() };
    if (uptimeAnchor) tickUptime(); else setMetric('uptime-value', '—');
    for (const [key, value] of [['cpu', d.cpuPercent], ['memory', memory]]) target.querySelector('#meter-' + key).style.width = Math.max(0, Math.min(100, value || 0)) + '%';
    renderChart('cpu', d); renderChart('memory', d);
    const used = d.storage?.total ? Math.round(d.storage.used / d.storage.total * 100) : null;
    target.querySelector('#storage-ring').style.setProperty('--usage', used || 0);
    target.querySelector('#storage-percent').textContent = used == null ? '—' : used + ' %';
    target.querySelector('#storage-available').textContent = bytes(d.storage?.available);
    target.querySelector('#storage-description').textContent = L("sur ") + bytes(d.storage?.total) + L(" de capacité");
    target.querySelector('#storage-location').textContent = d.storage?.path || L("Volume indisponible");
    target.querySelector('#server-version').textContent = 'Nexus ' + (d.version || '—') + ' · ' + (d.architecture || '—');
    const access = target.querySelector('#server-access');
    const accessData = [{ label: L("Depuis votre navigateur"), value: location.origin, glyph: 'link' }, { label: L("Explorateur Windows"), value: '\\\\' + connectionHost(), glyph: 'folder' }, { label: 'Linux & macOS', value: 'smb://' + host, glyph: 'disk' }];
    const signature = JSON.stringify(accessData) + me.name;
    if (access.dataset.signature !== signature) {
      access.dataset.signature = signature;
      access.innerHTML = accessData.map(a => '<div class="access-row">' + icon(a.glyph) + '<div><span>' + a.label + '</span><strong>' + E(a.value) + '</strong></div><button class="copy-button" type="button" aria-label="' + L('Copier ') + a.label + '" data-copy="' + E(a.value) + '">' + icon('copy') + '</button></div>').join('') + '<p class="access-account">' + icon('users') + L(" Compte SMB <strong>nx_") + E(me.name) + '</strong></p>';
      buttons(access, '[data-copy]', async b => { await navigator.clipboard.writeText(b.dataset.copy); notify(L("Adresse copiée")); });
    }
  }
  function renderJobs() {
    const target = document.querySelector('#jobs'); if (!target || !info) return;
    const jobs = [...info.jobs.slice(-5), ...(info.update ? [{ kind: L("Mise à jour"), ...info.update }] : [])];
    const signature = NexusI18n.language() + JSON.stringify(jobs);
    if (target.dataset.signature === signature) return;
    target.dataset.signature = signature;
    const labels = { success: L("Terminé"), running: L("En cours"), failed: L("Échec") };
    target.innerHTML = '<div class="panel-title">' + icon('clock', 'panel-symbol') + L("<div><h2>La vie de votre NAS</h2><p>Vos dernières opérations, en un coup d’œil.</p></div><span class=\"section-count\">") + jobs.length + '</span></div>' + (jobs.length ? '<div class="job-list">' + jobs.map(j => '<div class="job-row job-' + E(j.status) + '"><span class="job-symbol">' + icon(j.status === 'success' ? 'check' : j.status === 'running' ? 'refresh' : 'clock') + '</span><div><strong>' + E(j.kind === 'partition' ? L("Préparation du disque") : j.kind || L("Mise à jour")) + '</strong><p>' + E(NexusI18n.message(j.message)) + '</p></div><span class="status-badge">' + E(labels[j.status] || j.status) + '</span></div>').join('') + '</div>' : '<div class="empty-activity">' + icon('check') + L("<p>Tout est calme. Vos prochaines opérations apparaîtront ici.</p></div>"));
  }
  function showWizard() {
    gateMode = 'wizard';
    shell.hidden = true; gate.hidden = false;
    if (!info || !Array.isArray(info.volumes)) { recoveryScreen(L("Les volumes sont indisponibles. Réessayez lorsque le service Linux est prêt.")); return; }
    gate.innerHTML = `${L("<form class=\"panel login-panel\"><img src=\"nexus-icon.svg\" alt=\"\" width=\"64\"><p class=\"eyebrow\">CONFIGURATION · STOCKAGE ET ACCÈS</p><h1>Votre premier partage</h1><p>Vous pouvez conserver les disques actuels ou préparer un disque vide. Les fichiers seront accessibles dans le navigateur et par SMB.</p>")}${(info.diagnostics || []).map(d => `<p class="login-error">${E(NexusI18n.message(d))}</p>`).join('')}${L("<button type=\"button\" class=\"secondary-button\" id=\"wizard-disk\">Préparer un disque…</button><label>Volume<select name=\"volume\">")}${info.volumes.map(v => `<option value="${E(v.id)}">${E(NexusI18n.message(v.name))}</option>`).join('')}</select></label>${field(L("Nom du partage"), 'name', 'text', 'required value="documents" pattern="[a-z][a-z0-9_-]{2,19}"')}${L("<button type=\"submit\" class=\"primary-button\">Créer le partage et terminer</button><button type=\"button\" class=\"text-link\" id=\"wizard-skip\">Terminer sans partage</button><p class=\"login-error\" role=\"alert\"></p></form>")}`;
    const finish = async () => { await api('/api/onboarding', { method: 'POST', body: {} }); wizard = false; gate.hidden = true; shell.hidden = false; await refresh(true); showPage('files'); if (shares[0]) connectShare(shares[0]); };
    formSubmit(gate.querySelector('form'), async data => { await api('/api/shares/save', { method: 'POST', body: { ...data, members: [{ name: me.name, write: true }] } }); await finish(); });
    gate.querySelector('#wizard-skip').onclick = () => finish().catch(e => notify(e.message));
    gate.querySelector('#wizard-disk').onclick = () => diskDialog();
  }
  function renderStorage() {
    const target = document.querySelector('#page-storage');
    target.innerHTML = `${heading(L("Stockage"), L("Partitionnez un disque inutilisé en volumes ext4, montés automatiquement au démarrage."))}${L("<section class=\"panel\"><h2>Volumes disponibles</h2>")}${info.volumes.map(v => `<p><strong>${E(NexusI18n.message(v.name))}</strong> · ${E(v.path)}</p>`).join('')}${L("</section><section class=\"panel table-panel\"><div class=\"table-scroll\"><table><thead><tr><th>DISQUE</th><th>CAPACITÉ</th><th>ÉTAT</th><th>ACTION</th></tr></thead><tbody>")}${info.disks.map(d => `<tr><td><strong>${E(d.name)}</strong><small>${E(d.model)} · ${E(d.serial)}</small></td><td>${bytes(d.size)}</td><td>${E(NexusI18n.message(d.reason) || L("Disponible pour partitionnement"))}</td><td><button class="secondary-button" data-disk="${E(d.name)}" ${d.canPartition ? '' : 'disabled'}${L(">Partitionner…</button></td></tr>")}`).join('') || L("<tr><td colspan=\"4\">Aucun disque détecté.</td></tr>")}${L("</tbody></table></div></section><p class=\"page-subtitle\">Le partitionnement efface le disque entier. Les disques montés, système, swap, RAID, LVM et chiffrés sont protégés.</p>")}`;
    buttons(target, '[data-disk]', b => diskDialog(b.dataset.disk));
  }
  function modal(content) {
    const dialog = document.createElement('dialog'); dialog.className = 'nexus-dialog'; dialog.innerHTML = `${L("<button type=\"button\" class=\"dialog-close\" aria-label=\"Fermer\">×</button>")}${content}`; document.body.append(dialog);
    dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); return dialog;
  }
  function askInput(message, initial = '') {
    return new Promise(resolve => {
      const dialog = modal(`<form class="console-form"><div class="dialog-symbol">${icon('edit')}</div><h2>${E(message)}</h2>${field(L("Votre saisie"), 'value', 'text', `required value="${E(initial)}" autocomplete="off"`)}${L("<div class=\"dialog-actions\"><button type=\"button\" class=\"secondary-button\" data-cancel>Annuler</button><button type=\"submit\" class=\"primary-button\">Continuer</button></div><p role=\"alert\"></p></form>")}`);
      dialog.addEventListener('close', () => resolve(null)); dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
      formSubmit(dialog.querySelector('form'), async values => { resolve(values.value); dialog.close(); });
      dialog.querySelector('input').focus();
    });
  }
  function confirmAction(message) {
    return new Promise(resolve => {
      const dialog = modal(`<div class="console-form"><div class="dialog-symbol">${icon('check')}${L("</div><h2>Confirmer l’action</h2><p class=\"dialog-description\">")}${E(message)}${L("</p><div class=\"dialog-actions\"><button class=\"secondary-button\" data-cancel>Annuler</button><button class=\"primary-button\" data-confirm>Confirmer</button></div></div>")}`);
      dialog.addEventListener('close', () => resolve(false)); dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
      dialog.querySelector('[data-confirm]').onclick = () => { resolve(true); dialog.close(); };
    });
  }
  async function diskDialog(selected) {
    info = await api('/api/agent');
    const available = info.disks.filter(d => d.canPartition);
    if (!available.length) {
      modal(`${L("<section class=\"console-form\"><h2>Préparer un disque</h2><div class=\"disk-unavailable\" role=\"status\"><strong>Aucun disque disponible pour le partitionnement</strong><p>Le disque système et les disques actuellement utilisés sont protégés. Vous pouvez continuer avec le stockage système ou ajouter un disque inutilisé au serveur.</p></div>")}${info.disks.length ? `<div class="disk-detection-list">${info.disks.map(d => `<p><strong>${E(d.name)}</strong><br><span>${E(NexusI18n.message(d.reason) || L("Disque indisponible"))}</span></p>`).join('')}</div>` : ''}${(info.diagnostics || []).map(d => `<p role="alert">${E(NexusI18n.message(d))}</p>`).join('')}</section>`);
      return;
    }
    const dialog = modal(`${L("<form class=\"console-form\"><h2>Préparer un disque</h2><p class=\"destructive-warning\">Cette opération détruit toutes les partitions et tous les fichiers du disque choisi.</p><label>Disque<select name=\"device\" required>")}${available.map(d => `<option value="${E(d.name)}" ${d.name === selected ? 'selected' : ''}>${E(d.name)} · ${bytes(d.size)} · ${E(d.model)}</option>`).join('')}${L("</select></label><label>Partitions (une par ligne : label, taille en Gio ; * pour l’espace restant)<textarea name=\"partitions\" required rows=\"4\">donnees,*</textarea></label><button type=\"submit\" class=\"primary-button\" ")}${available.length ? '' : 'disabled'}${L(">Préparer le plan</button><p role=\"alert\"></p></form>")}`);
    formSubmit(dialog.querySelector('form'), async values => {
      const partitions = values.partitions.split('\n').filter(Boolean).map(line => { const [label, size] = line.split(',').map(p => p.trim()); return { label, sizeGiB: size === '*' ? null : Number(size) }; });
      const plan = await api('/api/disks/plan', { method: 'POST', body: { device: values.device, partitions } });
      const form = dialog.querySelector('form');
      const confirmationText = NexusI18n.language() === 'en' ? plan.confirmation.replace(/^EFFACER /, 'ERASE ') : plan.confirmation;
      form.innerHTML = `${L("<h2>Confirmer l’effacement de ")}${E(plan.device)}</h2><p class="destructive-warning">${E(NexusI18n.message(plan.warning))}</p><p>${plan.partitions.map(p => `${E(p.label)} : ${p.sizeGiB === null ? L("espace restant") : `${p.sizeGiB} ${L('Gio')}`}`).join('<br>')}${L("</p><p>Saisissez exactement : <strong>")}${E(confirmationText)}</strong></p>${field('Confirmation', 'confirmation', 'text', 'required autocomplete="off"')}${L("<button type=\"submit\" class=\"danger-button\">Effacer et créer les volumes</button><p role=\"alert\"></p>")}`;
      // Replace the form to remove its previous submission handler.
      const next = form.cloneNode(true); form.replaceWith(next);
      formSubmit(next, async value => {
        const job = await api('/api/disks/execute', { method: 'POST', body: { token: plan.token, confirmation: value.confirmation === confirmationText ? plan.confirmation : value.confirmation } });
        next.innerHTML = L("<h2>Préparation en cours</h2><p role=\"status\">Le serveur prépare votre disque. Ne débranchez pas le disque.</p>");
        await watchJob(job.id, next.querySelector('p'));
        await refresh(true); dialog.close(); if (wizard) showWizard();
      });
    });
  }
  async function watchJob(id, output) {
    while (document.contains(output)) {
      await new Promise(r => setTimeout(r, 1500)); const data = await api('/api/agent'); const job = data.jobs.find(j => j.id === id);
      if (!job) throw new Error(L("Opération introuvable")); output.textContent = NexusI18n.message(job.message);
      if (job.status !== 'running') { if (job.status === 'failed') throw new Error(job.message); return; }
    }
  }
  function renderShares() {
    const target = document.querySelector('#page-shares');
    target.innerHTML = `${heading(L("Partages réseau"), L("Les dossiers accessibles depuis le navigateur et vos appareils SMB."))}${L("<button class=\"primary-button\" id=\"new-share\">Créer un partage</button><section class=\"panel table-panel\"><div class=\"table-scroll\"><table><thead><tr><th>NOM</th><th>DOSSIER</th><th>ACCÈS</th><th>ACTIONS</th></tr></thead><tbody>")}${shares.map(s => `<tr><td>${E(s.name)}</td><td>${E(s.path)}</td><td>${s.members.map(m => `${E(m.name)} (${m.write ? L("lecture / écriture") : L("lecture")})`).join(', ')}</td><td><button class="secondary-button" data-edit-share="${E(s.name)}${L("\">Modifier</button> <button class=\"secondary-button\" data-connect-share=\"")}${E(s.name)}${L("\">Connecter</button> <button class=\"danger-button\" data-remove-share=\"")}${E(s.name)}${L("\">Retirer</button></td></tr>")}`).join('') || L("<tr><td colspan=\"4\">Créez votre premier partage.</td></tr>")}</tbody></table></div></section>`;
    buttons(target, '[data-connect-share]', b => connectShare(shares.find(s => s.name === b.dataset.connectShare)));
    target.querySelector('#new-share').onclick = () => shareDialog();
    buttons(target, '[data-edit-share]', b => shareDialog(shares.find(s => s.name === b.dataset.editShare)));
    buttons(target, '[data-remove-share]', async b => { if (!await confirmAction(L("Retirer cet accès réseau ? Les fichiers seront conservés sur le disque."))) return; await api('/api/shares/remove', { method: 'POST', body: { name: b.dataset.removeShare } }); await refresh(true); });
  }
  function shareDialog(share) {
    const dialog = modal(`<form class="console-form"><h2>${share ? L("Modifier") : L("Créer")}${L(" un partage</h2>")}${field(L("Nom"), 'name', 'text', `required value="${E(share?.name || '')}" pattern="[a-z][a-z0-9_-]{2,19}" ${share ? 'readonly' : ''}`)}<label>Volume<select name="volume">${info.volumes.map(v => `<option value="${E(v.id)}" ${share?.volume === v.id ? 'selected' : ''}>${E(NexusI18n.message(v.name))}</option>`).join('')}${L("</select></label><fieldset><legend>Utilisateurs autorisés</legend>")}${users.filter(u => u.enabled).map(u => `<label class="member-row"><input type="checkbox" name="member-${E(u.name)}" ${(share?.members.some(m => m.name === u.name) || (!share && u.name === me.name)) ? 'checked' : ''}>${E(u.name)}<select name="access-${E(u.name)}${L("\"><option value=\"write\">Lecture / écriture</option><option value=\"read\" ")}${share?.members.some(m => m.name === u.name && !m.write) ? 'selected' : ''}${L(">Lecture seule</option></select></label>")}`).join('')}${L("</fieldset><button class=\"primary-button\" type=\"submit\">Enregistrer</button><p role=\"alert\"></p></form>")}`);
    formSubmit(dialog.querySelector('form'), async values => { const members = users.filter(u => values[`member-${u.name}`]).map(u => ({ name: u.name, write: values[`access-${u.name}`] === 'write' })); await api('/api/shares/save', { method: 'POST', body: { name: values.name, volume: values.volume, members } }); dialog.close(); await refresh(true); });
  }
  function renderUsers() {
    const target = document.querySelector('#page-users');
    target.innerHTML = `${heading(L("Utilisateurs"), L("Comptes Nexus et SMB. Les connexions SSH ne sont pas autorisées pour ces comptes."))}${L("<button class=\"primary-button\" id=\"new-user\">Ajouter un utilisateur</button><section class=\"panel table-panel\"><div class=\"table-scroll\"><table><thead><tr><th>COMPTE</th><th>RÔLE</th><th>ÉTAT</th><th>ACTION</th></tr></thead><tbody>")}${users.map(u => `<tr><td>${E(u.name)}<small>SMB : nx_${E(u.name)}</small></td><td>${E(u.role)}</td><td>${u.enabled ? L("Actif") : L("Désactivé")}</td><td><button class="danger-button" data-disable="${E(u.name)}" ${u.name === me.name || !u.enabled ? 'disabled' : ''}${L(">Désactiver</button></td></tr>")}`).join('')}</tbody></table></div></section>`;
    target.querySelector('#new-user').onclick = () => {
      const dialog = modal(`${L("<form class=\"console-form\"><h2>Ajouter un compte</h2>")}${field(L("Nom"), 'name', 'text', 'required pattern="[a-z][a-z0-9_-]{2,19}"')}${field(L("Mot de passe"), 'password', 'password', 'required minlength="12" maxlength="256" autocomplete="new-password"')}${L("<label>Rôle<select name=\"role\"><option value=\"user\">Utilisateur</option><option value=\"admin\">Administrateur</option></select></label><button type=\"submit\" class=\"primary-button\">Créer le compte</button><p role=\"alert\"></p></form>")}`);
      formSubmit(dialog.querySelector('form'), async body => { await api('/api/users', { method: 'POST', body }); dialog.close(); await refresh(true); });
    };
    buttons(target, '[data-disable]', async b => { if (!await confirmAction(`${L("Désactiver les accès web et SMB de ")}${b.dataset.disable} ?`)) return; await api('/api/users/disable', { method: 'POST', body: { name: b.dataset.disable } }); await refresh(true); });
    for (const user of users) {
      const cell = target.querySelector(`[data-disable="${user.name}"]`).parentElement;
      const edit = document.createElement('button'); edit.className = 'secondary-button'; edit.textContent = L("Modifier"); cell.prepend(edit);
      edit.onclick = () => {
        const dialog = modal(`${L("<form class=\"console-form\"><h2>Compte ")}${E(user.name)}</h2>${field(L("Nouveau mot de passe (facultatif)"), 'password', 'password', 'minlength="12" maxlength="256" autocomplete="new-password"')}${L("<label>Rôle<select name=\"role\"><option value=\"user\" ")}${user.role === 'user' ? 'selected' : ''}${L(">Utilisateur</option><option value=\"admin\" ")}${user.role === 'admin' ? 'selected' : ''}${L(">Administrateur</option></select></label><label>État<select name=\"enabled\"><option value=\"yes\" ")}${user.enabled ? 'selected' : ''}${L(">Actif</option><option value=\"no\" ")}${user.enabled ? '' : 'selected'}${L(">Désactivé</option></select></label><button type=\"submit\" class=\"primary-button\">Enregistrer</button><p role=\"alert\"></p></form>")}`);
        formSubmit(dialog.querySelector('form'), async values => { await api('/api/users/update', { method: 'POST', body: { ...values, name: user.name, enabled: values.enabled === 'yes' } }); dialog.close(); if (user.name === me.name) { me = null; await loginScreen(); } else await refresh(true); });
      };
    }
  }
  function renderFiles() {
    if (!shares.some(s => s.name === selectedShare)) { selectedShare = shares[0]?.name || ''; folder = ''; }
    const target = document.querySelector('#page-files');
    target.innerHTML = heading(L("Fichiers"), L("Un espace pour vos documents, vos photos et tout ce qui compte.")) + L("<section class=\"panel file-workspace\"><div class=\"file-toolbar\"><label class=\"share-picker\">Votre espace<select id=\"file-share\">") + shares.map(s => '<option value="' + E(s.name) + '" ' + (s.name === selectedShare ? 'selected' : '') + '>' + E(s.name) + (s.writable ? '' : L(" (lecture seule)")) + '</option>').join('') + L("</select></label><div class=\"file-toolbar-actions\"><button class=\"secondary-button\" id=\"file-up\">Dossier parent</button><button class=\"secondary-button\" id=\"file-folder\">Nouveau dossier</button><label class=\"primary-button file-upload-label\">") + icon('upload') + L("Déposer des fichiers<input type=\"file\" id=\"file-upload\" multiple></label></div></div><div class=\"file-drop\" id=\"file-drop\" role=\"button\" tabindex=\"0\" aria-label=\"Choisir des fichiers à déposer\"><span class=\"drop-orbit\">") + icon('upload') + L("</span><div><strong>Faites de la place à vos fichiers.</strong><p>Glissez-les ici, ou cliquez pour les déposer. Ils restent chez vous.</p></div><span class=\"drop-tag\">Votre cloud privé</span></div><p id=\"transfer-progress\" role=\"status\"></p><div class=\"file-list-heading\"><nav id=\"file-path\" aria-label=\"Chemin du dossier\"></nav><div class=\"file-list-tools\"><span id=\"file-count\" class=\"section-count\"></span><label class=\"file-search\">") + icon('search') + L("<input id=\"file-search\" type=\"search\" placeholder=\"Rechercher un fichier…\" aria-label=\"Rechercher dans ce dossier\"></label></div></div><div class=\"table-scroll\"><table class=\"file-table\"><thead><tr><th>NOM</th><th>TAILLE</th><th>DERNIÈRE MODIFICATION</th><th>ACTIONS</th></tr></thead><tbody id=\"file-rows\"></tbody></table></div></section>");
    target.querySelector('#file-search').oninput = () => renderFileRows();
    target.querySelector('#file-share').onchange = async e => { selectedShare = e.target.value; await navigateFolder(''); };
    target.querySelector('#file-up').onclick = () => { navigateFolder(folder.split('/').slice(0, -1).join('/')).catch(e => notify(e.message)); };
    target.querySelector('#file-folder').onclick = async () => { const name = await askInput(L("Nom du nouveau dossier")); if (!name) return; try { await api(fileUrl('/api/files/folder', join(name)), { method: 'POST', body: {} }); await loadFiles(); } catch (e) { notify(e.message); } };
    target.querySelector('#file-upload').onchange = e => upload(e.target.files);
    const connect = document.createElement('button'); connect.className = 'secondary-button'; connect.textContent = L("Connecter un lecteur réseau"); connect.onclick = () => { try { connectShare(shares.find(s => s.name === selectedShare)); } catch (e) { notify(e.message); } }; target.querySelector('.file-toolbar-actions').append(connect);
    const trash = document.createElement('button'); trash.className = 'secondary-button'; trash.textContent = L("Corbeille"); target.querySelector('.file-toolbar-actions').append(trash);
    trash.onclick = async () => {
      try {
        const records = await api(fileUrl('/api/files/trash'));
        const dialog = modal(`${L("<h2>Corbeille · ")}${E(selectedShare)}${L("</h2><p>Les fichiers retirés occupent encore de l’espace jusqu’à ce que la corbeille soit vidée.</p><div class=\"console-form\">")}${records.map(r => `<p>${E(r.original)} <button class="secondary-button" data-restore="${E(r.id)}${L("\">Restaurer</button></p>")}`).join('') || L("<p>La corbeille est vide.</p>")}${L("<button class=\"danger-button\" id=\"trash-purge\">Vider définitivement…</button></div>")}`);
        buttons(dialog, '[data-restore]', async b => { await api(fileUrl('/api/files/restore'), { method: 'POST', body: { id: b.dataset.restore } }); dialog.close(); await loadFiles(); });
        dialog.querySelector('#trash-purge').onclick = async () => { const confirmation = await askInput(L("Tapez VIDER LA CORBEILLE. Cette suppression est définitive.")); if (!confirmation) return; try { await api(fileUrl('/api/files/purge'), { method: 'POST', body: { confirmation: NexusI18n.language() === 'en' && confirmation === 'EMPTY TRASH' ? 'VIDER LA CORBEILLE' : confirmation } }); dialog.close(); await loadFiles(); } catch (e) { notify(e.message); } };
      } catch (e) { notify(e.message); }
    };
    const drop = target.querySelector('#file-drop');
    const pickFiles = () => { if (!target.querySelector('#file-upload').disabled) target.querySelector('#file-upload').click(); };
    drop.onclick = pickFiles; drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles(); } };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-active'); }; drop.ondragleave = () => drop.classList.remove('drag-active'); drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag-active'); upload(e.dataTransfer.files); };
  }
  const join = name => folder ? `${folder}/${name}` : name;
  async function navigateFolder(next) {
    const previous = folder; folder = next;
    document.querySelector('#file-search').value = '';
    try { await loadFiles(); }
    catch (error) { folder = previous; await loadFiles().catch(() => {}); throw error; }
  }
  function connectionHost() {
    const browserHost = location.hostname;
    const host = /^[a-z0-9.-]+$/i.test(browserHost) ? browserHost : snapshotData?.network?.[0]?.address || snapshotData?.hostname;
    if (!host || !/^[a-z0-9.-]+$/i.test(host)) throw new Error(L("Adresse réseau indisponible"));
    return host;
  }
  function windowsHelper(host, share, account, drive) {
    const cfg = {
      host, path: '\\\\' + host + '\\' + share, account, drive,
      title: L('Connecter un lecteur réseau'), accountLabel: L('Compte SMB'), passwordLabel: L('Mot de passe Nexus'), driveLabel: L('Lettre du lecteur'),
      connect: L('Connecter'), intro: L('Entrez votre mot de passe Nexus, puis cliquez sur Connecter.'),
      passwordMissing: L('Saisissez votre mot de passe Nexus.'), driveMissing: L('Aucune lettre de lecteur disponible.'),
      checking: L('Vérification de la connexion…'), unreachable: L('Le NAS ne répond pas sur le port de partage. Vérifiez le réseau et le service SMB dans Nexus.'),
      success: L('Votre lecteur réseau est connecté. Il apparaît dans Ce PC.'), failed: L('Connexion impossible. Erreur Windows :'),
      conflictQuestion: L('Windows utilise un autre compte pour ce NAS. Fermez ses fichiers ouverts. Déconnecter uniquement les anciennes connexions de ce NAS et réessayer ?'),
      ntlmBlocked: L('La politique Windows bloque l’authentification NTLM utilisée par ce NAS. Contactez l’administrateur de ce PC.'),
      openFiles: L('Fermez les fichiers et fenêtres ouverts sur ce NAS, puis réessayez.'),
      errors: {
        5: L('Accès refusé. Réparez votre accès dans Nexus et vérifiez les utilisateurs autorisés du partage.'),
        53: L('Serveur introuvable. Vérifiez que Windows est sur le même réseau que le NAS.'),
        67: L('Ce partage est introuvable. Téléchargez un nouvel assistant depuis Nexus.'),
        85: L('Cette lettre est déjà utilisée. Choisissez une autre lettre.'),
        86: L('Mot de passe incorrect. Utilisez le mot de passe Nexus ou réparez votre accès dans Nexus.'),
        1326: L('Identifiants refusés. Utilisez le mot de passe Nexus ou réparez votre accès dans Nexus.'),
        1219: L('Windows conserve un autre compte pour ce NAS. Fermez ses fichiers ouverts, puis réessayez.'),
        58: L('Windows refuse la connexion SMB. Lancez Vérifier puis Réparer mon accès dans Nexus. Si cela persiste, transmettez ce code au support.'),
        1272: L('Windows refuse un accès invité. Réparez votre compte SMB dans Nexus.'),
        1240: L('Windows refuse cette méthode d’authentification. Vérifiez les règles de sécurité de ce PC.'),
      },
    };
    const config = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(cfg))));
    const script = "Add-Type -AssemblyName System.Windows.Forms\nAdd-Type -AssemblyName System.Drawing\nAdd-Type @'\nusing System;\nusing System.Runtime.InteropServices;\npublic class NexusNetwork {\n  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]\n  public struct Resource { public int scope; public int type; public int display; public int usage; public string local; public string remote; public string comment; public string provider; }\n  [DllImport(\"mpr.dll\", CharSet=CharSet.Unicode)]\n  public static extern int WNetAddConnection2(ref Resource resource, string password, string username, int flags);\n  [DllImport(\"mpr.dll\", CharSet=CharSet.Unicode)]\n  public static extern int WNetCancelConnection2(string name, int flags, bool force);\n}\n'@\n$cfg = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__CONFIG__')) | ConvertFrom-Json\n[Windows.Forms.Application]::EnableVisualStyles()\n$form = New-Object Windows.Forms.Form\n$form.Text = $cfg.title\n$form.Size = New-Object Drawing.Size(520, 430)\n$form.StartPosition = 'CenterScreen'\n$form.FormBorderStyle = 'FixedDialog'\n$form.MaximizeBox = $false\n$form.Font = New-Object Drawing.Font('Segoe UI', 10)\n$form.BackColor = [Drawing.Color]::FromArgb(245,246,251)\nfunction Label($text, $y) {\n  $label = New-Object Windows.Forms.Label\n  $label.Text = $text\n  $label.Location = New-Object Drawing.Point(24,$y)\n  $label.Size = New-Object Drawing.Size(462,27)\n  $form.Controls.Add($label)\n}\nLabel $cfg.path 24\nLabel ($cfg.accountLabel + ': ' + $cfg.account) 61\nLabel $cfg.passwordLabel 103\n$password = New-Object Windows.Forms.TextBox\n$password.UseSystemPasswordChar = $true\n$password.Location = New-Object Drawing.Point(24,134)\n$password.Size = New-Object Drawing.Size(462,30)\n$form.Controls.Add($password)\nLabel $cfg.driveLabel 183\n$drive = New-Object Windows.Forms.ComboBox\n$drive.DropDownStyle = 'DropDownList'\n$drive.Location = New-Object Drawing.Point(24,214)\n$drive.Size = New-Object Drawing.Size(120,30)\n$used = @([IO.DriveInfo]::GetDrives() | ForEach-Object { $_.Name.Substring(0,1) })\nforeach ($letter in 'ZYXWVUTSRQPONMLKJIHGFED'.ToCharArray()) {\n  if ($used -notcontains [string]$letter) { [void]$drive.Items.Add([string]$letter + ':') }\n}\nif ($drive.Items.Count -gt 0) { $drive.SelectedIndex = 0 }\nif ($drive.Items.Contains($cfg.drive + ':')) { $drive.SelectedItem = $cfg.drive + ':' }\n$form.Controls.Add($drive)\n$status = New-Object Windows.Forms.Label\n$status.Location = New-Object Drawing.Point(24,256)\n$status.Size = New-Object Drawing.Size(462,68)\n$status.Text = $cfg.intro\n$form.Controls.Add($status)\n$button = New-Object Windows.Forms.Button\n$button.Text = $cfg.connect\n$button.Location = New-Object Drawing.Point(24,332)\n$button.Size = New-Object Drawing.Size(462,38)\n$form.Controls.Add($button)\n$form.AcceptButton = $button\n$button.Add_Click({\n  if (!$password.Text) { $status.Text = $cfg.passwordMissing; $password.Focus(); return }\n  if (!$drive.SelectedItem) { $status.Text = $cfg.driveMissing; return }\n  $button.Enabled = $false\n  $status.Text = $cfg.checking\n  $form.Refresh()\n  $client = New-Object Net.Sockets.TcpClient\n  try {\n    $pending = $client.BeginConnect($cfg.host,445,$null,$null)\n    if (!$pending.AsyncWaitHandle.WaitOne(3000)) { throw 'timeout' }\n    $client.EndConnect($pending)\n  } catch { $status.Text = $cfg.unreachable; $button.Enabled = $true; return }\n  finally { $client.Dispose() }\n  $resource = New-Object NexusNetwork+Resource\n  $resource.type = 1\n  $resource.local = [string]$drive.SelectedItem\n  $resource.remote = $cfg.path\n  $result = [NexusNetwork]::WNetAddConnection2([ref]$resource,$password.Text,$cfg.account,1)\n  if ($result -eq 1219) {\n    $answer = [Windows.Forms.MessageBox]::Show($cfg.conflictQuestion,$cfg.title,'YesNo','Question')\n    if ($answer -eq 'Yes') {\n      $blocked = $false\n      $prefix = '\\\\' + $cfg.host + '\\'\n      $mappings = @(Get-SmbMapping -ErrorAction SilentlyContinue | Where-Object { $_.RemotePath.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) })\n      foreach ($mapping in $mappings) {\n        $target = if ($mapping.LocalPath) { $mapping.LocalPath } else { $mapping.RemotePath }\n        $cancel = [NexusNetwork]::WNetCancelConnection2($target,0,$false)\n        if ($cancel -ne 0 -and $cancel -ne 2250) { $blocked = $true }\n      }\n      [void][NexusNetwork]::WNetCancelConnection2(($prefix + 'IPC$'),0,$false)\n      if ($blocked) { $status.Text = $cfg.openFiles; $button.Enabled = $true; return }\n      & cmdkey.exe ('/delete:' + $cfg.host) | Out-Null\n      $result = [NexusNetwork]::WNetAddConnection2([ref]$resource,$password.Text,$cfg.account,1)\n    }\n  }\n  $password.Clear()\n  $button.Enabled = $true\n  if ($result -eq 0) {\n    $status.Text = $cfg.success\n    [void][Windows.Forms.MessageBox]::Show($cfg.success,$cfg.title,'OK','Information')\n    Start-Process explorer.exe -ArgumentList ($resource.local + '\\')\n    $form.Close()\n    return\n  }\n  if ($result -eq 58 -or $result -eq 1240) {\n    try {\n      $policy = Get-SmbClientConfiguration -ErrorAction Stop\n      if ($policy.BlockNTLM) { $status.Text = $cfg.ntlmBlocked; return }\n    } catch {}\n  }\n  $key = [string]$result\n  $reason = $cfg.errors.PSObject.Properties[$key]\n  if ($reason) { $status.Text = $reason.Value + ' (' + $result + ')' }\n  else { $status.Text = $cfg.failed + ' ' + $result + ': ' + (New-Object ComponentModel.Win32Exception($result)).Message }\n})\n$form.Add_Shown({ $password.Focus() })\n[void]$form.ShowDialog()\n".replace('__CONFIG__', config);
    let encoded = ''; for (let i = 0; i < script.length; i++) { const code = script.charCodeAt(i); encoded += String.fromCharCode(code & 255, code >> 8); }
    return "@echo off\r\nset \"NEXUS_HELPER=%~f0\"\r\nstart \"\" powershell.exe -NoLogo -NoProfile -STA -WindowStyle Hidden -EncodedCommand JABzAD0AWwBJAE8ALgBGAGkAbABlAF0AOgA6AFIAZQBhAGQAQQBsAGwAVABlAHgAdAAoACQAZQBuAHYAOgBOAEUAWABVAFMAXwBIAEUATABQAEUAUgApADsAJABtAD0AJwA6ADoATgBFAFgAVQBTAF8AUABBAFkATABPAEEARAA6ADoAJwA7ACQAcAA9ACQAcwAuAFMAdQBiAHMAdAByAGkAbgBnACgAJABzAC4ATABhAHMAdABJAG4AZABlAHgATwBmACgAJABtACkAKwAkAG0ALgBMAGUAbgBnAHQAaAApADsASQBuAHYAbwBrAGUALQBFAHgAcAByAGUAcwBzAGkAbwBuACAAKABbAFQAZQB4AHQALgBFAG4AYwBvAGQAaQBuAGcAXQA6ADoAVQBuAGkAYwBvAGQAZQAuAEcAZQB0AFMAdAByAGkAbgBnACgAWwBDAG8AbgB2AGUAcgB0AF0AOgA6AEYAcgBvAG0AQgBhAHMAZQA2ADQAUwB0AHIAaQBuAGcAKAAkAHAALgBUAHIAaQBtACgAKQApACkAKQA=\r\nexit /b\r\n::NEXUS_PAYLOAD::\r\n" + btoa(encoded) + "\r\n";
  }
  function connectShare(share) {
    if (!share || !/^[a-z][a-z0-9_-]{2,19}$/.test(share.name)) return;
    const host = connectionHost(), unc = '\\\\' + host + '\\' + share.name, account = 'nx_' + me.name;
    const dialog = modal('<section class="console-form connection-guide"><div class="dialog-symbol">' + icon('link') + '</div><h2>' + L('Connecter un lecteur réseau') + '</h2><p>' + L('Vérifiez votre accès, puis ouvrez l’assistant sur Windows. Aucune commande à saisir.') + '</p><div class="connection-checks" role="status"></div><button class="secondary-button" data-check>' + L('Vérifier mon accès') + '</button><form class="console-form connection-repair"><h3>' + L('Réparer mon accès') + '</h3><p>' + L('Rétablit le compte SMB et son accès à ce partage avec votre mot de passe Nexus.') + '</p>' + field(L('Mot de passe Nexus'), 'password', 'password', 'required autocomplete="current-password"') + '<button type="submit" class="secondary-button">' + L('Réparer mon accès') + '</button><p role="alert"></p></form><label>' + L('Lettre du lecteur') + '<select data-drive>' + 'ZYXWVUTSRQPONMLKJIHGFED'.split('').map(letter => '<option value="' + letter + '">' + letter + ':</option>').join('') + '</select></label><button class="primary-button" data-download-command>' + L('Télécharger l’assistant Windows') + '</button><p>' + L('Ouvrez le fichier téléchargé : une fenêtre vous demande votre mot de passe Nexus et ajoute le lecteur dans Ce PC.') + '</p><details><summary>' + L('Connexion manuelle et autres systèmes') + '</summary><label>' + L('Chemin Windows') + '<input readonly data-unc value="' + E(unc) + '"></label><button class="secondary-button" data-copy-path>' + L('Copier le chemin') + '</button><p>' + L('Compte SMB') + ': <strong>' + E(account) + '</strong></p><p>Linux / macOS : <code>' + E('smb://' + host + '/' + share.name) + '</code></p><input readonly data-command><button class="secondary-button" data-copy-command>' + L('Copier la commande') + '</button></details></section>');
    const labels = { service: L('Service SMB'), configuration: L('Configuration SMB'), account: L('Compte SMB'), permission: L('Accès au partage'), volume: L('Volume connecté'), directory: L('Dossier du partage') };
    const output = dialog.querySelector('.connection-checks');
    function display(data) {
      output.innerHTML = '<strong>' + (data.ready ? L('Votre accès NAS est prêt') : L('Votre accès nécessite une réparation')) + '</strong>' + data.checks.map(check => '<p class="' + (check.ok ? 'success' : 'login-error') + '">' + icon(check.ok ? 'check' : 'clock') + E(labels[check.key] || check.key) + ' · ' + (check.ok ? 'OK' : L('À corriger')) + '</p>').join('');
    }
    const check = async () => { output.textContent = L('Vérification de la connexion…'); try { display(await api('/api/shares/check', { method: 'POST', body: { name: share.name } })); } catch (error) { output.textContent = error.message; } };
    buttons(dialog, '[data-check]', check); check();
    formSubmit(dialog.querySelector('form'), async values => {
      const result = await api('/api/shares/repair', { method: 'POST', body: { name: share.name, password: values.password } });
      dialog.querySelector('[name=password]').value = ''; display(result);
      notify(L('Accès SMB rétabli. Ouvrez maintenant l’assistant Windows.'));
    });
    const command = () => 'net use ' + dialog.querySelector('[data-drive]').value + ': "' + unc + '" * /user:"' + account + '" /persistent:yes';
    const update = () => { dialog.querySelector('[data-command]').value = command(); }; update(); dialog.querySelector('[data-drive]').onchange = update;
    const copy = async value => { await navigator.clipboard.writeText(value); notify(L('Adresse copiée')); };
    buttons(dialog, '[data-copy-path]', () => copy(unc)); buttons(dialog, '[data-copy-command]', () => copy(command()));
    dialog.querySelector('[data-download-command]').onclick = () => {
      const script = windowsHelper(host, share.name, account, dialog.querySelector('[data-drive]').value);
      const url = URL.createObjectURL(new Blob([script], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = 'nexus-' + share.name + '-windows.cmd'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }
  const fileUrl = (route, relative = folder) => `${route}?${new URLSearchParams({ share: selectedShare, path: relative })}`;
  let fileEntries = [];
  async function loadFiles() {
    const target = document.querySelector('#page-files'), body = target.querySelector('#file-rows'); if (!body) return;
    const path = target.querySelector('#file-path');
    if (!selectedShare) path.textContent = L("Aucun partage autorisé.");
    else {
      const parts = folder ? folder.split('/') : [];
      path.innerHTML = '<button type="button" class="breadcrumb-button" data-folder="">' + icon('folder') + E(selectedShare) + '</button>' + parts.map((part, i) => '<span class="path-separator">/</span><button type="button" class="breadcrumb-button" data-folder="' + E(parts.slice(0, i + 1).join('/')) + '">' + E(part) + '</button>').join('');
      buttons(path, '[data-folder]', async b => { await navigateFolder(b.dataset.folder); });
    }
    const writable = shares.find(s => s.name === selectedShare)?.writable;
    target.querySelector('#file-folder').disabled = !writable; target.querySelector('#file-upload').disabled = !writable;
    target.querySelector('#file-up').disabled = !folder;
    target.querySelector('#file-drop').setAttribute('aria-disabled', writable ? 'false' : 'true');
    if (!selectedShare) { fileEntries = []; body.innerHTML = '<tr><td colspan="4"><div class="empty-state">' + icon('folder') + L("<strong>Votre espace vous attend</strong><p>Créez un partage ou demandez un accès à votre administrateur.</p></div></td></tr>"); return; }
    fileEntries = await api(fileUrl('/api/files'));
    renderFileRows();
  }
  function renderFileRows() {
    const target = document.querySelector('#page-files'), body = target.querySelector('#file-rows'); if (!body) return;
    const writable = shares.find(s => s.name === selectedShare)?.writable;
    const query = target.querySelector('#file-search')?.value.toLocaleLowerCase('fr') || '';
    const entries = fileEntries.filter(f => f.name.toLocaleLowerCase('fr').includes(query));
    target.querySelector('#file-count').textContent = entries.length + (entries.length === 1 ? L(" élément") : L(" éléments"));
    body.innerHTML = entries.map(f => {
      const extension = f.name.includes('.') ? f.name.split('.').at(-1).toLowerCase() : '';
      const photo = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'avif', 'bmp', 'tif', 'tiff'].includes(extension);
      const glyph = f.directory ? 'folder' : photo ? 'image' : 'file';
      const type = f.directory ? L("Dossier") : photo ? 'Image' : extension ? extension.toUpperCase() : L("Fichier");
      const name = f.directory ? '<button class="file-name" data-open="' + E(f.name) + '">' + E(f.name) + '</button>' : '<strong class="file-name">' + E(f.name) + '</strong>';
      const symbol = !f.directory && photo ? '<button class="file-symbol is-image preview-button" data-preview="' + E(f.name) + '" aria-label="' + L('Aperçu de l’image') + ' ' + E(f.name) + '">' + icon(glyph) + '<img loading="lazy" decoding="async" alt="' + E(f.name) + '" src="' + E(fileUrl('/api/files/preview', join(f.name))) + '"></button>' : '<span class="file-symbol ' + (f.directory ? 'is-folder' : 'is-document') + '">' + icon(glyph) + '</span>';
      return '<tr' + (f.directory ? ' data-directory="' + E(f.name) + '"' : '') + '><td><div class="file-identity">' + symbol + '<div>' + name + '<small>' + E(type) + '</small></div></div></td><td class="file-size">' + (f.directory ? '—' : bytes(f.size)) + '</td><td class="file-date">' + E(new Date(f.modified).toLocaleString(NexusI18n.locale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td><td><div class="table-actions">' + (f.directory ? L("<button class=\"action-button\" aria-label=\"Ouvrir\" title=\"Ouvrir\" data-open=\"") + E(f.name) + '">' + icon('folder') + L("<span>Ouvrir</span></button>") : L("<a class=\"action-button action-download\" aria-label=\"Télécharger\" title=\"Télécharger\" href=\"") + E(fileUrl('/api/files/download', join(f.name))) + '">' + icon('download') + L("<span>Télécharger</span></a>")) + L("<button class=\"action-button\" aria-label=\"Renommer\" title=\"Renommer\" data-rename=\"") + E(f.name) + '" ' + (writable ? '' : 'disabled') + '>' + icon('edit') + L("<span>Renommer</span></button>") + L("<button class=\"action-button action-danger\" aria-label=\"Retirer\" title=\"Retirer\" data-trash=\"") + E(f.name) + '" ' + (writable ? '' : 'disabled') + '>' + icon('trash') + L("<span>Retirer</span></button></div></td></tr>");
    }).join('') || '<tr><td colspan="4"><div class="empty-state">' + icon(query ? 'search' : 'folder') + '<strong>' + (query ? L("Aucun résultat pour cette recherche") : L("Votre prochain fichier commence ici")) + '</strong><p>' + (query ? L("Essayez avec un autre nom.") : L("Déposez votre premier fichier pour remplir cet espace.")) + '</p></div></td></tr>';
    body.querySelectorAll('[data-preview] img').forEach(img => {
      const show = () => { if (img.naturalWidth) { img.parentElement.classList.add('is-loaded'); img.previousElementSibling.hidden = true; } };
      img.onload = show; img.onerror = () => img.remove(); if (img.complete && img.naturalWidth) show();
    });
    buttons(body, '[data-preview]', button => {
      const img = button.querySelector('img');
      if (!img || !button.classList.contains('is-loaded')) return notify(L('Aperçu indisponible'));
      modal('<figure class="image-viewer"><img src="' + E(img.src) + '" alt="' + E(button.dataset.preview) + '"><figcaption>' + E(button.dataset.preview) + '</figcaption></figure>');
    });
    buttons(body, '[data-open]', async b => { await navigateFolder(join(b.dataset.open)); });
    body.querySelectorAll('[data-directory]').forEach(row => { row.ondblclick = event => { if (!event.target.closest('button, a')) navigateFolder(join(row.dataset.directory)).catch(error => notify(error.message)); }; });
    buttons(body, '[data-trash]', async b => { if (!await confirmAction(L("Déplacer « ") + b.dataset.trash + L(" » dans la corbeille ?"))) return; await api(fileUrl('/api/files', join(b.dataset.trash)), { method: 'DELETE' }); await loadFiles(); });
    buttons(body, '[data-rename]', async b => { const name = await askInput(L("Nouveau nom"), b.dataset.rename); if (!name) return; await api(fileUrl('/api/files/move', join(b.dataset.rename)), { method: 'POST', body: { destination: join(name) } }); await loadFiles(); });
  }
  async function upload(files) {
    const progress = document.querySelector('#transfer-progress');
    if (!selectedShare || !shares.find(s => s.name === selectedShare)?.writable) return notify(L("Partage en lecture seule"));
    try {
      for (const file of files) await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open('PUT', fileUrl('/api/files/upload', join(file.name))); xhr.setRequestHeader('X-Nexus-Request', '1');
        xhr.upload.onprogress = e => { progress.textContent = `${file.name} : ${e.lengthComputable ? Math.round(e.loaded / e.total * 100) + ' %' : L("envoi…")}`; };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else { try { reject(new Error(JSON.parse(xhr.responseText).error)); } catch { reject(new Error(L("Transfert interrompu"))); } } };
        xhr.onerror = () => reject(new Error(L("Connexion interrompue"))); xhr.send(file);
      }); progress.textContent = L("Transfert terminé."); await loadFiles();
    } catch (e) { progress.textContent = e.message; notify(e.message); }
  }
  function renderSettings() {
    const target = document.querySelector('#page-settings');
    target.innerHTML = `${heading(L("Paramètres"), L("Identité du serveur, accès et mises à jour."))}${L("<div class=\"settings-grid\"><form class=\"panel console-form\" id=\"hostname-form\"><h2>Nom du serveur</h2>")}${field(L("Nom"), 'name', 'text', `required value="${E(snapshotData.hostname)}" pattern="[a-z][a-z0-9-]{0,62}"`)}${L("<button class=\"secondary-button\" type=\"submit\">Enregistrer</button><p role=\"alert\"></p></form><section class=\"panel\"><h2>Accès réseau local</h2><p>Interface : ")}${E(location.origin)}</p><p>SMB : <code>${E('\\\\' + connectionHost() + '\\nom-du-partage')}${L("</code></p><p>Nom SMB : <code>nx_")}${E(me.name)}${L("</code></p><p>Utilisez HTTPS ou un tunnel SSH sur un réseau non fiable.</p></section></div><section class=\"panel console-form\"><h2>Mises à jour GitHub</h2><p>Nexus ")}${E(snapshotData.version)}${L(" · Publications stables de Nariod68/Nexus-nas</p><div class=\"file-toolbar\"><button class=\"secondary-button\" id=\"updates-check\">Rechercher</button><button class=\"primary-button\" id=\"updates-install\" disabled>Installer la nouvelle version</button><button class=\"secondary-button\" id=\"updates-rollback\">Revenir à la version précédente</button></div><p id=\"live-update-status\" role=\"status\"></p></section><section class=\"panel\"><h2>Serveur</h2><button class=\"danger-button\" id=\"server-restart\">Redémarrer le serveur…</button></section>")}`;
    formSubmit(target.querySelector('#hostname-form'), async body => { await api('/api/hostname', { method: 'POST', body }); notify(L("Nom enregistré")); await refresh(true); });
    target.querySelector('#updates-check').onclick = async () => { const output = target.querySelector('#live-update-status'); try { const data = await api('/api/updates'); output.textContent = data.available ? `${L("Nouvelle version : ")}${data.version}` : `${L("Vous êtes à jour (")}${data.version}).`; target.querySelector('#updates-install').disabled = !data.available; } catch (e) { output.textContent = e.message; } };
    for (const [id, route, question] of [['updates-install', '/api/updates/install', L("Installer la dernière version ? L’interface sera temporairement indisponible.")], ['updates-rollback', '/api/updates/rollback', L("Restaurer la version précédente ?")]]) target.querySelector(`#${id}`).onclick = async () => { if (!await confirmAction(question)) return; try { await api(route, { method: 'POST', body: {} }); target.querySelector('#live-update-status').textContent = L("Mise à jour lancée. Attendez puis reconnectez-vous. Le suivi figure sur la vue d’ensemble."); } catch (e) { notify(e.message); } };
    target.querySelector('#server-restart').onclick = async () => { const confirmation = await askInput(L("Tapez REDÉMARRER pour confirmer")); if (!confirmation) return; try { await api('/api/restart', { method: 'POST', body: { confirmation: NexusI18n.language() === 'en' && confirmation === 'RESTART' ? 'REDÉMARRER' : confirmation } }); notify(L("Redémarrage dans quelques secondes.")); } catch (e) { notify(e.message); } };
  }
  const logout = document.createElement('button'); logout.className = 'secondary-button'; logout.textContent = L("Déconnexion");
  logout.onclick = async () => { try { await api('/api/logout', { method: 'POST', body: {} }); me = null; await loginScreen(); } catch (e) { notify(e.message); } };
  const passwordButton = document.createElement('button'); passwordButton.className = 'secondary-button'; passwordButton.textContent = L("Mon compte");
  passwordButton.onclick = () => {
    const dialog = modal(`${L("<form class=\"console-form\"><h2>Changer mon mot de passe</h2>")}${field(L("Mot de passe actuel"), 'current', 'password', 'required autocomplete="current-password"')}${field(L("Nouveau mot de passe Nexus et SMB"), 'password', 'password', 'required minlength="12" maxlength="256" autocomplete="new-password"')}${L("<button type=\"submit\" class=\"primary-button\">Enregistrer et me reconnecter</button><p role=\"alert\"></p></form>")}`);
    formSubmit(dialog.querySelector('form'), async body => { await api('/api/password', { method: 'POST', body }); dialog.close(); me = null; await loginScreen(); });
  };
  document.querySelector('.topbar-actions').append(passwordButton, logout);
  const authLanguage = document.createElement('select'); authLanguage.className = 'auth-language';
  authLanguage.setAttribute('aria-label', 'Language / Langue');
  authLanguage.innerHTML = '<option value="fr">Français</option><option value="en">English</option>';
  authLanguage.value = NexusI18n.language(); document.body.append(authLanguage);
  authLanguage.onchange = () => applyLanguage(authLanguage.value);
  const authVisibility = new MutationObserver(() => { authLanguage.hidden = !shell.hidden; });
  authVisibility.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('nexus-languagechange', () => {
    authLanguage.value = NexusI18n.language();
    logout.textContent = L('Déconnexion'); passwordButton.textContent = L('Mon compte');
    status.textContent = NexusI18n.message(status.textContent);
    if (shell.hidden) {
      const values = [...gate.querySelectorAll('input[name], select[name], textarea[name]')].map(input => [input.name, input.value]);
      if (gateMode === 'wizard') showWizard();
      else if (gateMode === 'recovery') recoveryScreen(NexusI18n.message(recoveryMessage));
      else loginScreen(setupScreen);
      for (const [name, value] of values) { const input = [...gate.querySelectorAll('[name]')].find(input => input.name === name); if (input) input.value = value; }
      return;
    }
    if (!me) return;
    document.querySelector('.profile-copy small').textContent = L(me.role === 'admin' ? 'Administrateur' : 'Utilisateur');
    document.querySelector('.demo-tag').textContent = L('CONNECTÉ');
    if (me.role === 'admin') {
      document.querySelector('#page-dashboard').innerHTML = ''; renderDashboard(); renderJobs();
      if (info) { renderStorage(); renderShares(); } renderUsers(); renderSettings();
    }
    const search = document.querySelector('#file-search')?.value || '';
    renderFiles(); document.querySelector('#file-search').value = search;
    loadFiles().catch(error => notify(error.message));
  });
  function decorate(scope) {
    const candidates = [...(scope.matches?.('button') ? [scope] : []), ...scope.querySelectorAll('button')];
    for (const button of candidates) {
      if (button.querySelector('svg') || button.classList.contains('dialog-close') || button.classList.contains('nav-item')) continue;
      const label = button.textContent.trim();
      const name = /Créer|Ajouter|Nouveau|Create|Add|New/i.test(label) ? 'plus' : /Actualiser|Réessayer|Restaurer|Revenir|Refresh|Try again|Restore|Roll back/i.test(label) ? 'refresh' : /Rechercher|Check/i.test(label) ? 'search' : /Corbeille|Retirer|Désactiver|Trash|Remove|Disable/i.test(label) ? 'trash' : /Modifier|Renommer|compte|Edit|Rename|account/i.test(label) ? 'edit' : /Enregistrer|Terminer|connecter|Save|Finish|Sign in|Connect/i.test(label) ? 'check' : /Installer|Install|Download/i.test(label) ? 'download' : /Redémarrer|fonctionnement|Restart|Uptime/i.test(label) ? 'clock' : /Partitionner|disque|Partition|disk/i.test(label) ? 'disk' : /Dossier parent|Parent folder/i.test(label) ? 'arrow' : null;
      if (name) button.insertAdjacentHTML('afterbegin', icon(name));
    }
  }
  const decorations = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) decorate(node); });
  decorations.observe(document.body, { childList: true, subtree: true });
  decorate(document.body);
  document.querySelector('.help-button').addEventListener('click', e => { e.stopImmediatePropagation(); notify(L("Créez vos comptes, puis vos partages. La rubrique Fichiers permet les transferts. Le compte SMB porte le préfixe nx_.")); }, true);
  document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { if (me && b.dataset.page === 'files') loadFiles().catch(e => notify(e.message)); }));
  document.querySelector('.brand').addEventListener('click', event => { if (me?.role === 'user') { event.preventDefault(); event.stopImmediatePropagation(); showPage('files'); loadFiles().catch(e => notify(e.message)); } }, true);
  setInterval(() => { if (me && !shell.hidden && !document.hidden) refresh(); }, 10000);
  (async () => { try { const setup = await api('/api/setup'); if (!setup.configured) await loginScreen(true); else { try { await connected(); } catch { await loginScreen(); } } } catch (e) { gate.innerHTML = `${L("<div class=\"panel login-panel\"><h1>Service Nexus indisponible</h1><p>")}${E(e.message)}${L("</p><p>Lancez le service Nexus pour utiliser cette interface.</p></div>")}`; } })();
}
