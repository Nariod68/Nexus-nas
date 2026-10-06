if (location.protocol !== 'file:') {
  const shell = document.querySelector('.app-shell'); shell.hidden = true;
  const gate = document.createElement('section'); gate.className = 'login-screen'; document.body.append(gate);
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const bytes = n => n == null ? '—' : `${(n / 1024 ** 3).toFixed(1)} Gio`;
  let me, info, shares = [], users = [], folder = '', selectedShare = '', snapshotData, refreshBusy = false;
  let wizard = false;
  const status = document.createElement('p'); status.className = 'console-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); document.querySelector('.page-container').prepend(status);
  function notify(message) { status.textContent = message; showNotice(message); }
  async function api(url, { method = 'GET', body, raw, timeout = 15000 } = {}) {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'X-Nexus-Request': '1', ...(raw ? {} : { 'Content-Type': 'application/json' }) }, body: raw || (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(timeout) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401 && !url.includes('login')) { shell.hidden = true; await loginScreen(); } throw new Error(data.error || `HTTP ${response.status}`); }
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
      gate.hidden = true; shell.hidden = false;
      showPage(me.role === 'admin' ? (pageNames.fr[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard') : 'files');
    } catch (error) { recoveryScreen(error.message); }
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
      shares = await api('/api/shares');
      if (me.role === 'admin') {
        [info, snapshotData, users] = await Promise.all([api('/api/agent'), api('/api/system'), api('/api/users')]);
        renderDashboard();
        renderJobs();
        if (full) { renderStorage(); renderShares(); renderUsers(); renderSettings(); }
      }
      if (full) { renderFiles(); await loadFiles(); }
      status.textContent = '';
    } catch (e) { if (strict) throw e; notify(`Connexion interrompue : ${e.message}`); }
    finally { refreshBusy = false; }
  }
  function renderDashboard() {
    const d = snapshotData;
    document.querySelector('.server-card strong').textContent = d.hostname;
    document.querySelector('.server-card small').textContent = `${d.system} · v${d.version}`;
    const target = document.querySelector('#page-dashboard');
    target.innerHTML = `${heading(`Bonjour, ${E(me.name)}`, 'Votre serveur NAS, vos fichiers et votre réseau.')}<div class="metric-grid">${[['Processeur', d.cpuPercent == null ? '—' : `${d.cpuPercent} %`], ['Mémoire', `${Math.round(100 * (1 - d.memory.available / d.memory.total))} %`], ['Partages', shares.length], ['Durée de fonctionnement', `${Math.floor(d.uptimeSeconds / 3600)} h`]].map(([title, value]) => `<article class="metric-card"><div class="metric-heading">${title}</div><div class="metric-value">${E(value)}</div></article>`).join('')}</div><div class="lower-grid"><section class="panel"><h2>Accès au serveur</h2><p>Interface : <a href="${E(location.origin)}">${E(location.origin)}</a></p>${d.network.map(n => `<p>${E(n.name)} : ${E(n.address)}</p>`).join('')}<p>Fichiers Windows : <code>\\${E(d.hostname)}</code></p><p>Fichiers Linux / macOS : <code>smb://${E(d.hostname)}</code></p><p>Compte SMB : <code>nx_${E(me.name)}</code> · même mot de passe que Nexus</p></section><section class="panel"><h2>Stockage surveillé</h2><p>${E(d.storage?.path)} : ${bytes(d.storage?.available)} disponibles sur ${bytes(d.storage?.total)}</p><p>${E(d.system)} · ${E(d.architecture)} · Nexus ${E(d.version)}</p><button class="secondary-button" id="live-refresh">Actualiser</button></section></div><section class="panel jobs-panel" id="jobs"><h2>Opérations système</h2></section>`;
    target.querySelector('#live-refresh').onclick = () => refresh(true);
  }
  function renderJobs() {
    const target = document.querySelector('#jobs'); if (!target || !info) return;
    target.innerHTML = `<h2>Opérations système</h2>${[...info.jobs.slice(-5), ...(info.update ? [{ kind: 'Mise à jour', ...info.update }] : [])].map(j => `<p class="job-${E(j.status)}"><strong>${E(j.kind || 'Mise à jour')} · ${E(j.status)}</strong> — ${E(j.message)}</p>`).join('') || '<p>Aucune opération en cours.</p>'}`;
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
    buttons(target, '[data-remove-share]', async b => { if (!confirm('Retirer cet accès réseau ? Les fichiers seront conservés sur le disque.')) return; await api('/api/shares/remove', { method: 'POST', body: { name: b.dataset.removeShare } }); await refresh(true); });
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
    buttons(target, '[data-disable]', async b => { if (!confirm(`Désactiver les accès web et SMB de ${b.dataset.disable} ?`)) return; await api('/api/users/disable', { method: 'POST', body: { name: b.dataset.disable } }); await refresh(true); });
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
    target.innerHTML = `${heading('Fichiers', 'Déposez, téléchargez et organisez vos fichiers. Les retraits sont conservés dans une corbeille sur le disque.')}<div class="file-toolbar"><label>Partage<select id="file-share">${shares.map(s => `<option value="${E(s.name)}" ${s.name === selectedShare ? 'selected' : ''}>${E(s.name)}${s.writable ? '' : ' (lecture seule)'}</option>`).join('')}</select></label><button class="secondary-button" id="file-up">Dossier parent</button><button class="secondary-button" id="file-folder">Nouveau dossier</button><label class="primary-button file-upload-label">Déposer des fichiers<input type="file" id="file-upload" multiple></label></div><p id="file-path"></p><p id="transfer-progress" role="status"></p><div class="file-drop" id="file-drop">Glissez vos fichiers ici</div><section class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>NOM</th><th>TAILLE</th><th>MODIFIÉ</th><th>ACTIONS</th></tr></thead><tbody id="file-rows"></tbody></table></div></section>`;
    target.querySelector('#file-share').onchange = async e => { selectedShare = e.target.value; folder = ''; await loadFiles(); };
    target.querySelector('#file-up').onclick = () => { folder = folder.split('/').slice(0, -1).join('/'); loadFiles().catch(e => notify(e.message)); };
    target.querySelector('#file-folder').onclick = async () => { const name = prompt('Nom du nouveau dossier'); if (!name) return; try { await api(fileUrl('/api/files/folder', join(name)), { method: 'POST', body: {} }); await loadFiles(); } catch (e) { notify(e.message); } };
    target.querySelector('#file-upload').onchange = e => upload(e.target.files);
    const trash = document.createElement('button'); trash.className = 'secondary-button'; trash.textContent = 'Corbeille'; target.querySelector('.file-toolbar').append(trash);
    trash.onclick = async () => {
      try {
        const records = await api(fileUrl('/api/files/trash'));
        const dialog = modal(`<h2>Corbeille · ${E(selectedShare)}</h2><p>Les fichiers retirés occupent encore de l’espace jusqu’à ce que la corbeille soit vidée.</p><div class="console-form">${records.map(r => `<p>${E(r.original)} <button class="secondary-button" data-restore="${E(r.id)}">Restaurer</button></p>`).join('') || '<p>La corbeille est vide.</p>'}<button class="danger-button" id="trash-purge">Vider définitivement…</button></div>`);
        buttons(dialog, '[data-restore]', async b => { await api(fileUrl('/api/files/restore'), { method: 'POST', body: { id: b.dataset.restore } }); dialog.close(); await loadFiles(); });
        dialog.querySelector('#trash-purge').onclick = async () => { const confirmation = prompt('Tapez VIDER LA CORBEILLE. Cette suppression est définitive.'); if (!confirmation) return; try { await api(fileUrl('/api/files/purge'), { method: 'POST', body: { confirmation } }); dialog.close(); await loadFiles(); } catch (e) { notify(e.message); } };
      } catch (e) { notify(e.message); }
    };
    const drop = target.querySelector('#file-drop'); drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-active'); }; drop.ondragleave = () => drop.classList.remove('drag-active'); drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag-active'); upload(e.dataTransfer.files); };
  }
  const join = name => folder ? `${folder}/${name}` : name;
  const fileUrl = (route, relative = folder) => `${route}?${new URLSearchParams({ share: selectedShare, path: relative })}`;
  async function loadFiles() {
    const target = document.querySelector('#page-files'), body = target.querySelector('#file-rows'); if (!body) return;
    target.querySelector('#file-path').textContent = selectedShare ? `${selectedShare} / ${folder}` : 'Aucun partage autorisé.';
    const writable = shares.find(s => s.name === selectedShare)?.writable;
    target.querySelector('#file-folder').disabled = !writable; target.querySelector('#file-upload').disabled = !writable;
    if (!selectedShare) { body.innerHTML = '<tr><td colspan="4">Créez un partage ou demandez un accès à votre administrateur.</td></tr>'; return; }
    const entries = await api(fileUrl('/api/files'));
    body.innerHTML = entries.map(f => `<tr><td>${f.directory ? `<button class="text-link" data-open="${E(f.name)}">📁 ${E(f.name)}</button>` : E(f.name)}</td><td>${f.directory ? 'Dossier' : bytes(f.size)}</td><td>${E(new Date(f.modified).toLocaleString())}</td><td>${f.directory ? '' : `<a class="text-link" href="${E(fileUrl('/api/files/download', join(f.name)))}">Télécharger</a> <button class="secondary-button" data-rename="${E(f.name)}" ${writable ? '' : 'disabled'}>Renommer</button>`} <button class="danger-button" data-trash="${E(f.name)}" ${writable ? '' : 'disabled'}>Retirer</button></td></tr>`).join('') || '<tr><td colspan="4">Ce dossier est vide.</td></tr>';
    buttons(body, '[data-open]', async b => { folder = join(b.dataset.open); await loadFiles(); });
    buttons(body, '[data-trash]', async b => { if (!confirm(`Déplacer « ${b.dataset.trash} » dans la corbeille ?`)) return; await api(fileUrl('/api/files', join(b.dataset.trash)), { method: 'DELETE' }); await loadFiles(); });
    buttons(body, '[data-rename]', async b => { const name = prompt('Nouveau nom du fichier', b.dataset.rename); if (!name) return; await api(fileUrl('/api/files/move', join(b.dataset.rename)), { method: 'POST', body: { destination: join(name) } }); await loadFiles(); });
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
    for (const [id, route, question] of [['updates-install', '/api/updates/install', 'Installer la dernière version ? L’interface sera temporairement indisponible.'], ['updates-rollback', '/api/updates/rollback', 'Restaurer la version précédente ?']]) target.querySelector(`#${id}`).onclick = async () => { if (!confirm(question)) return; try { await api(route, { method: 'POST', body: {} }); target.querySelector('#live-update-status').textContent = 'Mise à jour lancée. Attendez puis reconnectez-vous. Le suivi figure sur la vue d’ensemble.'; } catch (e) { notify(e.message); } };
    target.querySelector('#server-restart').onclick = async () => { const confirmation = prompt('Tapez REDÉMARRER pour confirmer'); if (!confirmation) return; try { await api('/api/restart', { method: 'POST', body: { confirmation } }); notify('Redémarrage dans quelques secondes.'); } catch (e) { notify(e.message); } };
  }
  const logout = document.createElement('button'); logout.className = 'secondary-button'; logout.textContent = 'Déconnexion';
  logout.onclick = async () => { try { await api('/api/logout', { method: 'POST', body: {} }); me = null; await loginScreen(); } catch (e) { notify(e.message); } };
  const passwordButton = document.createElement('button'); passwordButton.className = 'secondary-button'; passwordButton.textContent = 'Mon compte';
  passwordButton.onclick = () => {
    const dialog = modal(`<form class="console-form"><h2>Changer mon mot de passe</h2>${field('Mot de passe actuel', 'current', 'password', 'required autocomplete="current-password"')}${field('Nouveau mot de passe Nexus et SMB', 'password', 'password', 'required minlength="12" maxlength="256" autocomplete="new-password"')}<button type="submit" class="primary-button">Enregistrer et me reconnecter</button><p role="alert"></p></form>`);
    formSubmit(dialog.querySelector('form'), async body => { await api('/api/password', { method: 'POST', body }); dialog.close(); me = null; await loginScreen(); });
  };
  document.querySelector('.topbar-actions').append(passwordButton, logout);
  document.querySelector('.help-button').addEventListener('click', e => { e.stopImmediatePropagation(); notify('Créez vos comptes, puis vos partages. La rubrique Fichiers permet les transferts. Le compte SMB porte le préfixe nx_.'); }, true);
  document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { if (me && b.dataset.page === 'files') loadFiles().catch(e => notify(e.message)); }));
  setInterval(() => { if (me && !shell.hidden && !document.hidden) refresh(); }, 10000);
  (async () => { try { const setup = await api('/api/setup'); if (!setup.configured) await loginScreen(true); else { try { await connected(); } catch { await loginScreen(); } } } catch (e) { gate.innerHTML = `<div class="panel login-panel"><h1>Service Nexus indisponible</h1><p>${E(e.message)}</p><p>Lancez le service Nexus pour utiliser cette interface.</p></div>`; } })();
}
