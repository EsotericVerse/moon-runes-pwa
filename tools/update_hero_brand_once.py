from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '<p class="loc-header-meta">LOC · Luna Codex · Language Module Framework</p>'
new = '<p class="loc-header-meta">月典（LOC, Luna Codex） · 月之符文（LunaRunes）</p>'
if old not in s:
    raise SystemExit('Hero meta marker not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
