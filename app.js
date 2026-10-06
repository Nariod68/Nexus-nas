const pageNames = {
  fr: {
    dashboard: "Vue d’ensemble",
    storage: "Stockage",
    shares: "Partages réseau",
    users: "Utilisateurs",
    settings: "Paramètres",
  },
  en: {
    dashboard: "Overview",
    storage: "Storage",
    shares: "Network shares",
    users: "Users",
    settings: "Settings",
  },
};

const translations = {
  en: {
    "serveur personnel": "personal server",
    "ESPACE NAS": "NAS SPACE",
    "Vue d’ensemble": "Overview",
    "Partages réseau": "Network shares",
    "SYSTÈME": "SYSTEM",
    "Prototype local": "Local prototype",
    "Administrateur": "Administrator",
    "Compte de démonstration": "Demo account",
    "Mon serveur": "My server",
    "DÉMONSTRATION": "DEMO",
    "Aide": "Help",
    "MARDI 6 OCTOBRE 2026": "TUESDAY, OCTOBER 6, 2026",
    "Bonjour, Administrateur": "Hello, Administrator",
    "Voici ce qui se passe sur votre serveur aujourd’hui.": "Here’s what’s happening on your server today.",
    "Actualiser": "Refresh",
    "Prototype d’interface": "Interface prototype",
    "— Les chiffres et contrôles affichés sont des exemples. Aucune action n’est exécutée sur vos disques ou votre réseau.": "— The figures and controls shown are examples. No actions are performed on your disks or network.",
    "ÉTAT DU SYSTÈME": "SYSTEM STATUS",
    "Tout va bien": "All systems normal",
    "Serveur opérationnel": "Server is running",
    "Dernier démarrage il y a 12 jours": "Last started 12 days ago",
    "Processeur": "CPU",
    "Mémoire": "Memory",
    "Réseau": "Network",
    "ESPACE DE STOCKAGE": "STORAGE",
    "Voir les disques": "View disks",
    "sur 12 To disponibles": "of 12 TB available",
    "Utilisé": "Used",
    "7,2 To libres": "7.2 TB free",
    "Vue rapide": "Quick overview",
    "Les indicateurs principaux de votre NAS.": "Key indicators for your NAS.",
    "Volumes actifs": "Active volumes",
    "Tous les volumes sont en ligne": "All volumes are online",
    "Disponibles sur le réseau local": "Available on the local network",
    "1 administrateur · 2 utilisateurs": "1 administrator · 2 users",
    "Services actifs": "Active services",
    "SMB, SSH, sauvegarde": "SMB, SSH, backup",
    "Disques": "Disks",
    "État de santé du stockage": "Storage health",
    "Tout voir": "View all",
    "Sain": "Healthy",
    "Vérification SMART : il y a 18 minutes": "SMART check: 18 minutes ago",
    "Activité récente": "Recent activity",
    "Derniers événements du système": "Latest system events",
    "Sauvegarde terminée": "Backup completed",
    "Documents · il y a 24 min": "Documents · 24 min ago",
    "Connexion utilisateur": "User signed in",
    "marie · il y a 2 h": "marie · 2 hours ago",
    "Système à jour": "System is up to date",
    "Vérifié aujourd’hui à 08:00": "Checked today at 08:00",
    "Conçu pour votre réseau privé": "Built for your private network",
    "Stockage": "Storage",
    "Système": "System",
    "Architecture": "Architecture",
    "Disque 1": "Disk 1",
    "Disque 2": "Disk 2",
    "DISQUE": "DISK",
    "maquette": "prototype",
    "Paramètres": "Settings",
    "ESPACE NAS": "NAS SPACE",
    "Disques, volumes et capacité disponible.": "Disks, volumes, and available capacity.",
    "＋ Ajouter un disque": "＋ Add a disk",
    "Ajouter un disque": "Add a disk",
    "Mode démonstration": "Demo mode",
    "— Ces disques sont fictifs. Le formatage et la configuration RAID ne sont pas disponibles dans cette maquette.": "— These disks are examples. Formatting and RAID configuration are not available in this prototype.",
    "Capacité totale": "Total capacity",
    "Volume de données principal": "Main data volume",
    "En ligne": "Online",
    "utilisés sur 12 To": "used of 12 TB",
    "Données utilisées": "Data used",
    "7,2 To disponibles": "7.2 TB available",
    "Volume principal": "Main volume",
    "Configuration du volume": "Volume configuration",
    "Système de fichiers": "File system",
    "Disques membres": "Member disks",
    "2 disques": "2 disks",
    "État de synchronisation": "Sync status",
    "Synchronisé": "Synced",
    "Disques physiques": "Physical disks",
    "État de santé et capacité des disques détectés": "Health and capacity of detected disks",
    "CAPACITÉ": "CAPACITY",
    "TEMPÉRATURE": "TEMPERATURE",
    "SANTÉ SMART": "SMART HEALTH",
    "ÉTAT": "STATUS",
    "Partages réseau": "Network shares",
    "Gérez les dossiers accessibles depuis vos appareils.": "Manage folders accessible from your devices.",
    "＋ Créer un partage": "＋ Create share",
    "Créer un partage": "Create share",
    "— Les partages ci-dessous sont des exemples et ne sont pas publiés sur votre réseau.": "— The shares below are examples and are not published on your network.",
    "Dossiers partagés": "Shared folders",
    "4 partages configurés dans cet exemple": "4 shares configured in this example",
    "Tous les partages": "All shares",
    "NOM": "NAME",
    "CHEMIN": "PATH",
    "ACCÈS": "ACCESS",
    "TAILLE": "SIZE",
    "3 utilisateurs": "3 users",
    "2 utilisateurs": "2 users",
    "Tous les utilisateurs": "All users",
    "Actif": "Active",
    "Utilisateurs": "Users",
    "Comptes et accès aux ressources du NAS.": "Accounts and access to NAS resources.",
    "＋ Ajouter un utilisateur": "＋ Add a user",
    "Ajouter un utilisateur": "Add a user",
    "— Ces comptes sont fictifs. Aucun compte système n’a été créé.": "— These accounts are examples. No system accounts have been created.",
    "Comptes du serveur": "Server accounts",
    "3 comptes dans cet exemple": "3 accounts in this example",
    "Tous les comptes": "All accounts",
    "UTILISATEUR": "USER",
    "RÔLE": "ROLE",
    "PARTAGES ACCESSIBLES": "SHARES",
    "DERNIÈRE ACTIVITÉ": "LAST ACTIVE",
    "Tous les partages": "All shares",
    "À l’instant": "Just now",
    "Utilisateur": "User",
    "Documents, Photos": "Documents, Photos",
    "Il y a 2 h": "2 hours ago",
    "Documents, Public": "Documents, Public",
    "Hier": "Yesterday",
    "Informations générales de votre serveur.": "General information about your server.",
    "— Ces paramètres sont illustratifs. Modifier le réseau ou redémarrer un serveur nécessite un accès système contrôlé.": "— These settings are illustrative. Changing network settings or restarting requires controlled system access.",
    "Informations du serveur": "Server information",
    "Identité et système d’exploitation": "Identity and operating system",
    "Nom d’hôte": "Hostname",
    "Version de l’interface": "Interface version",
    "Réseau": "Network",
    "Configuration réseau fictive": "Example network configuration",
    "Adresse IP locale": "Local IP address",
    "Interface": "Interface",
    "Services réseau": "Network services",
    "Configurer le réseau": "Configure network",
    "Actions système": "System actions",
    "La recherche vérifie les versions publiées sur GitHub ; l’installation nécessite le service Linux Nexus.": "The checker looks for releases published on GitHub; installation requires the Nexus Linux service.",
    "Vérifier les mises à jour": "Check for updates",
    "⏻ Redémarrer le serveur": "⏻ Restart server",
    "Redémarrer le serveur": "Restart server",
    "Masquer le message": "Dismiss message",
    "Plus d’options": "More options",
    "Aide : cette maquette n’est pas encore connectée à un serveur Linux.": "Help: this prototype is not connected to a Linux server yet.",
    "L’actualisation sera disponible lorsque le tableau de bord sera connecté au serveur.": "Refresh will be available once the dashboard is connected to the server.",
    "Plus d’options seront disponibles dans une prochaine version.": "More options will be available in a future version.",
    "Le journal complet sera disponible quand le serveur sera connecté.": "The full log will be available when the server is connected.",
    "L’ajout de disque nécessite une connexion sécurisée au système Linux.": "Adding a disk requires a secure connection to the Linux system.",
    "La création de partages nécessite la configuration du service SMB sur Linux.": "Creating shares requires SMB to be configured on Linux.",
    "Le filtrage sera disponible dans une prochaine version.": "Filtering will be available in a future version.",
    "La création de comptes sera disponible après connexion à Linux.": "Creating accounts will be available after connecting to Linux.",
    "La détection réelle nécessite le service système du NAS.": "Live detection requires the NAS system service.",
    "Les réglages réseau seront connectés au système dans une version ultérieure.": "Network settings will be connected to the system in a future version.",
    "Aucun redémarrage n’est lancé : le prototype n’est pas relié au système.": "No restart was initiated: the prototype is not connected to the system.",
  },
};

