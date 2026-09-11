from pathlib import Path

ROOT=Path('.')
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')

# statics.html: add rune keyword ranking and shared analytics runtime.
p='statics.html'; s=read(p)
old='<section id="ranking"><h2>排行榜</h2><div class="card"><p>跨時期關鍵字排行榜集中於此；可切換文字／Threads 與音樂／LOC3。</p><div id="rankingDashboard" class="stats-dashboard">載入排行榜…</div></div></section>'
new='''<section id="ranking"><h2>排行榜</h2><div class="card"><p>跨時期關鍵字排行榜集中於此；可切換文字／Threads 與音樂／LOC3。</p><div id="rankingDashboard" class="stats-dashboard">載入排行榜…</div></div><div class="card" style="margin-top:16px"><h3>符文關鍵詞排行榜 · No API</h3><p>直接統計現有 runes.json 的正向／反向關鍵詞關聯，不重掃文章、不產生新關鍵詞。</p><div id="runeKeywordRanking" class="stats-dashboard">載入符文關鍵詞排行榜…</div></div></section>'''
if old in s: s=s.replace(old,new,1)
assert 'id="runeKeywordRanking"' in s
if 'js/rune-analytics.js' not in s:
    s=s.replace('<script src="js/statics-dashboard.js" defer></script>','<script src="js/rune-analytics.js" defer></script>\n<script src="js/statics-dashboard.js" defer></script>',1)
write(p,s)

# evolution.html: add rune-derived fallback/parallel panels to every major view.
p='evolution.html'; s=read(p)
if 'id="runeEvolutionOverview"' not in s:
    marker='<div class="source-note">時期定義由 Search → 時期設定統一管理；Evolution 只讀取並進行時間分析。</div>'
    insert='''<section class="card" style="margin-top:16px"><h3>符文資料歷程 · No API</h3><p>目前先用現有 LunaRunes Canon 填入推演基底；直接讀取 runes.json，不呼叫外部 API。</p><div id="runeEvolutionOverview" class="stats-dashboard">載入符文歷程摘要…</div></section>'''
    assert marker in s
    s=s.replace(marker,marker+'\n  '+insert,1)
if 'id="runeEvolutionTimeline"' not in s:
    marker='<div class="event-list" id="timelineEventList"><div class="empty">載入事件…</div></div>'
    insert='''<section class="card" style="margin-top:18px"><h3>符文結構時間線 · No API</h3><p>依現有符文編號與唯一群組呈現結構序列；這是符文資料歷程，不虛構真實日期。</p><div class="event-list" id="runeEvolutionTimeline"><div class="empty">載入符文結構時間線…</div></div></section>'''
    assert marker in s
    s=s.replace(marker,marker+'\n  '+insert,1)
if 'id="runeTrendGrid"' not in s:
    marker='<div class="source-note">資料來源：LOC3_PERIOD_KEYWORD_ANALYSIS.json + LOC6_PERIOD_KEYWORD_ANALYSIS.json（靜態）</div>'
    insert='''<section class="card" style="margin-top:16px"><h3>符文關鍵詞趨勢 · No API</h3><p>按唯一群組比較現有正向／反向關鍵詞數與語意分布。</p><div class="keyword-grid" id="runeTrendGrid"><div class="empty">載入符文趨勢…</div></div></section>'''
    assert marker in s
    s=s.replace(marker,marker+'\n  '+insert,1)
if 'id="runeTrajectoryList"' not in s:
    marker='<div class="source-note">資料來源：時期資料＋音樂／方法論時期分析；只呈現現有資料可支持的變化。</div>'
    insert='''<section class="card" style="margin-top:16px"><h3>符文群組軌跡 · No API</h3><p>以現有 1–66 編號順序與唯一群組，呈現群組之間的結構轉換；不把序列誤當成真實時間。</p><div class="trajectory-list" id="runeTrajectoryList"><div class="empty">載入符文群組軌跡…</div></div></section>'''
    assert marker in s
    s=s.replace(marker,marker+'\n  '+insert,1)
if 'js/rune-analytics.js' not in s:
    s=s.replace('<script src="js/loc-nav.js"></script>','<script src="js/rune-analytics.js" defer></script>\n<script src="js/loc-nav.js"></script>',1)
write(p,s)

# Validate architecture and No API wording.
for page in ['statics.html','evolution.html']:
    h=read(page)
    assert h.count('js/rune-analytics.js')==1, page
assert 'id="runeKeywordRanking"' in read('statics.html')
for ident in ['runeEvolutionOverview','runeEvolutionTimeline','runeTrendGrid','runeTrajectoryList']:
    assert f'id="{ident}"' in read('evolution.html'), ident
js=read('js/rune-analytics.js')
assert 'data/json/core/runes.json' in js
assert 'LOC4_TEXT_CORPUS' not in js
assert 'fetch(' in js
print('RC3 rune data pipeline integration ready')
