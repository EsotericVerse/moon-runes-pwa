(() => {
  if (window.__LOC_NAV_CURRENT__) return;
  window.__LOC_NAV_CURRENT__ = true;

  const fileName = () => location.pathname.split('/').pop() || 'index.html';
  const baseName = path => String(path || '').split('/').pop() || 'index.html';

  const DEFAULT_HASH = Object.freeze({
    'index.html':'#top',
    'runes.html':'#beginner',
    'lots.html':'#draw',
    'statics.html':'#ranking',
    'governance.html':'#principles'
  });

  function reset(nav) {
    nav.querySelectorAll('.loc-nav-tier-link').forEach(el => {
      if (el.dataset.staticCurrent === 'true') return;
      el.removeAttribute('aria-current');
      el.removeAttribute('aria-disabled');
      if (el.tagName === 'A' && el.dataset.originalHref) el.setAttribute('href', el.dataset.originalHref);
      if (el.tagName === 'BUTTON') el.disabled = false;
    });
  }

  function activate(el) {
    if (!el) return;
    el.setAttribute('aria-current','true');
    el.setAttribute('aria-disabled','true');
    if (el.tagName === 'A') {
      if (!el.dataset.originalHref) el.dataset.originalHref = el.getAttribute('href') || '';
      el.removeAttribute('href');
    } else if (el.tagName === 'BUTTON') {
      el.disabled = true;
    }
  }

  function normalizePageLinks(nav, file) {
    if (file !== 'lots.html') return;
    nav.querySelectorAll('a.loc-nav-tier-link').forEach(a => {
      if (a.textContent.trim() !== '新手上路') return;
      a.setAttribute('href','lots.html#beginner');
      a.dataset.originalHref='lots.html#beginner';
    });
  }

  function sync() {
    const nav = document.querySelector('.loc-nav-tier[data-tier="2"]');
    if (!nav) return;

    const file = fileName();
    normalizePageLinks(nav,file);
    reset(nav);

    if (file === 'lo3rwang.html') {
      activate(nav.querySelector('[data-static-current="true"], [aria-current="true"]'));
      return;
    }

    if (file === 'context.html') {
      const allowed = new Set(['graph','nodes','relations','scenario']);
      const key = allowed.has(location.hash.slice(1)) ? location.hash.slice(1) : 'graph';
      activate(nav.querySelector(`[data-context-switch="${key}"]`));
      return;
    }

    if (file === 'evolution.html') {
      const allowed = new Set(['overview','timeline','trend','trajectory']);
      const key = allowed.has(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
      activate(nav.querySelector(`[data-view="${key}"]`));
      return;
    }

    const wantedHash = location.hash || DEFAULT_HASH[file] || '';
    nav.querySelectorAll('a.loc-nav-tier-link').forEach(a => {
      const href = a.dataset.originalHref || a.getAttribute('href');
      if (!href) return;
      const url = new URL(href, location.href);
      if (baseName(url.pathname) === file && url.hash === wantedHash) activate(a);
    });
  }

  document.addEventListener('click', event => {
    const control = event.target.closest('.loc-nav-tier[data-tier="2"] .loc-nav-tier-link');
    if (!control || control.getAttribute('aria-disabled') === 'true') return;
    if (control.matches('[data-context-switch],[data-view]')) {
      const nav = control.closest('.loc-nav-tier');
      reset(nav);
      activate(control);
    }
  });

  window.addEventListener('hashchange', sync);
  const observer = new MutationObserver(sync);
  const start = () => {
    sync();
    observer.observe(document.body,{childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();