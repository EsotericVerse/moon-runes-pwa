from pathlib import Path

ROOT=Path('.')

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')

widget='''\n<section class="context-tool-card" id="runeSemanticGraph">\n  <div class="context-item-head"><div>\n    <h2>符文脈絡 Graph</h2>\n    <p>直接由現有 LunaRunes 資料建立：關鍵詞／反向關鍵詞 → 符文 → 唯一群組，並納入既有額外規則與 ownership。No API，不建立第二套 Canon。</p>\n  </div></div>\n  <form class="context-graph-toolbar">\n    <label>搜尋<input id="runeGraphQuery" placeholder="例如：光明、清晰、暴躁、光、元素"></label>\n    <button class="context-btn primary" type="submit">搜尋符文脈絡</button>\n  </form>\n  <div class="context-graph-status" id="runeGraphStatus">正在建立符文 Graph…</div>\n  <div class="context-graph-filter">\n    <select id="runeGraphGroup"><option value="">全部群組</option></select>\n    <select id="runeGraphEdgeType"><option value="">全部關係</option></select>\n    <button class="context-btn ghost" type="button" id="runeGraphReset">清除篩選</button>\n  </div>\n  <div class="context-graph-layout">\n    <div class="context-graph-panel"><h3>Nodes</h3><div class="context-list" id="runeGraphNodes"><div class="context-empty">正在載入符文節點…</div></div></div>\n    <div class="context-graph-panel"><h3>Edges</h3><div class="context-list" id="runeGraphEdges"><div class="context-empty">正在載入符文關係…</div></div></div>\n  </div>\n  <p class="context-graph-status">分類治理：未判定語意初始為「特殊」；正式分類依詞類／句內語意角色 → 群組主體性 → 唯一群組 → 個別符文 → 正反面／衝突校準。</p>\n</section>\n'''

# runes.html: add graph card inside reference view before basic documents.
p='runes.html'; s=read(p)
if 'id="runeSemanticGraph"' not in s:
    marker='''        <section class="rune-basics">\n          <h2>基本文件</h2>'''
    assert marker in s, 'runes marker missing'
    s=s.replace(marker, widget+'\n'+marker,1)
# Add explicit graph quick entry beside other knowledge actions if not present.
needle='''<a class="draw-mode-card" href="tutorial02.html"><strong>完整新手教學</strong><span>LOC Tutorial 02。</span></a>'''
if 'href="runes.html#graph"' not in s and needle in s:
    s=s.replace(needle, needle+'\n            <a class="draw-mode-card" href="runes.html#graph"><strong>符文脈絡 Graph</strong><span>查看關鍵詞、符文與群組的現有關係。</span></a>',1)
# Load shared runtime once.
if 'js/rune-context-graph.js' not in s:
    s=s.replace('<script src="js/loc-nav.js"></script>', '<script src="js/loc-nav.js"></script>\n  <script src="js/rune-context-graph.js" defer></script>',1)
# Support #graph by switching reference view and scrolling graph.
old="""  const hash=location.hash.slice(1);\n  switchView(views[hash]?hash:'reference',false);"""
new="""  const hash=location.hash.slice(1);\n  switchView(views[hash]?hash:'reference',false);\n  if(hash==='graph') requestAnimationFrame(()=>document.getElementById('runeSemanticGraph')?.scrollIntoView({block:'start'}));"""
if old in s: s=s.replace(old,new,1)
write(p,s)

# context.html: replace the empty/general graph explorer card at top with the same rune graph.
p='context.html'; s=read(p)
start=s.find('<section class="context-tool-card">', s.find('id="context-entry"'))
end=s.find('</section>', start)
assert start!=-1 and end!=-1, 'context graph card missing'
end+=len('</section>')
# Only replace if current top card is legacy Graph explorer, not already rune graph.
chunk=s[start:end]
if 'id="runeSemanticGraph"' not in chunk:
    assert '關係圖探索器' in chunk, 'unexpected context first card'
    s=s[:start]+widget+s[end:]
if 'js/rune-context-graph.js' not in s:
    # Insert before closing body, preserving existing scripts.
    s=s.replace('</body>', '<script src="js/rune-context-graph.js" defer></script>\n</body>',1)
write(p,s)

# loc-nav: add Rune Graph link to LunaRunes Tier 2; context Graph remains the same top-level switch.
p='js/loc-nav.js'; s=read(p)
old='''      link("66 符資料","lots.html#library"),\n      link("符文統計","statics.html#runes"),\n      link("符文知識庫","runes.html#reference")'''
new='''      link("66 符資料","lots.html#library"),\n      link("符文脈絡","runes.html#graph"),\n      link("符文統計","statics.html#runes"),\n      link("符文知識庫","runes.html#reference")'''
if old in s and 'link("符文脈絡","runes.html#graph")' not in s:
    s=s.replace(old,new,1)
write(p,s)

# Assertions: no corpus scanning; shared runtime on both pages; graph populated from runes only.
js=read('js/rune-context-graph.js')
assert "data/json/core/runes.json" in js
assert 'LOC4_TEXT_CORPUS' not in js and 'CORPUS_MANIFEST' not in js
assert "正向關鍵詞" in js and "反向關鍵詞" in js and "額外規則" in js
assert "belongs_to_group" in js and "keyword_of" in js and "reverse_keyword_of" in js and "ownership" in js
for page in ['runes.html','context.html']:
    h=read(page)
    assert h.count('id="runeSemanticGraph"')==1, page
    assert h.count('js/rune-context-graph.js')==1, page
print('RC3 Rune Graph integration ready')
