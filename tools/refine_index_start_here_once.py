from pathlib import Path

p=Path('index.html')
html=p.read_text(encoding='utf-8')

# Ensure leaderboard remains in Hero.
hero_old='''        <div class="hero-actions">\n          <a class="cta primary" href="tutorial01.html">新手教學</a>\n          <a class="cta secondary" href="lots.html?mode=daily#daily">今日抽張牌</a>\n          <a class="cta secondary" href="#framework-map">查看架構</a>\n        </div>'''
hero_new='''        <div class="hero-actions">\n          <a class="cta primary" href="tutorial01.html">新手教學</a>\n          <a class="cta secondary" href="lots.html?mode=daily#daily">今日抽張牌</a>\n          <a class="cta secondary" href="statics.html#ranking">排行榜</a>\n          <a class="cta secondary" href="#framework-map">查看架構</a>\n        </div>'''
if hero_old in html:
    html=html.replace(hero_old,hero_new,1)
elif 'href="statics.html#ranking">排行榜</a>' not in html.split('</header>',1)[0]:
    raise SystemExit('Hero block changed unexpectedly; leaderboard not patched')

# Insert a compact novice guidance section after hero if it is not present.
marker='id="start-guide"'
if marker not in html:
    anchor='''    </header>\n\n<section class="section" id="rune-entry"'''
    guide='''    </header>\n\n    <section class="section start-guide" id="start-guide" aria-labelledby="start-guide-title">\n      <div class="section-heading">\n        <div>\n          <p class="eyebrow">Start Here</p>\n          <h2 id="start-guide-title">第一次來，可以照這個順序開始</h2>\n        </div>\n        <p>這裡不是再放一次首頁入口，而是給第一次接觸 LOC 的使用順序：先理解，再試用，再往資料與架構深入。</p>\n      </div>\n      <div class="evolution-proof start-guide-steps" aria-label="新手使用順序">\n        <div class="evolution-proof-item">\n          <small class="text-category">01 · Learn</small>\n          <strong class="text-title">先看新手教學</strong>\n          <span class="text-content">先知道 LOC 在做什麼，以及月之符文如何作為語言入口，不需要先學完整理論。</span>\n          <div class="hero-actions"><a class="cta primary" href="tutorial01.html">新手教學</a></div>\n        </div>\n        <div class="evolution-proof-item">\n          <small class="text-category">02 · Try</small>\n          <strong class="text-title">再抽一張每日符文</strong>\n          <span class="text-content">先實際使用一次，再決定要不要深入單卡、多卡與符文資料。</span>\n          <div class="hero-actions"><a class="cta secondary" href="lots.html?mode=daily#daily">每日符文</a></div>\n        </div>\n        <div class="evolution-proof-item">\n          <small class="text-category">03 · Explore</small>\n          <strong class="text-title">接著查月之符文資料</strong>\n          <span class="text-content">需要確認符文定義、分類與卡片資料時，再進入月之符文資料頁。</span>\n          <div class="hero-actions"><a class="cta secondary" href="runes.html">月之符文</a></div>\n        </div>\n        <div class="evolution-proof-item">\n          <small class="text-category">04 · Understand</small>\n          <strong class="text-title">最後看 LOC 整體架構</strong>\n          <span class="text-content">理解符文、脈絡、作品、演算法與推演如何串成同一套系統。</span>\n          <div class="hero-actions"><a class="cta secondary" href="#framework-map">LOC架構圖</a></div>\n        </div>\n      </div>\n    </section>\n\n<section class="section" id="rune-entry"'''
    if anchor not in html:
        raise SystemExit('Hero→rune-entry anchor not found')
    html=html.replace(anchor,guide,1)

p.write_text(html,encoding='utf-8')
print('refined homepage Start Here and preserved leaderboard')
