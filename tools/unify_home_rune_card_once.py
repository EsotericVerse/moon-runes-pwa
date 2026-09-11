from pathlib import Path
import re

# One-shot migration: homepage rune sample must use the shared LunaRunes card renderer.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

new = '''          <div class="card-attributes rune-result-card" id="attributes">
            <div class="rune-result-name" data-rune-name="玄">玄</div>
            <div class="rune-result-grid">
              <div class="rune-result-field">
                <span class="rune-result-label">卡片位向：</span>
                <span class="rune-result-value">正位</span>
              </div>
            </div>
            <a class="rune-data-cta" href="lots.html#library">
              <span>
                <strong>查看完整月之符文資料</strong>
                <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          </div>'''

pat = re.compile(r'          <div class="card-attributes" id="attributes">.*?          </div>', re.S)
index, n = pat.subn(new, index, count=1)
if n != 1:
    raise SystemExit(f'homepage rune attributes container replacement count={n}')

script_anchor = '  <script src="js/main.js"></script>'
module_tag = '  <script type="module" src="js/rune.js"></script>'
if module_tag not in index:
    if script_anchor not in index:
        raise SystemExit('main.js script anchor not found')
    index = index.replace(script_anchor, script_anchor + '\n' + module_tag, 1)

index_path.write_text(index, encoding='utf-8')

main_path = Path('js/main.js')
main = main_path.read_text(encoding='utf-8')
main = re.sub(
    r'window\.addEventListener\("DOMContentLoaded", \(\) => \{\n  const card = document\.getElementById\("rune-card"\);\n  const moonText = document\.getElementById\("moon-phase-index"\);\n\n  if \(moonText\) \{.*?\n  \}\n\n  if \(card\) \{',
    'window.addEventListener("DOMContentLoaded", () => {\n  const card = document.getElementById("rune-card");\n  if (card) {',
    main,
    count=1,
    flags=re.S
)
if 'moonText' in main or 'moon-phase-index' in main:
    raise SystemExit('legacy homepage moon text logic remains in main.js')
main_path.write_text(main, encoding='utf-8')

check = index_path.read_text(encoding='utf-8')
for required in ['rune-result-card','rune-result-name','rune-result-grid','data-rune-name="玄"','js/rune.js']:
    if required not in check:
        raise SystemExit(f'missing homepage rune contract: {required}')
if 'moon-phase-index' in check:
    raise SystemExit('legacy homepage moon phase node remains')
