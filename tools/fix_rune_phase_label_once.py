from pathlib import Path

p = Path('js/rune.js')
s = p.read_text(encoding='utf-8')
old = '''  function cardPhase(rune){\n    const raw=valueOf(rune,'月相','moon_phase');\n    return phaseCategory(raw) === '未知' ? '空亡' : phaseCategory(raw);\n  }'''
new = '''  function cardPhase(rune){\n    const raw=valueOf(rune,'月相','moon_phase');\n    if(raw === '無') return '無';\n    if(PHASES.has(raw)) return raw;\n    return raw || '未知';\n  }'''
if old not in s:
    raise SystemExit('cardPhase block not found')
s = s.replace(old, new, 1)
# Keep phaseCategory for classification/current moon phase only.
if "if(raw === '無') return '無';" not in s:
    raise SystemExit('raw 無 display rule missing')
p.write_text(s, encoding='utf-8')
