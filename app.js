const pageNames = {
  fr: { dashboard: 'Vue d’ensemble', storage: 'Stockage', shares: 'Partages réseau', users: 'Utilisateurs', files: 'Fichiers', settings: 'Paramètres' },
  en: { dashboard: 'Overview', storage: 'Storage', shares: 'Network shares', users: 'Users', files: 'Files', settings: 'Settings' },
};
const navButtons = document.querySelectorAll('[data-page]');
const pageViews = document.querySelectorAll('.page-view');
const breadcrumbCurrent = document.querySelector('#breadcrumb-current');
const toast = document.querySelector('.toast');
const languageSelect = document.querySelector('#language-select');
const themeToggle = document.querySelector('.theme-toggle');
let language = 'fr', toastTimer;
function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function showNotice(message) {
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
}
function showPage(page) {
  if (!pageNames.fr[page]) return;
  pageViews.forEach(view => { const active = view.id === `page-${page}`; view.hidden = !active; view.classList.toggle('active', active); });
  navButtons.forEach(button => { const active = button.dataset.page === page; button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  breadcrumbCurrent.textContent = pageNames[language][page];
  history.replaceState(null, '', `#${page}`);
}
function applyTheme(theme, persist = true) {
  const next = theme === 'dark' ? 'dark' : 'light'; document.documentElement.dataset.theme = next;
  const label = next === 'dark' ? (language === 'fr' ? 'Activer le thème clair' : 'Use light theme') : (language === 'fr' ? 'Activer le thème sombre' : 'Use dark theme');
  themeToggle.setAttribute('aria-label', label); themeToggle.title = label;
  themeToggle.querySelector('span').innerHTML = next === 'dark'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.6A8.5 8.5 0 0 1 8.4 3.5 8.5 8.5 0 1 0 20.5 15.6Z"/></svg>';
  if (persist) savePreference('maisonnas-theme', next);
}
function applyLanguage(locale) {
  language = locale === 'en' ? 'en' : 'fr'; document.documentElement.lang = language; languageSelect.value = language;
  navButtons.forEach(button => { const label = button.querySelector('span:last-child'); if (label) label.textContent = pageNames[language][button.dataset.page]; });
  applyTheme(document.documentElement.dataset.theme, false);
  showPage(document.querySelector('.page-view.active')?.id.replace('page-', '') || 'dashboard');
  savePreference('maisonnas-language', language);
}
navButtons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); showPage('dashboard'); });
languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
applyTheme(readPreference('maisonnas-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
applyLanguage(readPreference('maisonnas-language') || 'fr');
showPage(pageNames.fr[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard');
