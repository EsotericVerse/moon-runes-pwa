(() => {
  if (window.LOCPublicTerminology) return;

  const EXACT_TEXT = new Map([
    ['State Before', '變更前狀態（State Before）'],
    ['State After', '變更後狀態（State After）'],
    ['Current', '目前（Current）'],
    ['Released', '已發布（Released）'],
    ['Archived', '已封存（Archived）'],
    ['Period Settings', '時期設定（Period Settings）'],
    ['Timeline', '時間線（Timeline）'],
    ['Trend', '趨勢（Trend）'],
    ['Trajectory', '軌跡（Trajectory）'],
    ['Graph', '關係圖（Graph）'],
    ['Nodes', '節點（Nodes）'],
    ['Edges', '關聯（Edges）'],
    ['Scenarios', '情境（Scenarios）'],
    ['Principles', '原則（Principles）'],
    ['Copyright', '版權（Copyright）'],
    ['Philosophy', '理念（Philosophy）'],
    ['Documents', '文件（Documents）'],
    ['Ranking', '排行榜（Ranking）'],
    ['Sources', '來源（Sources）'],
    ['Import', '匯入（Import）']
  ]);

  const PHRASE_TEXT = [
    ['Search → 時期設定', '搜尋（Search）→ 時期設定'],
    ['Evolution 只讀取並進行時間分析', '推演（Evolution）只讀取並進行時間分析'],
    ['State →', '變更後狀態（State After）→']
  ];

  function normalizeTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (EXACT_TEXT.has(trimmed)) {
      node.nodeValue = raw.replace(trimmed, EXACT_TEXT.get(trimmed));
      return;
    }

    let next = raw;
    for (const [from, to] of PHRASE_TEXT) {
      if (next.includes(from)) next = next.replaceAll(from, to);
    }
    if (next !== raw) node.nodeValue = next;
  }

  function normalizeElement(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      normalizeTextNode(root);
      return;
    }

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

  function install() {
    normalizeElement(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) normalizeElement(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.LOCPublicTerminology = Object.freeze({ normalize: normalizeElement });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
