(() => {
  const storageKey = 'derin-numeroloji-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  let choice;
  try { choice = localStorage.getItem(storageKey); } catch {}

  function apply() {
    const dark = choice === 'dark' || (choice !== 'light' && system.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç';
    });
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(storageKey, choice); } catch {}
    apply();
  });
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    choice = event.newValue;
    apply();
  });
})();