const navButtons = document.querySelectorAll("[data-page]");
const pageViews = document.querySelectorAll(".page-view");
const breadcrumbCurrent = document.querySelector("#breadcrumb-current");
const toast = document.querySelector(".toast");
const languageSelect = document.querySelector("#language-select");
const themeToggle = document.querySelector(".theme-toggle");
const updateButton = document.querySelector("#check-updates-button");
const updateStatus = document.querySelector("#update-status");
let toastTimer;
let language = "fr";
let updateState = null;
const originalText = new WeakMap();
const currentVersion = "0.1.0";
const githubRepository = "https://github.com/Nariod68/Nexus-nas";
const githubLatestReleaseApi = "https://api.github.com/repos/Nariod68/Nexus-nas/releases/latest";

function readPreference(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function addUtilityIcons() {
  const icons = {
    disk: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18m-13 5h.01M8 15h.01M3 17h11"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3.5 7a2 2 0 0 1 2-2h5l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"/><path d="M3.5 10h17"/></svg>',
    server: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01m4-10h6m-6 10h6"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4.7 10a7.5 7.5 0 0 1 12.8-3L20 9M4 17v-5h5m10.3 2a7.5 7.5 0 0 1-12.8 3L4 15"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    power: '<svg viewBox="0 0 24 24"><path d="M12 2v10m-5-7a9 9 0 1 0 10 0"/></svg>',
    cpu: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/></svg>',
    memory: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 9v6m4-6v6m4-6v6m4-6v6"/></svg>',
    network: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.3 10.9 7.4-3.8m-7.4 6 7.4 3.8"/></svg>',
    update: '<svg viewBox="0 0 24 24"><path d="M12 16V4m-5 5 5-5 5 5M5 20h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  };

  document.querySelectorAll(".table-disk").forEach((element) => {
    element.innerHTML = icons.disk;
  });
  document.querySelectorAll(".folder-icon").forEach((element) => {
    element.innerHTML = icons.folder;
  });
  document.querySelectorAll(".settings-icon").forEach((element) => {
    element.innerHTML = element.classList.contains("blue") ? icons.network : icons.server;
  });
  document.querySelectorAll(".notice-icon").forEach((element) => {
    element.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>';
  });

  document.querySelectorAll(".text-link > span[aria-hidden=\"true\"]").forEach((element) => {
    element.innerHTML = element.textContent.includes("↗") ? icons.arrow : icons.next;
    element.classList.add("action-icon");
  });

  document.querySelectorAll(".primary-button, .secondary-button, .text-link, .danger-button").forEach((button) => {
    const firstText = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const text = firstText?.textContent.trimStart() ?? button.textContent.trim();
    const icon = text.startsWith("＋") ? icons.plus
      : text.startsWith("⏻") ? icons.power
        : text.startsWith("⟳") || button.dataset.notice?.startsWith("La détection réelle") ? icons.refresh
          : text.startsWith("Configurer le réseau") ? icons.network
            : text.startsWith("Vérifier les mises à jour") ? icons.update
              : null;
    if (!icon) return;
    if (firstText) firstText.textContent = firstText.textContent.replace(/^\s*[＋⏻⟳]\s*/, "");
    const wrapper = document.createElement("span");
    wrapper.className = "action-icon";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = icon;
    button.prepend(wrapper);
  });

  document.querySelectorAll(".system-footer .mini-dot").forEach((element, index) => {
    element.classList.add("metric-glyph");
      element.innerHTML = [icons.cpu, icons.memory, icons.network][index];
  });

  document.querySelectorAll(".activity-check").forEach((element) => {
    element.setAttribute("aria-label", language === "fr" ? "Terminé" : "Done");
  });
}

function formatCurrentDate(locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date()).toLocaleUpperCase(locale);
}

function translateTextNodes(locale) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    if (!originalText.has(node)) originalText.set(node, node.textContent);
    const source = originalText.get(node);
    const original = source.trim();
    let translated = locale === "fr" ? source.trim() : translations[locale]?.[original];
    if (locale === "en" && !translated) {
      translated = original
        .replace(/(\d),(\d)/g, "$1.$2")
        .replace(/\bTo\b/g, "TB")
        .replace(/\bMo\/s\b/g, "MB/s")
        .replace(/\bmaquette\b/gi, "prototype");
    }
    if (!translated) continue;

    const leadingWhitespace = source.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = source.match(/\s*$/)?.[0] ?? "";
    node.textContent = `${leadingWhitespace}${translated}${trailingWhitespace}`;
  }

  document.documentElement.lang = locale;
  document.title = locale === "fr"
    ? "Nexus — Tableau de bord"
    : "Nexus — Dashboard";
  document.querySelector("#current-date").textContent = formatCurrentDate(
    locale === "fr" ? "fr-FR" : "en-GB",
  );
  document.querySelector("#language-select").setAttribute(
    "aria-label",
    locale === "fr" ? "Langue" : "Language",
  );
  document.querySelector(".help-button").setAttribute(
    "aria-label",
    locale === "fr" ? "Aide" : "Help",
  );
  document.querySelector(".icon-button:not(.theme-toggle)").setAttribute(
    "aria-label",
    locale === "fr" ? "Notifications" : "Notifications",
  );
  document.querySelector(".notice-close")?.setAttribute(
    "aria-label",
    locale === "fr" ? "Masquer le message" : "Dismiss message",
  );
  document.querySelector(".sidebar").setAttribute(
    "aria-label",
    locale === "fr" ? "Navigation principale" : "Primary navigation",
  );
  document.querySelector(".brand").setAttribute(
    "aria-label",
    locale === "fr" ? "Nexus, accueil" : "Nexus, home",
  );
  document.querySelectorAll(".more-button").forEach((button) => {
    button.setAttribute("aria-label", locale === "fr" ? "Plus d’options" : "More options");
  });
  document.querySelectorAll(".activity-check").forEach((element) => {
    element.setAttribute("aria-label", locale === "fr" ? "Terminé" : "Done");
  });
  document.querySelector(".storage-summary .progress-track").setAttribute(
    "aria-label",
    locale === "fr" ? "40 % du stockage utilisé" : "40% of storage used",
  );
  document.querySelector('meta[name="description"]').content = locale === "fr"
    ? "Prototype d'interface web pour un serveur NAS personnel."
    : "Web interface prototype for a personal NAS server.";
}

