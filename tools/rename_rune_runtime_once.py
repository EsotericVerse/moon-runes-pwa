from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
old_group = ROOT / 'data/json/core/runes66groups.json'
new_group = ROOT / 'data/json/core/runesgroup.json'
loader = ROOT / 'js/runes66.js'

if not old_group.is_file():
    raise SystemExit('missing data/json/core/runes66groups.json')
if new_group.exists():
    raise SystemExit('data/json/core/runesgroup.json already exists')
if not loader.is_file():
    raise SystemExit('missing js/runes66.js')

# Rename group metadata without changing bytes.
new_group.write_bytes(old_group.read_bytes())
old_group.unlink()

# Keep js/runes66.js as the 66-rune runtime loader, but align its content with canonical runes.json.
text = loader.read_text(encoding='utf-8')
text = text.replace('/* LunaRunes66 runtime dataset.', '/* LunaRunes 66-rune runtime loader.')
text = text.replace('data/json/core/runes66groups.json', 'data/json/core/runesgroup.json')
text = text.replace("../data/json/core/runes66groups.json", "../data/json/core/runesgroup.json")
loader.write_text(text, encoding='utf-8')

# Update all active group metadata references. Do not rename js/runes66.js.
replacements = {
    'js/rune.js': [('data/json/core/runes66groups.json', 'data/json/core/runesgroup.json')],
    'service-worker.js': [('/data/json/core/runes66groups.json', '/data/json/core/runesgroup.json')],
}
for rel, pairs in replacements.items():
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    for old, new in pairs:
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')

# Cache bump so clients stop requesting the retired group filename.
sw = ROOT / 'service-worker.js'
text = sw.read_text(encoding='utf-8')
import re
m = re.search(r'moon-runes-pwa-v(\d+)', text)
if m:
    n = int(m.group(1)) + 1
    text = text[:m.start()] + f'moon-runes-pwa-v{n}' + text[m.end():]
sw.write_text(text, encoding='utf-8')

# Repository governance: new group file required; old group name forbidden/stale.
validator = ROOT / 'card_api/scripts/validate_repo_layout.py'
text = validator.read_text(encoding='utf-8')
if 'ROOT / "data" / "json" / "core" / "runes66groups.json"' not in text:
    anchor = '    ROOT / "data" / "json" / "core" / "runes66.json",\n'
    if anchor in text:
        text = text.replace(anchor, anchor + '    ROOT / "data" / "json" / "core" / "runes66groups.json",\n', 1)
if 'ROOT / "data" / "json" / "core" / "runesgroup.json"' not in text:
    anchor = '    ROOT / "data" / "json" / "core" / "runes.json",\n'
    text = text.replace(anchor, anchor + '    ROOT / "data" / "json" / "core" / "runesgroup.json",\n', 1)
if '    "runes66groups.json",\n' not in text:
    anchor = '    "runes66.json",\n'
    text = text.replace(anchor, anchor + '    "runes66groups.json",\n', 1)
validator.write_text(text, encoding='utf-8')

# Final guard: no active file may still reference the retired group filename.
remaining = []
for path in ROOT.rglob('*'):
    if not path.is_file():
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith('data/json/archive/') or rel in {'card_api/scripts/validate_repo_layout.py', 'tools/rename_rune_runtime_once.py'}:
        continue
    if path.suffix.lower() not in {'.py','.js','.html','.md','.json','.yml','.yaml','.xml','.txt'}:
        continue
    try:
        body = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if 'runes66groups.json' in body:
        remaining.append(rel)
if remaining:
    raise SystemExit('retired group filename still referenced by: ' + ', '.join(sorted(remaining)))

print('Renamed runes66groups.json -> runesgroup.json')
print('Updated js/runes66.js to use canonical runes.json + runesgroup.json')
print('Updated active fetch/cache/governance references')
