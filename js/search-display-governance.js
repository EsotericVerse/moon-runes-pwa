(() => {
  if (window.__LOC_SEARCH_DISPLAY_GOVERNANCE__) return;
  window.__LOC_SEARCH_DISPLAY_GOVERNANCE__ = true;

  const EXACT = new Map([
    ['方法論','演算法'],
    ['演算法（知識庫）','演算模組'],
    ['LOC6 · 方法論','LOC6 · 演算法'],
    ['LOC7 · 演算法（知識庫）','LOC7 · 演算模組']
  ]);
  const PHRASES = [
    ['方法論 · 符文演算','演算法 · 符文演算'],
    ['演算法（知識庫） · 符文演算','演算模組 · 符文演算'],
    ['方法論分類','演算法／治理分類']
  ];

  function normalizeText(node){
    if(!node || node.nodeType!==Node.TEXT_NODE) return;
    const raw=node.nodeValue||'';
    const trimmed=raw.trim();
    if(!trimmed) return;
    if(EXACT.has(trimmed)){
      node.nodeValue=raw.replace(trimmed,EXACT.get(trimmed));
      return;
    }
    let next=raw;
    for(const [from,to] of PHRASES) if(next.includes(from)) next=next.replaceAll(from,to);
    if(next!==raw) node.nodeValue=next;
  }

  function normalize(root=document.body){
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){ normalizeText(root); return; }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent || parent.closest('script,style,code,pre')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(normalizeText);
  }

  function start(){
    normalize(document.body);
    new MutationObserver(records=>{
      for(const record of records) for(const node of record.addedNodes) normalize(node);
    }).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