function applyLanguage(nextLanguage, persist = true) {
  language = nextLanguage === "en" ? "en" : "fr";
  languageSelect.value = language;
  translateTextNodes(language);
  document.querySelectorAll("[data-notice]").forEach((button) => {
    const original = button.dataset.noticeOriginal ?? button.dataset.notice;
    button.dataset.noticeOriginal = original;
    button.dataset.notice = translations[language]?.[original] ?? original;
  });
  applyTheme(document.documentElement.dataset.theme, false);
  renderUpdateStatus();
  showPage(document.querySelector(".page-view.active")?.id.replace("page-", "") ?? "dashboard");
  if (persist && !savePreference("maisonnas-language", language)) {
    showNotice(language === "fr"
      ? "La langue est appliquée, mais le navigateur ne permet pas de mémoriser ce choix."
      : "Language applied, but the browser could not save this preference.");
  }
}

function applyTheme(theme, persist = true) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  const icon = nextTheme === "dark"
    ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M20.5 15.6A8.5 8.5 0 0 1 8.4 3.5 8.5 8.5 0 1 0 20.5 15.6Z"/></svg>';
  const label = nextTheme === "dark"
    ? (language === "fr" ? "Activer le thème clair" : "Switch to light theme")
    : (language === "fr" ? "Activer le thème sombre" : "Switch to dark theme");
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
  themeToggle.title = label;
  themeToggle.querySelector("span").innerHTML = icon;

  if (persist && !savePreference("maisonnas-theme", nextTheme)) {
    showNotice(language === "fr"
      ? "Le thème est appliqué, mais le navigateur ne permet pas de mémoriser ce choix."
      : "Theme applied, but the browser could not save this preference.");
  }
}

