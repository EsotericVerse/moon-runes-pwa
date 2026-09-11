from pathlib import Path
import re

p = Path('index.html')
html = p.read_text(encoding='utf-8')

old_actions = '''        <div class="hero-actions">\n          <a class="cta primary" href="lots.html?mode=daily#daily">今日抽張牌</a>\n          <a class="cta secondary" href="#rune-entry">開始問個事</a>\n          <a class="cta secondary" href="statics.html#ranking">排行榜</a>\n          <a class="cta secondary" href="#framework-image-title">查看架構</a>          \n        </div>'''
new_actions = '''        <div class="hero-actions">\n          <a class="cta primary" href="tutorial01.html">新手教學</a>\n          <a class="cta secondary" href="lots.html?mode=daily#daily">今日抽張牌</a>\n          <a class="cta secondary" href="#framework-map">查看架構</a>\n        </div>'''
if old_actions not in html:
    raise SystemExit('hero actions block not found; aborting')
html = html.replace(old_actions, new_actions, 1)

start_re = re.compile(
    r'\n\s*<section class="section" aria-labelledby="start-title">.*?</section>\n\s*\n(?=<section class="section" id="rune-entry")',
    re.S,
)
html, count = start_re.subn('\n\n', html, count=1)
if count != 1:
    raise SystemExit(f'expected one Start Here section, removed {count}')

p.write_text(html, encoding='utf-8')
print('Homepage entry hierarchy simplified: removed duplicate Start Here and reduced hero CTAs.')
