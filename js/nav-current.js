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
    'governance.html':'#principles',
    'lo3rwang.html':'#author-intro'
  });

  const AUTHOR_SECTIONS = Object.freeze([
    {label:'介紹', match:'他主要在做什麼', id:'author-intro'},
    {label:'主要身份', match:'主要身份', id:'author-identity'},
    {label:'工作與合作', match:'工作與合作方向', id:'author-work'},
    {label:'作者自述', match:'作者自述', id:'author-self'},
    {label:'LOC月典', match:'LOC／月典', id:'author-loc'}
  ]);

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
    document.querySelectorAll('.loc-nav3 a[href="lots.html#draw-help"]').forEach(a => {
      a.setAttribute('href','lots.html#beginner');
      a.dataset.originalHref='lots.html#beginner';
    });
  }

  function ensureAuthorNav(nav, file) {
    if (file !== 'lo3rwang.html' || nav.dataset.authorNavReady === 'true') return;
    const inner = nav.querySelector('.loc-nav-tier-inner');
    if (!inner) return;
    const headings = [...document.querySelectorAll('main article h2')];
    const links = AUTHOR_SECTIONS.map(item => {
      const heading = headings.find(h => h.textContent.trim().includes(item.match));
      if (!heading) return null;
      if (!heading.id) heading.id = item.id;
      const a = document.createElement('a');
      a.className = 'loc-nav-tier-link';
      a.href = `#${heading.id}`;
      a.textContent = item.label;
      return a;
    }).filter(Boolean);
    if (!links.length) return;
    inner.replaceChildren(...links);
    nav.dataset.authorNavReady = 'true';
  }

  function sync() {
    const nav = document.querySelector('.loc-nav-tier[data-tier="2"]');
    if (!nav) return;

    const file = fileName();
    normalizePageLinks(nav,file);
    ensureAuthorNav(nav,file);
    reset(nav);

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