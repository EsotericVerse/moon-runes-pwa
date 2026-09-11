from pathlib import Path

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

old = '''          <div class="card-attributes" id="attributes">
            <p>卡牌面向：正位</p>
            <p>介紹：「玄」，月之符文所揭示</p>
            <p>所屬分組：特殊</p>
            <p id="moon-phase-index">月相：無 / 真實月相：計算中...</p>
            <a class="rune-data-cta" href="lots.html#library">
              <span>
                <strong>查看完整月之符文資料</strong>
                <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          </div>'''
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
if old not in index:
    raise SystemExit('homepage rune attributes block not found')
index = index.replace(old, new, 1)

script_anchor = '  <script src="js/main.js"></script>'
module_tag = '  <script type="module" src="js/rune.js"></script>'
if module_tag not in index:
    if script_anchor not in index:
        raise SystemExit('main.js script anchor not found')
    index = index.replace(script_anchor, script_anchor + '\n' + module_tag, 1)

index_path.write_text(index, encoding='utf-8')

main_path = Path('js/main.js')
main = main_path.read_text(encoding='utf-8')
old_main = '''window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) {
    const cardPhase = moonText.dataset.cardPhase || "無";
    moonText.textContent = `月相：${cardPhase} / 真實月相：${realPhase}`;
  }

  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "lots.html#draw";
    });
  }
});'''
new_main = '''window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "lots.html#draw";
    });
  }
});'''
if old_main not in main:
    raise SystemExit('legacy homepage moon text block not found')
main = main.replace(old_main, new_main, 1)
main_path.write_text(main, encoding='utf-8')

# Contract checks.
check = index_path.read_text(encoding='utf-8')
for required in ['rune-result-card','rune-result-name','rune-result-grid','data-rune-name="玄"','js/rune.js']:
    if required not in check:
        raise SystemExit(f'missing homepage rune contract: {required}')
if 'moon-phase-index' in check:
    raise SystemExit('legacy homepage moon phase node remains')
