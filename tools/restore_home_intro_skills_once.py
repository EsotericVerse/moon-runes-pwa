from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

new_intro = '月典是一套用來分析、整理、搜尋與推演語言的系統。月之符文是一套有自己獨立的語言方式。月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較與推演。'

# Replace only the homepage hero copy, preserving the concise newcomer-facing subtitle.
text, n = re.subn(
    r'(<p class="loc-header-copy">).*?(</p>)',
    lambda m: m.group(1) + new_intro + m.group(2),
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit('homepage hero copy not found')

# Restore the historical Skills explanation as static HTML rather than JS mutation.
if 'id="loc-skills-note"' not in text:
    skills = '''\n      <div id="loc-skills-note" class="loc-guidance-note">\n        <strong>LOC GPT Skills</strong>\n        <p>LOC GPT Skills 把 LOC 已整理出的語言治理與 Repository 治理方法，封裝成可以重複調用的 AI Skills。想把這套方法帶進自己的 AI 工作流程，可以直接下載使用；它們是既有方法的可執行工作流程，不是另外一套理論。</p>\n        <p><a href="LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0 →</a><br><a href="https://github.com/EsotericVerse/moon-runes-pwa/tree/main/skills/lunarunes-semantic-group-classifier">查看 LunaRunes Semantic Group Classifier Skill →</a></p>\n      </div>\n'''
    # Put Skills before the author-specific prose at the end of the About section.
    marker = '<div class="loc-guidance-note author-words">'
    pos = text.find(marker)
    if pos == -1:
        raise SystemExit('author words block not found')
    text = text[:pos] + skills + text[pos:]

p.write_text(text, encoding='utf-8')

# Verify exact requested intro and restored Skills entry.
check = p.read_text(encoding='utf-8')
for token in [new_intro, 'id="loc-skills-note"', 'LOC-GPT-Skills-v1.0.0-bundle.zip', 'lunarunes-semantic-group-classifier']:
    if token not in check:
        raise SystemExit(f'missing expected homepage token: {token}')
