(() => {
  if (window.__LOC_MERGED_ROUTER__) return;
  window.__LOC_MERGED_ROUTER__ = true;

  const SOURCE_BY_VIEW = Object.freeze({
    game: 'game.html',
    context: 'context.html',
    statics: 'statics.html',
    evolution: 'evolution.html',
    search: 'search.html',
    governance: 'governance.html'
  });

  const VIEW_BY_PAGE = Object.freeze({
    'game.html': 'game',
    'context.html': 'context',
    'statics.html': 'statics',
    'evolution.html': 'evolution',
    'search.html': 'search',
    'governance.html': 'governance',
    'index.html': 'home',
    'loc.html': 'home'
  });

  const hashView = () => {
    const raw = decodeURIComponent(location.hash.slice(1)).trim();
    const head = raw.split('/')[0];
    return SOURCE_BY_VIEW[head] ? head : 'home';
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function rewriteHref(raw) {
    if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:|https?:)/i.test(raw)) return raw;
    let url;
    try { url = new URL(raw, location.href); } catch { return raw; }
    const page = url.pathname.split('/').pop() || '';
    if (page === 'runes.html' || page === 'lo3rwang.html') return raw;
    const view = VIEW_BY_PAGE[page];
    if (!view) return raw;
    const suffix = url.hash ? `/${url.hash.slice(1)}` : '';
    return `loc.html#${view}${suffix}`;
  }

  function rewriteLinks(root) {
    root.querySelectorAll('a[href]').forEach(a => {
      const next = rewriteHref(a.getAttribute('href'));
      if (next) a.setAttribute('href', next);
    });
  }

  function rewriteGlobalNav() {
    const map = {
      'game.html': 'loc.html#game',
      'context.html': 'loc.html#context',
      'statics.html': 'loc.html#statics',
      'evolution.html': 'loc.html#evolution',
      'search.html': 'loc.html#search',
      'governance.html': 'loc.html#governance',
      'index.html': 'loc.html#home'
    };
    document.querySelectorAll('[data-loc-nav] a[href], .loc-nav-tiers a[href]').forEach(a => {
      const raw = a.getAttribute('href') || '';
      for (const [page, target] of Object.entries(map)) {
        if (raw === page || raw.startsWith(`${page}#`) || raw.startsWith(`${page}?`)) {
          a.setAttribute('href', target);
          break;
        }
      }
    });
    document.querySelectorAll('form.loc-global-search').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const q = form.querySelector('input[name="q"]')?.value?.trim() || '';
        location.href = `loc.html#search${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      });
    });
  }

  async function appendScript(scriptNode, sourcePage) {
    if (scriptNode.src) {
      const src = scriptNode.getAttribute('src');
      if (!src || /js\/loc-nav\.js(?:\?|$)/.test(src)) return;
      if (document.querySelector(`script[data-loc-merged-src="${CSS.escape(src)}"]`)) return;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.dataset.locMergedSrc = src;
        s.src = src;
        if (scriptNode.type) s.type = scriptNode.type;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
      return;
    }
    const code = (scriptNode.textContent || '')
      .replaceAll(sourcePage, 'loc.html')
      .replace(/location\.hash\s*===\s*['"]#([^'"]+)['"]/g, (m, h) => `location.hash === '#${h}' || location.hash === '#${VIEW_BY_PAGE[sourcePage]}/${h}'`);
    if (!code.trim()) return;
    const s = document.createElement('script');
    if (scriptNode.type) s.type = scriptNode.type;
    s.textContent = code;
    document.body.appendChild(s);
  }

  async function loadMergedView(view) {
    const sourcePage = SOURCE_BY_VIEW[view];
    if (!sourcePage) return;

    const home = document.querySelector('main.loc-page') || document.querySelector('main');
    if (home) home.hidden = true;

    let host = document.getElementById('loc-merged-view-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'loc-merged-view-host';
      (home?.parentNode || document.body).insertBefore(host, home?.nextSibling || null);
    }
    host.innerHTML = `<main class="loc-page"><section class="section"><p>載入 ${esc(view)}…</p></section></main>`;

    const response = await fetch(sourcePage, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${sourcePage}: HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sourceMain = doc.querySelector('main');
    if (!sourceMain) throw new Error(`${sourcePage}: main not found`);

    host.innerHTML = '';
    host.appendChild(document.importNode(sourceMain, true));
    rewriteLinks(host);

    const originalClass = document.body.dataset.locBaseClass || document.body.className;
    document.body.dataset.locBaseClass = originalClass;
    document.body.className = `${originalClass} ${doc.body.className || ''} loc-page-merged`.trim();

    const scripts = [...doc.querySelectorAll('script')];
    for (const script of scripts) await appendScript(script, sourcePage);

    rewriteGlobalNav();
    const sub = decodeURIComponent(location.hash.slice(1)).split('/').slice(1).join('/');
    if (sub) {
      requestAnimationFrame(() => document.getElementById(sub)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  function init() {
    if ((location.pathname.split('/').pop() || '') !== 'loc.html') return;
    rewriteLinks(document);
    rewriteGlobalNav();
    const view = hashView();
    if (view !== 'home') {
      loadMergedView(view).catch(error => {
        console.error('LOC merged view failed', error);
        const host = document.getElementById('loc-merged-view-host');
        if (host) host.innerHTML = `<main class="loc-page"><section class="section"><h1>LOC</h1><p>此功能暫時無法載入：${esc(error.message || error)}</p></section></main>`;
      });
    }
    window.addEventListener('hashchange', () => location.reload());
    setTimeout(rewriteGlobalNav, 0);
    setTimeout(rewriteGlobalNav, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();