from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
needle = '<a class="cta secondary" href="statics.html#ranking">查看關鍵字排行</a>'
insert = needle + '\n          <a class="cta secondary" href="#framework-image-title">查看架構</a>'
if '<a class="cta secondary" href="#framework-image-title">查看架構</a>' not in s:
    if needle not in s:
        raise SystemExit('Hero action anchor not found')
    s = s.replace(needle, insert, 1)
p.write_text(s, encoding='utf-8')
