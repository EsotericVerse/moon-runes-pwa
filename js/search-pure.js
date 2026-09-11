(() => {
  if (window.__LOC_SEARCH_PURE__) return;
  window.__LOC_SEARCH_PURE__ = true;

  const HASH_REDIRECTS = {
    '#ranking':'statics.html#ranking',
    '#rankingView':'statics.html#ranking',
    '#sources':'statics.html#sources',
    '#sourcesView':'statics.html#sources',
    '#era':'evolution.html#overview',
    '#eraView':'evolution.html#overview'
  };

  function redirectLegacyHash(){
    const target = HASH_REDIRECTS[location.hash];
    if (target) location.replace(target);
  }

  function prune(){
    const query = document.getElementById('queryView');
    if (query) query.hidden = false;

    ['eraView','rankingView','sourcesView'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('[data-search-view]').forEach(node => node.remove());
    document.querySelectorAll('.source-stats,#sourceStatsBody,#searchRankingList,#searchRankingScope,#searchRankingSourceTabs').forEach(node => node.remove());

    const title = document.querySelector('#queryView .loc-header-title,.search-view#queryView h1');
    if (title && /多元搜尋|搜尋/.test(title.textContent || '')) title.textContent = '搜尋';
  }

  function start(){
    redirectLegacyHash();
    prune();
    const observer = new MutationObserver(prune);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
