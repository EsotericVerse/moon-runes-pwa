from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

new_intro = '月典是一套用來分析、整理、搜尋與推演語言的系統。月之符文是一套有自己獨立的語言方式。月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較與推演。'

# Hero stays newcomer-facing: only replace the short explanatory copy.
text, n = re.subn(
    r'(<p class="loc-header-copy">).*?(</p>)',
    lambda m: m.group(1) + new_intro + m.group(2),
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit('homepage hero copy not found')

# Advanced architecture belongs in the framework section, with current bilingual terminology.
framework_copy = '它們不是八個彼此獨立的產品，也不是版本先後；而是 LOC 的八個功能責任區：月之符文、脈絡、音樂、文字創作、多媒體、演算法、演算模組與推演。'
text, n = re.subn(
    r'(<section class="framework-map-section" id="framework-map".*?<p class="loc-header-copy">).*?(</p>)',
    lambda m: m.group(1) + framework_copy + m.group(2),
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit('framework copy not found')

framework_terms = 'LunaRunes · Context · Music · Literary · Multimedia · Algorithm · Module · Evolution'
text, n = re.subn(
    r'(<section class="framework-map-section" id="framework-map".*?<h3 class="loc-header-subtitle">).*?(</h3>)',
    lambda m: m.group(1) + framework_terms + m.group(2),
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit('framework subtitle not found')

# Restore Skills as a separate advanced-use section immediately before architecture.
if 'id="skills"' not in text:
    skills = '''
    <section class="section" id="skills" aria-labelledby="skills-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">AI Workflow · Skills</p>
          <h2 id="skills-title">把方法帶進自己的工作流程</h2>
        </div>
        <p>LOC GPT Skills 把 LOC 已整理出的語言治理與 Repository 治理方法，封裝成可以重複調用的 AI Skills。它們不是另一套理論，而是既有方法的可執行工作流程。</p>
      </div>
      <div class="hero-actions start-actions">
        <a class="cta primary" href="LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0</a>
        <a class="cta secondary" href="https://github.com/EsotericVerse/moon-runes-pwa/tree/main/skills/lunarunes-semantic-group-classifier">LunaRunes Semantic Group Classifier</a>
      </div>
    </section>

'''
    marker = '    <section class="framework-map-section" id="framework-map"'
    pos = text.find(marker)
    if pos == -1:
        raise SystemExit('framework section marker not found')
    text = text[:pos] + skills + text[pos:]

p.write_text(text, encoding='utf-8')

# Verify hierarchy and current terminology.
check = p.read_text(encoding='utf-8')
for token in [new_intro, 'id="skills"', 'LOC-GPT-Skills-v1.0.0-bundle.zip', 'lunarunes-semantic-group-classifier', framework_copy, framework_terms]:
    if token not in check:
        raise SystemExit(f'missing expected homepage token: {token}')
