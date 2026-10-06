/* The static file remains a demo; HTTP mode always requires the real service. */
if (location.protocol !== 'file:') {
  const shell = document.querySelector('.app-shell');
  shell.hidden = true;
  const login = document.createElement('section');
  login.className = 'login-screen';
  login.innerHTML = `<form class="panel login-panel"><img src="nexus-icon.svg" alt="" width="64" height="64"><h1>Bienvenue sur Nexus</h1><p>Connectez-vous à votre serveur NAS.</p><label for="admin-password">Mot de passe administrateur</label><input id="admin-password" type="password" autocomplete="current-password" required minlength="16"><button class="primary-button" type="submit">Se connecter</button><p class="login-error" role="alert"></p></form>`;
  document.body.append(login);
  let lastSnapshot;
  let refreshing = false;
  const text = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
  const bytes = value => value == null ? '—' : new Intl.NumberFormat(language, { style: 'unit', unit: value >= 1e12 ? 'terabyte' : value >= 1e9 ? 'gigabyte' : 'megabyte', maximumFractionDigits: 1 }).format(value / (value >= 1e12 ? 1e12 : value >= 1e9 ? 1e9 : 1e6));
  const label = (fr, en) => language === 'fr' ? fr : en;
  async function api(path, body) {
    const response = await fetch(path, { credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json', 'X-Nexus-Request': '1' } : {}, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && path !== '/api/login') { shell.hidden = true; login.hidden = false; }
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }
  function table(selector, rows, unavailable) {
    const body = document.querySelector(selector);
    body.replaceChildren();
    if (!rows?.length) rows = [[unavailable]];
    for (const values of rows) {
      const row = document.createElement('tr');
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      if (values.length === 1) row.firstChild.colSpan = 5;
      body.append(row);
    }
  }
  function storagePanel(data) {
    const container = document.querySelector('#page-storage .storage-overview');
    container.replaceChildren();
    const section = document.createElement('section'); section.className = 'panel';
    for (const value of [label('Système de fichiers surveillé', 'Monitored filesystem'), data?.path || '—', `${label('Utilisé', 'Used')} : ${bytes(data?.used)}`, `${label('Disponible', 'Available')} : ${bytes(data?.available)}`, `${label('Capacité', 'Capacity')} : ${bytes(data?.total)}`]) { const p = document.createElement('p'); p.textContent = value; section.append(p); }
    container.append(section);
  }
  function render(data) {
    text('.demo-tag', label('CONNECTÉ', 'CONNECTED'));
    text('.server-card strong', data.hostname);
    text('.server-card small', data.platform);
    text('.profile-copy small', label('Administration Nexus', 'Nexus administration'));
    text('.system-info h2', data.hostname);
    text('.system-info p', `${label('Durée de fonctionnement', 'Uptime')} : ${Math.floor(data.uptimeSeconds / 3600)} h`);
    text('.system-status .status-pill', label('Service connecté', 'Service connected'));
    const metrics = document.querySelectorAll('.system-footer strong');
    metrics[0].textContent = data.cpuPercent == null ? '—' : `${data.cpuPercent} %`;
    metrics[1].textContent = data.memory.available == null ? '—' : `${Math.round(100 * (1 - data.memory.available / data.memory.total))} %`;
    metrics[2].textContent = data.network[0]?.address || '—';
    text('.storage-total > strong', bytes(data.storage?.used));
    text('.storage-of', `${label('sur', 'of')} ${bytes(data.storage?.total)}`);
    const percent = data.storage?.total ? Math.round(data.storage.used / data.storage.total * 100) : 0;
    document.querySelector('.storage-summary .progress-track > span').style.width = `${percent}%`;
    document.querySelector('.storage-summary .progress-track').setAttribute('aria-label', `${percent}%`);
    text('.storage-legend', `${percent} % · ${bytes(data.storage?.available)} ${label('disponibles', 'available')} · ${data.storage?.path || '—'}`);
    const values = document.querySelectorAll('.metric-value');
    values[0].textContent = data.disks ? data.disks.filter(d => d.mountpoint || d.children?.some(c => c.mountpoint)).length : '—';
    values[1].textContent = data.shares?.length ?? '—'; values[2].textContent = data.users?.length ?? '—'; values[3].textContent = data.services.filter(s => s.state === 'active').length;
    const captions = document.querySelectorAll('.metric-caption');
    captions[0].textContent = label('Périphériques avec montage détecté', 'Devices with detected mount'); captions[1].textContent = label('Configuration Samba détectée', 'Detected Samba configuration'); captions[2].textContent = label('Comptes Linux locaux', 'Local Linux accounts'); captions[3].textContent = data.services.map(s => `${s.name}: ${s.state}`).join(' · ') || '—';
    const disks = data.disks?.filter(d => d.type === 'disk') || [];
    document.querySelectorAll('.disk-row').forEach(node => node.remove());
    text('.disk-panel .panel-footer', `${disks.length} ${label('disques détectés · SMART non mesuré', 'disks detected · SMART not measured')}`);
    document.querySelectorAll('.activity-row').forEach(node => node.remove());
    text('.activity-panel .panel-heading p', `${label('Dernière lecture', 'Last read')} : ${new Date(data.sampledAt).toLocaleTimeString(language)}`);
    storagePanel(data.storage);
    table('#page-storage tbody', disks.map(d => [`/dev/${d.name} · ${d.model || ''}`, bytes(d.size), '—', label('Non mesuré', 'Not measured'), d.mountpoint || d.children?.map(c => c.mountpoint).filter(Boolean).join(', ') || label('Non monté', 'Not mounted')]), label('Aucun disque détecté ou lsblk indisponible', 'No disks detected or lsblk unavailable'));
    table('#page-shares tbody', data.shares?.map(s => [s.name, s.path, s.access || label('Selon Samba', 'According to Samba'), '—', s.readOnly ? label('Lecture seule', 'Read only') : label('Lecture / écriture', 'Read / write')]), label('Aucun partage détecté ou Samba indisponible', 'No shares detected or Samba unavailable'));
    table('#page-users tbody', data.users?.map(u => [u.name, `UID ${u.uid}`, label('Selon les droits Linux / Samba', 'According to Linux / Samba permissions'), '—', u.shell]), label('Comptes indisponibles', 'Accounts unavailable'));
    text('#page-shares .panel-heading p', label('Configuration existante, sans modification', 'Existing configuration, unchanged'));
    text('#page-users .panel-heading p', label('Comptes Linux, distincts du compte administrateur Nexus', 'Linux accounts, separate from the Nexus administrator'));
    const settings = document.querySelectorAll('#page-settings .settings-line strong');
    [data.hostname, data.system, data.architecture, data.version, data.network.map(n => n.address).join(', ') || '—', data.network.map(n => n.name).join(', ') || '—', data.services.map(s => `${s.name}: ${s.state}`).join(' · ') || '—'].forEach((v, i) => { settings[i].textContent = v; });
    text('#page-settings .settings-panel:nth-child(2) .panel-heading p', label('Interfaces détectées', 'Detected interfaces'));
    text('.footer-version', `v${data.version}`);
    document.querySelectorAll('.notice-banner p').forEach(p => { p.textContent = label('Données réelles en lecture seule. La création de partages, les comptes, le RAID et les actions système ne sont pas encore disponibles.', 'Live read-only data. Share creation, accounts, RAID and system actions are not yet available.'); });
    text('.system-actions > div:first-child p', label('Vérifiez les publications GitHub. Installez une version depuis le terminal du serveur.', 'Check GitHub releases. Install a version from the server terminal.'));
  }
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try { const data = await api('/api/system'); lastSnapshot = data; render(data); shell.hidden = false; login.hidden = true; }
    catch (error) {
      if (lastSnapshot && !shell.hidden) { text('.system-status .status-pill', label('Lecture échouée', 'Read failed')); text('.system-info p', label('Données anciennes : connexion interrompue', 'Stale data: connection interrupted')); }
      login.querySelector('.login-error').textContent = error.message; }
    finally { refreshing = false; }
  }
  login.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault(); const button = login.querySelector('button'); button.disabled = true;
    try { await api('/api/login', { password: login.querySelector('input').value }); login.querySelector('input').value = ''; await refresh(); }
    catch (error) { login.querySelector('.login-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-notice]').forEach(button => {
    if (button.dataset.notice.includes('actualisation') || button.dataset.notice.includes('détection réelle')) { button.addEventListener('click', event => { event.stopImmediatePropagation(); refresh(); }, true); }
    else { button.disabled = true; button.title = 'Disponible dans une prochaine version'; }
  });
  // Capture the live updater before the demonstration handler.
  updateButton.addEventListener('click', async event => {
    event.stopImmediatePropagation(); updateButton.disabled = true; updateStatus.hidden = false;
    updateStatus.textContent = label('Recherche en cours…', 'Checking…');
    try {
      const release = await api('/api/updates');
      updateStatus.textContent = release.available ? `${label('Version disponible', 'Available version')} : ${release.version}. ${label('Sur le serveur', 'On the server')} : ${release.command}` : `${label('À jour', 'Up to date')} (${release.version})`;
    } catch (error) { updateStatus.textContent = error.message; }
    finally { updateButton.disabled = false; }
  }, true);
  const logout = document.createElement('button'); logout.className = 'secondary-button'; logout.textContent = 'Déconnexion';
  logout.addEventListener('click', async () => { try { await api('/api/logout', {}); lastSnapshot = null; shell.hidden = true; login.hidden = false; } catch (error) { showNotice(error.message); } });
  document.querySelector('.topbar-actions').append(logout);
  languageSelect.addEventListener('change', () => { if (lastSnapshot) render(lastSnapshot); });
  refresh();
  setInterval(() => { if (!shell.hidden) refresh(); }, 10000);
}