function showPage(page) {
  if (!pageNames.fr[page]) return;

  pageViews.forEach((view) => {
    const isCurrent = view.id === `page-${page}`;
    view.hidden = !isCurrent;
    view.classList.toggle("active", isCurrent);
  });

  navButtons.forEach((button) => {
    const isCurrent = button.dataset.page === page;
    button.classList.toggle("active", isCurrent);
    if (isCurrent) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  breadcrumbCurrent.textContent = pageNames[language][page];
  history.replaceState(null, "", `#${page}`);
}

function showNotice(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

function renderUpdateStatus() {
  if (!updateState) return;

  const messages = {
    fr: {
      checking: "Recherche de la dernière version sur GitHub…",
      available: `Une nouvelle version est disponible : ${updateState.version}.`,
      current: `Nexus est à jour (${updateState.version}).`,
      missing: "Le dépôt public est introuvable ou aucune version n’a encore été publiée.",
      invalid: "GitHub a renvoyé un numéro de version invalide. Les tags doivent suivre le format vMAJEUR.MINEUR.CORRECTIF.",
      failed: `La recherche a échoué : ${updateState.message}`,
      notes: "Voir les notes de version",
      repository: "Ouvrir le dépôt GitHub",
    },
    en: {
      checking: "Checking GitHub for the latest release…",
      available: `A new version is available: ${updateState.version}.`,
      current: `Nexus is up to date (${updateState.version}).`,
      missing: "The public repository could not be found, or no release has been published yet.",
      invalid: "GitHub returned an invalid version tag. Tags must use the vMAJOR.MINOR.PATCH format.",
      failed: `The check failed: ${updateState.message}`,
      notes: "View release notes",
      repository: "Open GitHub repository",
    },
  };
  const locale = messages[language];
  const text = document.createElement("span");
  text.textContent = locale[updateState.kind];
  updateStatus.replaceChildren(text);
  updateStatus.dataset.state = updateState.kind;
  updateStatus.hidden = false;

  if (updateState.kind === "available" || updateState.kind === "missing") {
    const link = document.createElement("a");
    link.href = updateState.kind === "available" ? `${githubRepository}/releases/latest` : githubRepository;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = updateState.kind === "available" ? locale.notes : locale.repository;
    updateStatus.append(" ", link);
  }
}

async function checkForUpdates() {
  updateButton.disabled = true;
  updateButton.setAttribute("aria-busy", "true");
  updateState = { kind: "checking" };
  renderUpdateStatus();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(githubLatestReleaseApi, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (response.status === 404) {
      updateState = { kind: "missing" };
      return;
    }
    if (!response.ok) {
      updateState = { kind: "failed", message: `HTTP ${response.status}` };
      return;
    }

    const release = await response.json();
    const latestVersion = release && typeof release.tag_name === "string"
      ? parseVersion(release.tag_name)
      : null;
    const installedVersion = parseVersion(currentVersion);
    if (!latestVersion || !installedVersion) {
      updateState = { kind: "invalid" };
      return;
    }

    updateState = {
      kind: compareVersions(latestVersion, installedVersion) > 0 ? "available" : "current",
      version: release.tag_name,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? (language === "fr" ? "délai dépassé" : "request timed out")
      : (language === "fr" ? "GitHub est inaccessible depuis ce navigateur" : "GitHub could not be reached from this browser");
    updateState = { kind: "failed", message };
  } finally {
    window.clearTimeout(timeoutId);
    updateButton.disabled = false;
    updateButton.removeAttribute("aria-busy");
    renderUpdateStatus();
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  showPage("dashboard");
});

document.querySelectorAll("[data-page-link]").forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.pageLink));
});

document.querySelectorAll("[data-notice]").forEach((button) => {
  button.dataset.noticeOriginal = button.dataset.notice;
  button.addEventListener("click", () => showNotice(button.dataset.notice));
});

updateButton.addEventListener("click", checkForUpdates);

document.querySelector(".notice-close").addEventListener("click", (event) => {
  event.currentTarget.closest(".notice-banner").remove();
});

addUtilityIcons();

languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

const savedTheme = readPreference("maisonnas-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
applyTheme(savedTheme ?? preferredTheme, false);
applyLanguage(readPreference("maisonnas-language") ?? "fr", false);

const initialPage = window.location.hash.slice(1);
showPage(pageNames.fr[initialPage] ? initialPage : "dashboard");
