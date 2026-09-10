(() => {
  if (typeof window.applyPublicCategoryFilter !== 'function' || typeof window.itemHasExactRune !== 'function') return;

  const original = window.applyPublicCategoryFilter;

  function algorithmLike(item) {
    const p = item?.payload || {};
    const hay = [
      item?.title,item?.summary,item?.result_id,p?.title,p?.summary,p?.retrieval_text,p?.description,
      ...(Array.isArray(p?.keywords) ? p.keywords : []),
      ...(Array.isArray(p?.tags) ? p.tags : [])
    ].filter(Boolean).join(' ');
    return /Grammar|治理解牌方式|月相交互|Reverse|反向符文演算|正向符文演算|OW3gs|雙卡|三卡|五卡|源.?轉.?合|解牌方法|判讀方法|演算法|算法/i.test(hay);
  }

  window.applyPublicCategoryFilter = function(groups, type, explicitRune = '') {
    const normalized = typeof window.normalizeRunePublicCategory === 'function'
      ? window.normalizeRunePublicCategory(type)
      : type;

    if (normalized !== 'rune_system') return original(groups, type, explicitRune);

    const base = original(groups, type, explicitRune) || {};
    const g = groups || {};
    const exact = items => (items || []).filter(item => window.itemHasExactRune(item, explicitRune));

    const algorithmKnowledge = exact((g.knowledge || []).filter(algorithmLike));
    const algorithmGovernance = exact((g.governance || []).filter(item => {
      const p = item?.payload || {};
      const related = [...(item?.related_locs || []), ...(p.related_locs || [])].map(String);
      const tags = [...(p.tags || []), ...(p.keywords || []), ...(p.runes || [])].map(String).join(' ');
      return related.includes('LOC1') || /符文|月符|rune/i.test(tags) || /RUNE[-_]/i.test(String(item?.result_id || ''));
    }));

    return {
      ...base,
      media: exact(g.media),
      governance: algorithmGovernance,
      algorithm_knowledge: algorithmKnowledge
    };
  };
})();