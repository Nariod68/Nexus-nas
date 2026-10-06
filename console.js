if (location.protocol !== 'file:') {
  const shell = document.querySelector('.app-shell'); shell.hidden = true;
  const gate = document.createElement('section'); gate.className = 'login-screen'; document.body.append(gate);
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const bytes = n => {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    const units = ['o', 'Ko', 'Mo', 'Gio', 'Tio'];
    const index = n > 0 ? Math.min(4, Math.floor(Math.log(n) / Math.log(1024))) : 0;
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: index ? 1 : 0 }).format(n / 1024 ** index)} ${units[index]}`;
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
    return `${days ? days + ' j ' : ''}${hours} h ${String(minutes).padStart(2, '0')} min ${String(secs).padStart(2, '0')} s`;
  };
  function tickUptime() {
    const node = document.querySelector('#uptime-value');
    if (node && uptimeAnchor) node.textContent = uptime(uptimeAnchor.seconds + (performance.now() - uptimeAnchor.at) / 1000);
  }
  setInterval(tickUptime, 1000);
  let me, info, shares = [], users = [], folder = '', selectedShare = '', snapshotData, refreshBusy = false;
  let wizard = false;
  let sharesReady = false;
  const initialPages = new Map([...document.querySelectorAll('.page-view')].map(view => [view, view.innerHTML]));
  const emptySystem = version => ({ version, hostname: null, system: null, architecture: null, uptimeSeconds: null, cpuPercent: null, memory: { total: null, available: null }, network: [], storage: null, diagnostics: [] });
  const status = document.createElement('p'); status.className = 'console-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); document.querySelector('.page-container').prepend(status);
  function notify(message) { status.textContent = message; showNotice(message); }
  async function api(url, { method = 'GET', body, raw, timeout = 15000 } = {}) {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'X-Nexus-Request': '1', ...(raw ? {} : { 'Content-Type': 'application/json' }) }, body: raw || (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(timeout) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401 && !url.includes('login')) { me = null; shell.hidden = true; await loginScreen(); } throw new Error(data.error || `HTTP ${response.status}`); }
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
    me = null; info = null; shares = []; users = []; snapshotData = null; sharesReady = false; wizard = false;
    uptimeAnchor = null;
    fileEntries = [];
    for (const [view, html] of initialPages) view.innerHTML = html;
    status.textContent = '';
    gate.hidden = false; shell.hidden = true;
    gate.innerHTML = `<form class="panel login-panel"><img src="nexus-icon.svg" alt="Nexus" width="64" height="64"><h1>${setup ? 'Installer votre NAS' : 'Bienvenue sur Nexus'}</h1><p>${setup ? 'Entrez le code affiché à la fin de l’installation, puis créez votre compte administrateur.' : 'Connectez-vous avec votre compte Nexus.'}</p>${setup ? field('Code d’installation', 'token', 'password', 'required autocomplete="off"') : ''}${field('Nom d’utilisateur', 'name', 'text', 'required pattern="[a-z][a-z0-9_-]{2,19}" autocomplete="username"')}${field('Mot de passe', 'password', 'password', `required minlength="12" maxlength="256" autocomplete="${setup ? 'new-password' : 'current-password'}"`)}${setup ? field('Nom du serveur', 'hostname', 'text', 'required value="nexus-nas" pattern="[a-z][a-z0-9-]{0,62}"') : ''}<button class="primary-button" type="submit">${setup ? 'Créer mon serveur' : 'Se connecter'}</button><p class="login-error" role="alert"></p></form>`;
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
    document.querySelector('.profile-copy small').textContent = me.role === 'admin' ? 'Administrateur' : 'Utilisateur';
    document.querySelector('.demo-tag').textContent = 'CONNECTÉ';
    document.querySelectorAll('[data-page]').forEach(b => { b.hidden = me.role !== 'admin' && b.dataset.page !== 'files'; });
    try {
      if (me.role === 'admin' && !identity.onboarding) {
        info = await api('/api/agent');
        if (!Array.isArray(info.volumes)) throw new Error('Le service Linux n’a pas retourné la liste des volumes');
        wizard = true; showWizard(); return;
      }
      await refresh(true, true);
      if (!me) return;
      gate.hidden = true; shell.hidden = false;
      showPage(me.role === 'admin' ? (pageNames.fr[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard') : 'files');
    } catch (error) { if (me) recoveryScreen(error.message); }
  }
  function recoveryScreen(message) {
    gate.hidden = false; shell.hidden = true;
    gate.innerHTML = `<section class="panel login-panel"><img src="nexus-icon.svg" alt="" width="64"><h1>Compte connecté</h1><p>Votre compte est enregistré. Le serveur ne peut pas encore charger la configuration.</p><p class="login-error" role="alert">${E(message)}</p><button class="primary-button" id="setup-retry">Réessayer</button><button class="secondary-button" id="setup-signout">Déconnexion</button><p>Si le problème persiste, consultez les journaux du service Nexus et de Nexus Agent.</p></section>`;
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
        if (systemResult.status === 'rejected') snapshotData.diagnostics = ['Mesures système indisponibles : ' + systemResult.reason.message];
        renderDashboard();
        renderJobs();
        if (full) {
          if (info) renderStorage(); else unavailablePage('storage', 'Stockage', agentResult.reason.message);
          if (shareResult.status === 'fulfilled' && info && userResult.status === 'fulfilled') renderShares(); else unavailablePage('shares', 'Partages réseau', 'La configuration des partages ne peut pas être chargée.');
          if (userResult.status === 'fulfilled') renderUsers(); else unavailablePage('users', 'Utilisateurs', userResult.reason.message);
          renderSettings();
        }
      }
      if (full) {
        if (shareResult.status === 'fulfilled') { renderFiles(); await loadFiles(); }
        else unavailablePage('files', 'Fichiers', shareResult.reason.message);
      }
      status.textContent = [...new Set([...issues, ...(snapshotData?.diagnostics || [])])].join(' ? ');
    } catch (e) { if (strict) throw e; notify(`Connexion interrompue : ${e.message}`); }
    finally { refreshBusy = false; }
  }
  function unavailablePage(page, title, message) {
    const target = document.querySelector(`#page-${page}`);
    target.innerHTML = `${heading(title, 'Service temporairement indisponible')}<section class="panel"><p role="alert">${E(message)}</p><button class="secondary-button">Réessayer</button></section>`;
    target.querySelector('button').onclick = () => refresh(true);
  }
  function chartMarkup(key, title, subtitle) {
    return '<section class="chart-card panel" data-chart="' + key + '"><div class="chart-heading"><div><span class="chart-kicker">' + (key === 'cpu' ? 'PROCESSEUR' : 'MÉMOIRE VIVE') + '</span><h3>' + title + '</h3><p>' + subtitle + '</p></div><div class="chart-current" id="chart-value-' + key + '">—</div></div><div class="chart-plot"><svg viewBox="0 0 720 190" preserveAspectRatio="none" role="img" aria-label="Historique réel de ' + title + '"><defs><linearGradient id="chart-gradient-' + key + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".24"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' + [22, 61, 100, 139, 178].map(y => '<path class="chart-grid-line" d="M32 ' + y + ' H712"/>').join('') + '<text class="chart-axis" x="0" y="26">100</text><text class="chart-axis" x="7" y="104">50</text><text class="chart-axis" x="14" y="180">0</text><path class="chart-area" fill="url(#chart-gradient-' + key + ')"/><path class="chart-line"/><circle class="chart-end" r="4" hidden/></svg><span class="chart-crosshair" hidden></span><div class="chart-tooltip" hidden></div></div><div class="chart-time-axis"><span>−10 min</span><span>−5 min</span><span>Maintenant</span></div><p class="chart-note">En attente de la première mesure…</p></section>';
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
    chart.querySelector('.chart-note').textContent = points.length ? (points.length === 1 ? 'Première mesure reçue. La courbe se construit toutes les 10 secondes.' : points.length + ' mesures réelles · actualisation toutes les 10 secondes') : 'Les mesures sont temporairement indisponibles.';
    const plot = chart.querySelector('.chart-plot'), tip = chart.querySelector('.chart-tooltip'), cross = chart.querySelector('.chart-crosshair');
    const inspect = event => {
      const rect = plot.getBoundingClientRect(), x = Math.max(32, Math.min(712, (event.clientX - rect.left) / rect.width * 720));
      const targetTime = from + (x - 32) / 680 * 600000;
      const valid = points.filter(p => p.value != null && Number.isFinite(p.value));
      if (!valid.length) return;
      const nearest = valid.reduce((a, b) => Math.abs(a.time - targetTime) < Math.abs(b.time - targetTime) ? a : b);
      const position = (32 + 680 * (nearest.time - from) / 600000) / 720 * 100;
      tip.textContent = new Date(nearest.time).toLocaleTimeString('fr-FR') + ' · ' + nearest.value + ' %';
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
    document.querySelector('.server-card small').textContent = (d.system || 'Service Linux') + ' · v' + (d.version || '—');
    if (!target.querySelector('#dashboard-live')) {
      target.innerHTML = '<div id="dashboard-live"><div class="dashboard-heading"><div><p class="eyebrow">VOTRE ESPACE, EN TOUTE SÉRÉNITÉ</p><h1>Bonjour, <span id="dashboard-name"></span><span class="greeting-dot">.</span></h1><p class="page-subtitle">Vos données à portée de main. Votre serveur sous contrôle.</p></div><div class="live-badge"><span></span>Connecté au NAS</div></div><div class="metric-grid">' + [['cpu', 'Processeur', 'Charge actuelle', 'cpu'], ['memory', 'Mémoire', 'Mémoire utilisée', 'memory'], ['shares', 'Partages', 'Vos espaces accessibles', 'folder'], ['uptime', 'Durée de fonctionnement', 'Depuis le dernier démarrage', 'clock']].map(([key, title, caption, glyph]) => '<article class="metric-card metric-' + key + '"><div class="metric-heading"><span>' + title + '</span>' + icon(glyph, 'metric-symbol') + '</div><div class="metric-value" id="' + key + '-value">—</div><div class="metric-foot"><span class="metric-caption">' + caption + '</span>' + (key === 'cpu' || key === 'memory' ? '<div class="metric-meter"><span id="meter-' + key + '"></span></div>' : '<span class="metric-tiny-dot"></span>') + '</div></article>').join('') + '</div><div class="section-heading activity-heading"><div><h2>Le rythme de votre serveur</h2><p>Les dix dernières minutes, mesurées en direct.</p></div><span class="collection-badge"><span></span>Une mesure / 10 s</span></div><div class="charts-grid">' + chartMarkup('cpu', 'Activité du processeur', 'Une vue précise de la charge du serveur.') + chartMarkup('memory', 'Utilisation de la mémoire', 'Gardez un œil sur les ressources disponibles.') + '</div><div class="dashboard-details"><section class="panel access-panel"><div class="panel-title"><span class="panel-symbol">' + icon('link') + '</span><div><h2>Un serveur, tous vos appareils</h2><p>Retrouvez vos données où vous en avez besoin.</p></div></div><div id="server-access"></div></section><section class="panel capacity-panel"><div class="panel-title"><span class="panel-symbol">' + icon('disk') + '</span><div><h2>De la place pour l’essentiel</h2><p>Votre espace de stockage actuel.</p></div></div><div class="capacity-content"><div class="usage-ring" id="storage-ring"><div><strong id="storage-percent">—</strong><span>utilisé</span></div></div><div class="capacity-numbers"><span>ESPACE DISPONIBLE</span><strong id="storage-available">—</strong><p id="storage-description"></p><div class="capacity-legend"><span><i></i>Utilisé</span><span><i></i>Disponible</span></div></div></div><div class="capacity-footer"><span id="storage-location"></span><button class="text-link" id="live-refresh">Actualiser</button></div></section></div><section class="panel jobs-panel" id="jobs"></section><footer class="dashboard-footer"><span>Nexus · votre cloud personnel</span><span id="server-version"></span></footer></div>';
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
    target.querySelector('#storage-description').textContent = 'sur ' + bytes(d.storage?.total) + ' de capacité';
    target.querySelector('#storage-location').textContent = d.storage?.path || 'Volume indisponible';
    target.querySelector('#server-version').textContent = 'Nexus ' + (d.version || '—') + ' · ' + (d.architecture || '—');
    const access = target.querySelector('#server-access');
    const accessData = [{ label: 'Depuis votre navigateur', value: location.origin, glyph: 'link' }, { label: 'Explorateur Windows', value: '\\\\' + host, glyph: 'folder' }, { label: 'Linux & macOS', value: 'smb://' + host, glyph: 'disk' }];
    const signature = JSON.stringify(accessData) + me.name;
    if (access.dataset.signature !== signature) {
      access.dataset.signature = signature;
      access.innerHTML = accessData.map(a => '<div class="access-row">' + icon(a.glyph) + '<div><span>' + a.label + '</span><strong>' + E(a.value) + '</strong></div><button class="copy-button" type="button" aria-label="Copier ' + a.label + '" data-copy="' + E(a.value) + '">' + icon('copy') + '</button></div>').join('') + '<p class="access-account">' + icon('users') + ' Compte SMB <strong>nx_' + E(me.name) + '</strong></p>';
      buttons(access, '[data-copy]', async b => { await navigator.clipboard.writeText(b.dataset.copy); notify('Adresse copiée'); });
    }
  }
  function renderJobs() {
    const target = document.querySelector('#jobs'); if (!target || !info) return;
    const jobs = [...info.jobs.slice(-5), ...(info.update ? [{ kind: 'Mise à jour', ...info.update }] : [])];
    const signature = JSON.stringify(jobs);
    if (target.dataset.signature === signature) return;
    target.dataset.signature = signature;
    const labels = { success: 'Terminé', running: 'En cours', failed: 'Échec' };
    target.innerHTML = '<div class="panel-title">' + icon('clock', 'panel-symbol') + '<div><h2>La vie de votre NAS</h2><p>Vos dernières opérations, en un coup d’œil.</p></div><span class="section-count">' + jobs.length + '</span></div>' + (jobs.length ? '<div class="job-list">' + jobs.map(j => '<div class="job-row job-' + E(j.status) + '"><span class="job-symbol">' + icon(j.status === 'success' ? 'check' : j.status === 'running' ? 'refresh' : 'clock') + '</span><div><strong>' + E(j.kind === 'partition' ? 'Préparation du disque' : j.kind || 'Mise à jour') + '</strong><p>' + E(j.message) + '</p></div><span class="status-badge">' + E(labels[j.status] || j.status) + '</span></div>').join('') + '</div>' : '<div class="empty-activity">' + icon('check') + '<p>Tout est calme. Vos prochaines opérations apparaîtront ici.</p></div>');
  }
  function showWizard() {
    shell.hidden = true; gate.hidden = false;
    if (!info || !Array.isArray(info.volumes)) { recoveryScreen('Les volumes sont indisponibles. Réessayez lorsque le service Linux est prêt.'); return; }
    gate.innerHTML = `<form class="panel login-panel"><img src="nexus-icon.svg" alt="" width="64"><p class="eyebrow">CONFIGURATION · STOCKAGE ET ACCÈS</p><h1>Votre premier partage</h1><p>Vous pouvez conserver les disques actuels ou préparer un disque vide. Les fichiers seront accessibles dans le navigateur et par SMB.</p>${(info.diagnostics || []).map(d => `<p class="login-error">${E(d)}</p>`).join('')}<button type="button" class="secondary-button" id="wizard-disk">Préparer un disque…</button><label>Volume<select name="volume">${info.volumes.map(v => `<option value="${E(v.id)}">${E(v.name)}</option>`).join('')}</select></label>${field('Nom du partage', 'name', 'text', 'required value="documents" pattern="[a-z][a-z0-9_-]{2,19}"')}<button type="submit" class="primary-button">Créer le partage et terminer</button><button type="button" class="text-link" id="wizard-skip">Terminer sans partage</button><p class="login-error" role="alert"></p></form>`;
    const finish = async () => { await api('/api/onboarding', { method: 'POST', body: {} }); wizard = false; gate.hidden = true; shell.hidden = false; await refresh(true); showPage('files'); };
    formSubmit(gate.querySelector('form'), async data => { await api('/api/shares/save', { method: 'POST', body: { ...data, members: [{ name: me.name, write: true }] } }); await finish(); });
    gate.querySelector('#wizard-skip').onclick = () => finish().catch(e => notify(e.message));
    gate.querySelector('#wizard-disk').onclick = () => diskDialog();
  }
  function renderStorage() {
    const target = document.querySelector('#page-storage');
    target.innerHTML = `${heading('Stockage', 'Partitionnez un disque inutilisé en volumes ext4, montés automatiquement au démarrage.')}<section class="panel"><h2>Volumes disponibles</h2>${info.volumes.map(v => `<p><strong>${E(v.name)}</strong> · ${E(v.path)}</p>`).join('')}</section><section class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>DISQUE</th><th>CAPACITÉ</th><th>ÉTAT</th><th>ACTION</th></tr></thead><tbody>${info.disks.map(d => `<tr><td><strong>${E(d.name)}</strong><small>${E(d.model)} · ${E(d.serial)}</small></td><td>${bytes(d.size)}</td><td>${E(d.reason || 'Disponible pour partitionnement')}</td><td><button class="secondary-button" data-disk="${E(d.name)}" ${d.canPartition ? '' : 'disabled'}>Partitionner…</button></td></tr>`).join('') || '<tr><td colspan="4">Aucun disque détecté.</td></tr>'}</tbody></table></div></section><p class="page-subtitle">Le partitionnement efface le disque entier. Les disques montés, système, swap, RAID, LVM et chiffrés sont protégés.</p>`;
    buttons(target, '[data-disk]', b => diskDialog(b.dataset.disk));
  }
  function modal(content) {
    const dialog = document.createElement('dialog'); dialog.className = 'nexus-dialog'; dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="Fermer">×</button>${content}`; document.body.append(dialog);
    dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal(); return dialog;
  }
  function askInput(message, initial = '') {
    return new Promise(resolve => {
      const dialog = modal(`<form class="console-form"><div class="dialog-symbol">${icon('edit')}</div><h2>${E(message)}</h2>${field('Votre saisie', 'value', 'text', `required value="${E(initial)}" autocomplete="off"`)}<div class="dialog-actions"><button type="button" class="secondary-button" data-cancel>Annuler</button><button type="submit" class="primary-button">Continuer</button></div><p role="alert"></p></form>`);
      dialog.addEventListener('close', () => resolve(null)); dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
      formSubmit(dialog.querySelector('form'), async values => { resolve(values.value); dialog.close(); });
      dialog.querySelector('input').focus();
    });
  }
  function confirmAction(message) {
    return new Promise(resolve => {
      const dialog = modal(`<div class="console-form"><div class="dialog-symbol">${icon('check')}</div><h2>Confirmer l’action</h2><p class="dialog-description">${E(message)}</p><div class="dialog-actions"><button class="secondary-button" data-cancel>Annuler</button><button class="primary-button" data-confirm>Confirmer</button></div></div>`);
      dialog.addEventListener('close', () => resolve(false)); dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
      dialog.querySelector('[data-confirm]').onclick = () => { resolve(true); dialog.close(); };
    });
  }
  async function diskDialog(selected) {
    info = await api('/api/agent');
    const available = info.disks.filter(d => d.canPartition);
    if (!available.length) {
      modal(`<section class="console-form"><h2>Préparer un disque</h2><div class="disk-unavailable" role="status"><strong>Aucun disque disponible pour le partitionnement</strong><p>Le disque système et les disques actuellement utilisés sont protégés. Vous pouvez continuer avec le stockage système ou ajouter un disque inutilisé au serveur.</p></div>${info.disks.length ? `<div class="disk-detection-list">${info.disks.map(d => `<p><strong>${E(d.name)}</strong><br><span>${E(d.reason || 'Disque indisponible')}</span></p>`).join('')}</div>` : ''}${(info.diagnostics || []).map(d => `<p role="alert">${E(d)}</p>`).join('')}</section>`);
      return;
    }
    const dialog = modal(`<form class="console-form"><h2>Préparer un disque</h2><p class="destructive-warning">Cette opération détruit toutes les partitions et tous les fichiers du disque choisi.</p><label>Disque<select name="device" required>${available.map(d => `<option value="${E(d.name)}" ${d.name === selected ? 'selected' : ''}>${E(d.name)} · ${bytes(d.size)} · ${E(d.model)}</option>`).join('')}</select></label><label>Partitions (une par ligne : label, taille en Gio ; * pour l’espace restant)<textarea name="partitions" required rows="4">donnees,*</textarea></label><button type="submit" class="primary-button" ${available.length ? '' : 'disabled'}>Préparer le plan</button><p role="alert"></p></form>`);
    formSubmit(dialog.querySelector('form'), async values => {
      const partitions = values.partitions.split('\n').filter(Boolean).map(line => { const [label, size] = line.split(',').map(p => p.trim()); return { label, sizeGiB: size === '*' ? null : Number(size) }; });
      const plan = await api('/api/disks/plan', { method: 'POST', body: { device: values.device, partitions } });
      const form = dialog.querySelector('form');
      form.innerHTML = `<h2>Confirmer l’effacement de ${E(plan.device)}</h2><p class="destructive-warning">${E(plan.warning)}</p><p>${plan.partitions.map(p => `${E(p.label)} : ${p.sizeGiB === null ? 'espace restant' : `${p.sizeGiB} Gio`}`).join('<br>')}</p><p>Saisissez exactement : <strong>${E(plan.confirmation)}</strong></p>${field('Confirmation', 'confirmation', 'text', 'required autocomplete="off"')}<button type="submit" class="danger-button">Effacer et créer les volumes</button><p role="alert"></p>`;
      // Replace the form to remove its previous submission handler.
      const next = form.cloneNode(true); form.replaceWith(next);
      formSubmit(next, async value => {
        const job = await api('/api/disks/execute', { method: 'POST', body: { token: plan.token, confirmation: value.confirmation } });
        next.innerHTML = '<h2>Préparation en cours</h2><p role="status">Le serveur prépare votre disque. Ne débranchez pas le disque.</p>';
        await watchJob(job.id, next.querySelector('p'));
        await refresh(true); dialog.close(); if (wizard) showWizard();
      });
    });
  }
  async function watchJob(id, output) {
    while (document.contains(output)) {
      await new Promise(r => setTimeout(r, 1500)); const data = await api('/api/agent'); const job = data.jobs.find(j => j.id === id);
      if (!job) throw new Error('Opération introuvable'); output.textContent = job.message;
      if (job.status !== 'running') { if (job.status === 'failed') throw new Error(job.message); return; }
    }
  }
  function renderShares() {
    const target = document.querySelector('#page-shares');
    target.innerHTML = `${heading('Partages réseau', 'Les dossiers accessibles depuis le navigateur et vos appareils SMB.')}<button class="primary-button" id="new-share">Créer un partage</button><section class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>NOM</th><th>DOSSIER</th><th>ACCÈS</th><th>ACTIONS</th></tr></thead><tbody>${shares.map(s => `<tr><td>${E(s.name)}</td><td>${E(s.path)}</td><td>${s.members.map(m => `${E(m.name)} (${m.write ? 'lecture / écriture' : 'lecture'})`).join(', ')}</td><td><button class="secondary-button" data-edit-share="${E(s.name)}">Modifier</button> <button class="danger-button" data-remove-share="${E(s.name)}">Retirer</button></td></tr>`).join('') || '<tr><td colspan="4">Créez votre premier partage.</td></tr>'}</tbody></table></div></section>`;
    target.querySelector('#new-share').onclick = () => shareDialog();
    buttons(target, '[data-edit-share]', b => shareDialog(shares.find(s => s.name === b.dataset.editShare)));
    buttons(target, '[data-remove-share]', async b => { if (!await confirmAction('Retirer cet accès réseau ? Les fichiers seront conservés sur le disque.')) return; await api('/api/shares/remove', { method: 'POST', body: { name: b.dataset.removeShare } }); await refresh(true); });
  }
  function shareDialog(share) {
    const dialog = modal(`<form class="console-form"><h2>${share ? 'Modifier' : 'Créer'} un partage</h2>${field('Nom', 'name', 'text', `required value="${E(share?.name || '')}" pattern="[a-z][a-z0-9_-]{2,19}" ${share ? 'readonly' : ''}`)}<label>Volume<select name="volume">${info.volumes.map(v => `<option value="${E(v.id)}" ${share?.volume === v.id ? 'selected' : ''}>${E(v.name)}</option>`).join('')}</select></label><fieldset><legend>Utilisateurs autorisés</legend>${users.filter(u => u.enabled).map(u => `<label class="member-row"><input type="checkbox" name="member-${E(u.name)}" ${(share?.members.some(m => m.name === u.name) || (!share && u.name === me.name)) ? 'checked' : ''}>${E(u.name)}<select name="access-${E(u.name)}"><option value="write">Lecture / écriture</option><option value="read" ${share?.members.some(m => m.name === u.name && !m.write) ? 'selected' : ''}>Lecture seule</option></select></label>`).join('')}</fieldset><button class="primary-button" type="submit">Enregistrer</button><p role="alert"></p></form>`);
    formSubmit(dialog.querySelector('form'), async values => { const members = users.filter(u => values[`member-${u.name}`]).map(u => ({ name: u.name, write: values[`access-${u.name}`] === 'write' })); await api('/api/shares/save', { method: 'POST', body: { name: values.name, volume: values.volume, members } }); dialog.close(); await refresh(true); });
  }
  function renderUsers() {
    const target = document.querySelector('#page-users');
    target.innerHTML = `${heading('Utilisateurs', 'Comptes Nexus et SMB. Les connexions SSH ne sont pas autorisées pour ces comptes.')}<button class="primary-button" id="new-user">Ajouter un utilisateur</button><section class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>COMPTE</th><th>RÔLE</th><th>ÉTAT</th><th>ACTION</th></tr></thead><tbody>${users.map(u => `<tr><td>${E(u.name)}<small>SMB : nx_${E(u.name)}</small></td><td>${E(u.role)}</td><td>${u.enabled ? 'Actif' : 'Désactivé'}</td><td><button class="danger-button" data-disable="${E(u.name)}" ${u.name === me.name || !u.enabled ? 'disabled' : ''}>Désactiver</button></td></tr>`).join('')}</tbody></table></div></section>`;
    target.querySelector('#new-user').onclick = () => {
      const dialog = modal(`<form class="console-form"><h2>Ajouter un compte</h2>${field('Nom', 'name', 'text', 'required pattern="[a-z][a-z0-9_-]{2,19}"')}${field('Mot de passe', 'password', 'password', 'required minlength="12" maxlength="256" autocomplete="new-password"')}<label>Rôle<select name="role"><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></label><button type="submit" class="primary-button">Créer le compte</button><p role="alert"></p></form>`);
      formSubmit(dialog.querySelector('form'), async body => { await api('/api/users', { method: 'POST', body }); dialog.close(); await refresh(true); });
    };
    buttons(target, '[data-disable]', async b => { if (!await confirmAction(`Désactiver les accès web et SMB de ${b.dataset.disable} ?`)) return; await api('/api/users/disable', { method: 'POST', body: { name: b.dataset.disable } }); await refresh(true); });
    for (const user of users) {
      const cell = target.querySelector(`[data-disable="${user.name}"]`).parentElement;
      const edit = document.createElement('button'); edit.className = 'secondary-button'; edit.textContent = 'Modifier'; cell.prepend(edit);
      edit.onclick = () => {
        const dialog = modal(`<form class="console-form"><h2>Compte ${E(user.name)}</h2>${field('Nouveau mot de passe (facultatif)', 'password', 'password', 'minlength="12" maxlength="256" autocomplete="new-password"')}<label>Rôle<select name="role"><option value="user" ${user.role === 'user' ? 'selected' : ''}>Utilisateur</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrateur</option></select></label><label>État<select name="enabled"><option value="yes" ${user.enabled ? 'selected' : ''}>Actif</option><option value="no" ${user.enabled ? '' : 'selected'}>Désactivé</option></select></label><button type="submit" class="primary-button">Enregistrer</button><p role="alert"></p></form>`);
        formSubmit(dialog.querySelector('form'), async values => { await api('/api/users/update', { method: 'POST', body: { ...values, name: user.name, enabled: values.enabled === 'yes' } }); dialog.close(); if (user.name === me.name) { me = null; await loginScreen(); } else await refresh(true); });
      };
    }
  }
  function renderFiles() {
    if (!shares.some(s => s.name === selectedShare)) { selectedShare = shares[0]?.name || ''; folder = ''; }
    const target = document.querySelector('#page-files');
    target.innerHTML = heading('Fichiers', 'Un espace pour vos documents, vos photos et tout ce qui compte.') + '<section class="panel file-workspace"><div class="file-toolbar"><label class="share-picker">Votre espace<select id="file-share">' + shares.map(s => '<option value="' + E(s.name) + '" ' + (s.name === selectedShare ? 'selected' : '') + '>' + E(s.name) + (s.writable ? '' : ' (lecture seule)') + '</option>').join('') + '</select></label><div class="file-toolbar-actions"><button class="secondary-button" id="file-up">Dossier parent</button><button class="secondary-button" id="file-folder">Nouveau dossier</button><label class="primary-button file-upload-label">' + icon('upload') + 'Déposer des fichiers<input type="file" id="file-upload" multiple></label></div></div><div class="file-drop" id="file-drop" role="button" tabindex="0" aria-label="Choisir des fichiers à déposer"><span class="drop-orbit">' + icon('upload') + '</span><div><strong>Faites de la place à vos fichiers.</strong><p>Glissez-les ici, ou cliquez pour les déposer. Ils restent chez vous.</p></div><span class="drop-tag">Votre cloud privé</span></div><p id="transfer-progress" role="status"></p><div class="file-list-heading"><nav id="file-path" aria-label="Chemin du dossier"></nav><div class="file-list-tools"><span id="file-count" class="section-count"></span><label class="file-search">' + icon('search') + '<input id="file-search" type="search" placeholder="Rechercher un fichier…" aria-label="Rechercher dans ce dossier"></label></div></div><div class="table-scroll"><table class="file-table"><thead><tr><th>NOM</th><th>TAILLE</th><th>DERNIÈRE MODIFICATION</th><th>ACTIONS</th></tr></thead><tbody id="file-rows"></tbody></table></div></section>';
    target.querySelector('#file-search').oninput = () => renderFileRows();
    target.querySelector('#file-share').onchange = async e => { selectedShare = e.target.value; folder = ''; await loadFiles(); };
    target.querySelector('#file-up').onclick = () => { folder = folder.split('/').slice(0, -1).join('/'); loadFiles().catch(e => notify(e.message)); };
    target.querySelector('#file-folder').onclick = async () => { const name = await askInput('Nom du nouveau dossier'); if (!name) return; try { await api(fileUrl('/api/files/folder', join(name)), { method: 'POST', body: {} }); await loadFiles(); } catch (e) { notify(e.message); } };
    target.querySelector('#file-upload').onchange = e => upload(e.target.files);
    const trash = document.createElement('button'); trash.className = 'secondary-button'; trash.textContent = 'Corbeille'; target.querySelector('.file-toolbar-actions').append(trash);
    trash.onclick = async () => {
      try {
        const records = await api(fileUrl('/api/files/trash'));
        const dialog = modal(`<h2>Corbeille · ${E(selectedShare)}</h2><p>Les fichiers retirés occupent encore de l’espace jusqu’à ce que la corbeille soit vidée.</p><div class="console-form">${records.map(r => `<p>${E(r.original)} <button class="secondary-button" data-restore="${E(r.id)}">Restaurer</button></p>`).join('') || '<p>La corbeille est vide.</p>'}<button class="danger-button" id="trash-purge">Vider définitivement…</button></div>`);
        buttons(dialog, '[data-restore]', async b => { await api(fileUrl('/api/files/restore'), { method: 'POST', body: { id: b.dataset.restore } }); dialog.close(); await loadFiles(); });
        dialog.querySelector('#trash-purge').onclick = async () => { const confirmation = await askInput('Tapez VIDER LA CORBEILLE. Cette suppression est définitive.'); if (!confirmation) return; try { await api(fileUrl('/api/files/purge'), { method: 'POST', body: { confirmation } }); dialog.close(); await loadFiles(); } catch (e) { notify(e.message); } };
      } catch (e) { notify(e.message); }
    };
    const drop = target.querySelector('#file-drop');
    const pickFiles = () => { if (!target.querySelector('#file-upload').disabled) target.querySelector('#file-upload').click(); };
    drop.onclick = pickFiles; drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles(); } };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-active'); }; drop.ondragleave = () => drop.classList.remove('drag-active'); drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag-active'); upload(e.dataTransfer.files); };
  }
  const join = name => folder ? `${folder}/${name}` : name;
  const fileUrl = (route, relative = folder) => `${route}?${new URLSearchParams({ share: selectedShare, path: relative })}`;
  let fileEntries = [];
  async function loadFiles() {
    const target = document.querySelector('#page-files'), body = target.querySelector('#file-rows'); if (!body) return;
    const path = target.querySelector('#file-path');
    if (!selectedShare) path.textContent = 'Aucun partage autorisé.';
    else {
      const parts = folder ? folder.split('/') : [];
      path.innerHTML = '<button type="button" class="breadcrumb-button" data-folder="">' + icon('folder') + E(selectedShare) + '</button>' + parts.map((part, i) => '<span class="path-separator">/</span><button type="button" class="breadcrumb-button" data-folder="' + E(parts.slice(0, i + 1).join('/')) + '">' + E(part) + '</button>').join('');
      buttons(path, '[data-folder]', async b => { folder = b.dataset.folder; await loadFiles(); });
    }
    const writable = shares.find(s => s.name === selectedShare)?.writable;
    target.querySelector('#file-folder').disabled = !writable; target.querySelector('#file-upload').disabled = !writable;
    target.querySelector('#file-up').disabled = !folder;
    target.querySelector('#file-drop').setAttribute('aria-disabled', writable ? 'false' : 'true');
    if (!selectedShare) { fileEntries = []; body.innerHTML = '<tr><td colspan="4"><div class="empty-state">' + icon('folder') + '<strong>Votre espace vous attend</strong><p>Créez un partage ou demandez un accès à votre administrateur.</p></div></td></tr>'; return; }
    fileEntries = await api(fileUrl('/api/files'));
    renderFileRows();
  }
  function renderFileRows() {
    const target = document.querySelector('#page-files'), body = target.querySelector('#file-rows'); if (!body) return;
    const writable = shares.find(s => s.name === selectedShare)?.writable;
    const query = target.querySelector('#file-search')?.value.toLocaleLowerCase('fr') || '';
    const entries = fileEntries.filter(f => f.name.toLocaleLowerCase('fr').includes(query));
    target.querySelector('#file-count').textContent = entries.length + (entries.length === 1 ? ' élément' : ' éléments');
    body.innerHTML = entries.map(f => {
      const extension = f.name.includes('.') ? f.name.split('.').at(-1).toLowerCase() : '';
      const photo = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(extension);
      const glyph = f.directory ? 'folder' : photo ? 'image' : 'file';
      const type = f.directory ? 'Dossier' : photo ? 'Image' : extension ? extension.toUpperCase() : 'Fichier';
      const name = f.directory ? '<button class="file-name" data-open="' + E(f.name) + '">' + E(f.name) + '</button>' : '<strong class="file-name">' + E(f.name) + '</strong>';
      return '<tr><td><div class="file-identity"><span class="file-symbol ' + (f.directory ? 'is-folder' : photo ? 'is-image' : 'is-document') + '">' + icon(glyph) + '</span><div>' + name + '<small>' + E(type) + '</small></div></div></td><td class="file-size">' + (f.directory ? '—' : bytes(f.size)) + '</td><td class="file-date">' + E(new Date(f.modified).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td><td><div class="table-actions">' + (f.directory ? '' : '<a class="action-button action-download" aria-label="Télécharger" title="Télécharger" href="' + E(fileUrl('/api/files/download', join(f.name))) + '">' + icon('download') + '<span>Télécharger</span></a><button class="action-button" aria-label="Renommer" title="Renommer" data-rename="' + E(f.name) + '" ' + (writable ? '' : 'disabled') + '>' + icon('edit') + '<span>Renommer</span></button>') + '<button class="action-button action-danger" aria-label="Retirer" title="Retirer" data-trash="' + E(f.name) + '" ' + (writable ? '' : 'disabled') + '>' + icon('trash') + '<span>Retirer</span></button></div></td></tr>';
    }).join('') || '<tr><td colspan="4"><div class="empty-state">' + icon(query ? 'search' : 'folder') + '<strong>' + (query ? 'Aucun résultat pour cette recherche' : 'Votre prochain fichier commence ici') + '</strong><p>' + (query ? 'Essayez avec un autre nom.' : 'Déposez votre premier fichier pour remplir cet espace.') + '</p></div></td></tr>';
    buttons(body, '[data-open]', async b => { folder = join(b.dataset.open); await loadFiles(); });
    buttons(body, '[data-trash]', async b => { if (!await confirmAction('Déplacer « ' + b.dataset.trash + ' » dans la corbeille ?')) return; await api(fileUrl('/api/files', join(b.dataset.trash)), { method: 'DELETE' }); await loadFiles(); });
    buttons(body, '[data-rename]', async b => { const name = await askInput('Nouveau nom du fichier', b.dataset.rename); if (!name) return; await api(fileUrl('/api/files/move', join(b.dataset.rename)), { method: 'POST', body: { destination: join(name) } }); await loadFiles(); });
  }
  async function upload(files) {
    const progress = document.querySelector('#transfer-progress');
    if (!selectedShare || !shares.find(s => s.name === selectedShare)?.writable) return notify('Partage en lecture seule');
    try {
      for (const file of files) await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open('PUT', fileUrl('/api/files/upload', join(file.name))); xhr.setRequestHeader('X-Nexus-Request', '1');
        xhr.upload.onprogress = e => { progress.textContent = `${file.name} : ${e.lengthComputable ? Math.round(e.loaded / e.total * 100) + ' %' : 'envoi…'}`; };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else { try { reject(new Error(JSON.parse(xhr.responseText).error)); } catch { reject(new Error('Transfert interrompu')); } } };
        xhr.onerror = () => reject(new Error('Connexion interrompue')); xhr.send(file);
      }); progress.textContent = 'Transfert terminé.'; await loadFiles();
    } catch (e) { progress.textContent = e.message; notify(e.message); }
  }
  function renderSettings() {
    const target = document.querySelector('#page-settings');
    target.innerHTML = `${heading('Paramètres', 'Identité du serveur, accès et mises à jour.')}<div class="settings-grid"><form class="panel console-form" id="hostname-form"><h2>Nom du serveur</h2>${field('Nom', 'name', 'text', `required value="${E(snapshotData.hostname)}" pattern="[a-z][a-z0-9-]{0,62}"`)}<button class="secondary-button" type="submit">Enregistrer</button><p role="alert"></p></form><section class="panel"><h2>Accès réseau local</h2><p>Interface : ${E(location.origin)}</p><p>SMB : <code>\\${E(snapshotData.hostname)}\nom-du-partage</code></p><p>Nom SMB : <code>nx_${E(me.name)}</code></p><p>Utilisez HTTPS ou un tunnel SSH sur un réseau non fiable.</p></section></div><section class="panel console-form"><h2>Mises à jour GitHub</h2><p>Nexus ${E(snapshotData.version)} · Publications stables de Nariod68/Nexus-nas</p><div class="file-toolbar"><button class="secondary-button" id="updates-check">Rechercher</button><button class="primary-button" id="updates-install" disabled>Installer la nouvelle version</button><button class="secondary-button" id="updates-rollback">Revenir à la version précédente</button></div><p id="live-update-status" role="status"></p></section><section class="panel"><h2>Serveur</h2><button class="danger-button" id="server-restart">Redémarrer le serveur…</button></section>`;
    formSubmit(target.querySelector('#hostname-form'), async body => { await api('/api/hostname', { method: 'POST', body }); notify('Nom enregistré'); await refresh(true); });
    target.querySelector('#updates-check').onclick = async () => { const output = target.querySelector('#live-update-status'); try { const data = await api('/api/updates'); output.textContent = data.available ? `Nouvelle version : ${data.version}` : `Vous êtes à jour (${data.version}).`; target.querySelector('#updates-install').disabled = !data.available; } catch (e) { output.textContent = e.message; } };
    for (const [id, route, question] of [['updates-install', '/api/updates/install', 'Installer la dernière version ? L’interface sera temporairement indisponible.'], ['updates-rollback', '/api/updates/rollback', 'Restaurer la version précédente ?']]) target.querySelector(`#${id}`).onclick = async () => { if (!await confirmAction(question)) return; try { await api(route, { method: 'POST', body: {} }); target.querySelector('#live-update-status').textContent = 'Mise à jour lancée. Attendez puis reconnectez-vous. Le suivi figure sur la vue d’ensemble.'; } catch (e) { notify(e.message); } };
    target.querySelector('#server-restart').onclick = async () => { const confirmation = await askInput('Tapez REDÉMARRER pour confirmer'); if (!confirmation) return; try { await api('/api/restart', { method: 'POST', body: { confirmation } }); notify('Redémarrage dans quelques secondes.'); } catch (e) { notify(e.message); } };
  }
  const logout = document.createElement('button'); logout.className = 'secondary-button'; logout.textContent = 'Déconnexion';
  logout.onclick = async () => { try { await api('/api/logout', { method: 'POST', body: {} }); me = null; await loginScreen(); } catch (e) { notify(e.message); } };
  const passwordButton = document.createElement('button'); passwordButton.className = 'secondary-button'; passwordButton.textContent = 'Mon compte';
  passwordButton.onclick = () => {
    const dialog = modal(`<form class="console-form"><h2>Changer mon mot de passe</h2>${field('Mot de passe actuel', 'current', 'password', 'required autocomplete="current-password"')}${field('Nouveau mot de passe Nexus et SMB', 'password', 'password', 'required minlength="12" maxlength="256" autocomplete="new-password"')}<button type="submit" class="primary-button">Enregistrer et me reconnecter</button><p role="alert"></p></form>`);
    formSubmit(dialog.querySelector('form'), async body => { await api('/api/password', { method: 'POST', body }); dialog.close(); me = null; await loginScreen(); });
  };
  document.querySelector('.topbar-actions').append(passwordButton, logout);
  function decorate(scope) {
    const candidates = [...(scope.matches?.('button') ? [scope] : []), ...scope.querySelectorAll('button')];
    for (const button of candidates) {
      if (button.querySelector('svg') || button.classList.contains('dialog-close') || button.classList.contains('nav-item')) continue;
      const label = button.textContent.trim();
      const name = /Créer|Ajouter|Nouveau/.test(label) ? 'plus' : /Actualiser|Réessayer|Restaurer|Revenir/.test(label) ? 'refresh' : /Rechercher/.test(label) ? 'search' : /Corbeille|Retirer|Désactiver/.test(label) ? 'trash' : /Modifier|Renommer|compte/.test(label) ? 'edit' : /Enregistrer|Terminer|connecter/.test(label) ? 'check' : /Installer/.test(label) ? 'download' : /Redémarrer|fonctionnement/.test(label) ? 'clock' : /Partitionner|disque/.test(label) ? 'disk' : /Dossier parent/.test(label) ? 'arrow' : null;
      if (name) button.insertAdjacentHTML('afterbegin', icon(name));
    }
  }
  const decorations = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) decorate(node); });
  decorations.observe(document.body, { childList: true, subtree: true });
  decorate(document.body);
  document.querySelector('.help-button').addEventListener('click', e => { e.stopImmediatePropagation(); notify('Créez vos comptes, puis vos partages. La rubrique Fichiers permet les transferts. Le compte SMB porte le préfixe nx_.'); }, true);
  document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { if (me && b.dataset.page === 'files') loadFiles().catch(e => notify(e.message)); }));
  document.querySelector('.brand').addEventListener('click', event => { if (me?.role === 'user') { event.preventDefault(); event.stopImmediatePropagation(); showPage('files'); loadFiles().catch(e => notify(e.message)); } }, true);
  setInterval(() => { if (me && !shell.hidden && !document.hidden) refresh(); }, 10000);
  (async () => { try { const setup = await api('/api/setup'); if (!setup.configured) await loginScreen(true); else { try { await connected(); } catch { await loginScreen(); } } } catch (e) { gate.innerHTML = `<div class="panel login-panel"><h1>Service Nexus indisponible</h1><p>${E(e.message)}</p><p>Lancez le service Nexus pour utiliser cette interface.</p></div>`; } })();
}
