/* Runtime projection of data/json/registries/LOC_NAV.json.
   The JSON Current Canon is authoritative; this file only composes pages from it. */
(() => {
  const CANON_URL = 'data/json/registries/LOC_NAV.json';
  const pageName = () => location.pathname.split('/').pop() || 'index.html';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function composePage(canon) {
    const composition = canon.page_composition?.[pageName()];
    if (!composition) throw new Error(`Page is not registered in Current Canon: ${pageName()}`);
    document.documentElement.dataset.locScope = composition.scope;
    document.documentElement.dataset.locTemplate = composition.template;
    document.documentElement.dataset.locFeature = composition.feature;
    if (composition.governance_scope) document.documentElement.dataset.locGovernanceScope = composition.governance_scope;
    return composition;
  }

  function renderNav(canon, composition) {
    const navigation = canon.navigation || {};
    const search = navigation.search || {};
    document.querySelectorAll('[data-loc-nav]').forEach(node => {
      const links = (navigation.items || []).map(item => item.scope === composition.scope
        ? `<span class="loc-global-link loc-global-current" aria-current="page">${escape(item.label)}</span>`
        : `<a class="loc-global-link" href="${escape(item.href)}">${escape(item.label)}</a>`
      ).join('');
      node.innerHTML = `<div class="loc-global-links">${links}</div><form class="loc-global-search" action="${escape(search.action || 'search.html')}" method="get" role="search"><input name="${escape(search.parameter || 'q')}" type="search" aria-label="${escape(search.label || '搜尋')}" placeholder="${escape(search.placeholder || '輸入文字')}"/><button class="loc-global-search-submit" type="submit">${escape(search.label || '搜尋')}</button></form>`;
    });
  }

  function loadPageProjection() {
    if (pageName() !== 'index.html' || document.querySelector('script[data-home-canonical]')) return;
    const script = document.createElement('script');
    script.src = 'js/home-canonical.js';
    script.defer = true;
    script.dataset.homeCanonical = 'true';
    document.body.appendChild(script);
  }

  async function mount() {
    try {
      const response = await fetch(CANON_URL, {cache:'no-store'});
      if (!response.ok) throw new Error(`Current Canon unavailable (${response.status})`);
      const canon = await response.json();
      if (canon.status !== 'canonical' || canon.registry !== 'LOC_CURRENT_CANON') throw new Error('Invalid Current Canon');
      renderNav(canon, composePage(canon));
      loadPageProjection();
    } catch (error) {
      console.error('LOC Current Canon navigation was not mounted:', error);
      document.documentElement.dataset.locCanonError = 'true';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
