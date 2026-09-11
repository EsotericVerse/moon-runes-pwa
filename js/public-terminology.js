(() => {
  if (window.LOCPublicTerminology) return;

  const EXACT_TEXT = new Map([
    ['State Before', '變更前狀態（State Before）'],
    ['State After', '變更後狀態（State After）'],
    ['Current', '目前（Current）'],
    ['Released', '已發布（Released）'],
    ['Archived', '已封存（Archived）'],
    ['Period Settings', '時期設定 · Period Settings'],
    ['Timeline', '時間線 · Timeline'],
    ['Trend', '趨勢 · Trend'],
    ['Trajectory', '軌跡 · Trajectory'],
    ['Graph Overview', '關係圖總覽 · Graph Overview'],
    ['Context / Node', '脈絡／節點 · Context / Node'],
    ['Cross-format Search', '跨格式搜尋 · Cross-format Search'],
    ['Structure of LOC', 'LOC 架構 · Structure of LOC'],
    ['LunaRunes · Beginner', 'LunaRunes · 新手入門 · Beginner'],
    ['LunaRunes · Beginner Guide', 'LunaRunes · 新手指南 · Beginner Guide'],
    ['LunaRunes · Reading Examples', 'LunaRunes · 解讀範例 · Reading Examples'],
    ['LunaRunes · Rune Library', 'LunaRunes · 符文資料庫 · Rune Library'],
    ['LOC · Luna Codex · Language Module Framework', 'LOC · Luna Codex · 語言系統模組框架 · Language Module Framework'],
    ['Graph', '關係圖（Graph）'],
    ['Nodes', '節點（Nodes）'],
    ['Edges', '關聯（Edges）'],
    ['Scenarios', '情境（Scenarios）']
  ]);

  const PHRASE_TEXT = [
    ['語言模型框架（Language Model Framework）', '語言系統模組框架（Language Module Framework）'],
    ['語言模型框架', '語言系統模組框架'],
    ['Language Model Framework', 'Language Module Framework'],
    ['language model framework', 'language module framework'],
    ['Language System Model', 'Language Module Framework'],
    ['language system model', 'language module framework'],
    ['語言系統模型', '語言系統模組框架'],
    ['Symbolic Language Model', 'Symbolic Language Module'],
    ['symbolic language model', 'symbolic language module'],
    ['符號式語言模型', '符號式語言模組'],
    ['符號型語言模型', '符號式語言模組'],
    ['LOC6 Methodology／方法論', 'LOC6 Algorithm／演算法'],
    ['LOC6 · Methodology', 'LOC6 · Algorithm'],
    ['LOC6 Methodology', 'LOC6 Algorithm'],
    ['LOC7 Algorithm／演算法（知識庫）', 'LOC7 Module／演算模組'],
    ['LOC7 · Algorithm', 'LOC7 · Module'],
    ['LOC7 Algorithm', 'LOC7 Module'],
    ['Search → 時期設定', '搜尋（Search）→ 時期設定'],
    ['Evolution 只讀取並進行時間分析', '推演（Evolution）只讀取並進行時間分析'],
    ['State →', '變更後狀態（State After）→']
  ];

  function normalizeString(value) {
    let next = String(value ?? '');
    for (const [from, to] of PHRASE_TEXT) {
      if (next.includes(from)) next = next.replaceAll(from, to);
    }
    return next;
  }

  function normalizeHref(element) {
    if (!element?.matches?.('a[href]')) return;
    const current = element.getAttribute('href') || '';
    let next = current;
    if (next.includes('statics.htm')) next = next.replaceAll('statics.htm', 'statics.html');
    if (next.includes('loc2-game.html')) next = next.replaceAll('loc2-game.html', 'game.html');
    if (next !== current) {
      element.setAttribute('href', next);
      element.removeAttribute('target');
      element.removeAttribute('rel');
    }
  }

  function normalizeTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (EXACT_TEXT.has(trimmed)) {
      node.nodeValue = raw.replace(trimmed, EXACT_TEXT.get(trimmed));
      return;
    }

    const next = normalizeString(raw);
    if (next !== raw) node.nodeValue = next;
  }

  function normalizeElement(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      normalizeTextNode(root);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) normalizeHref(root);
    root.querySelectorAll?.('a[href]').forEach(normalizeHref);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('script,style,code,pre')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(normalizeTextNode);
  }

  function normalizeJSON(value) {
    if (typeof value === 'string') return normalizeString(value);
    if (Array.isArray(value)) return value.map(normalizeJSON);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(key => {
        value[key] = normalizeJSON(value[key]);
      });
    }
    return value;
  }

  function normalizeMetadata() {
    document.title = normalizeString(document.title);
    document.querySelectorAll('meta[content]').forEach(meta => {
      const current = meta.getAttribute('content') || '';
      const next = normalizeString(current);
      if (next !== current) meta.setAttribute('content', next);
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      const raw = script.textContent || '';
      if (!raw.trim()) return;
      try {
        const parsed = JSON.parse(raw);
        script.textContent = JSON.stringify(normalizeJSON(parsed));
      } catch {
        const next = normalizeString(raw);
        if (next !== raw) script.textContent = next;
      }
    });
  }

  function install() {
    normalizeMetadata();
    normalizeElement(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) normalizeElement(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.LOCPublicTerminology = Object.freeze({ normalize: normalizeElement, normalizeMetadata });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
