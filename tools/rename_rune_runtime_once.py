from pathlib import Path

# Trigger one-shot rename after workflow creation.
ROOT = Path(__file__).resolve().parents[1]
old_group = ROOT / 'data/json/core/runes66groups.json'
new_group = ROOT / 'data/json/core/runesgroup.json'
old_loader = ROOT / 'js/runes66.js'
new_loader = ROOT / 'js/runes.js'

if not old_group.is_file():
    raise SystemExit('missing data/json/core/runes66groups.json')
if new_group.exists():
    raise SystemExit('data/json/core/runesgroup.json already exists')
if not old_loader.is_file():
    raise SystemExit('missing js/runes66.js')
if new_loader.exists():
    raise SystemExit('js/runes.js already exists')

# Rename group metadata without changing bytes.
new_group.write_bytes(old_group.read_bytes())
old_group.unlink()

# Rename runtime loader and update only naming/path references.
loader = old_loader.read_text(encoding='utf-8')
loader = loader.replace('/* LunaRunes66 runtime dataset.', '/* LunaRunes runtime dataset.')
loader = loader.replace('data/json/core/runes66groups.json', 'data/json/core/runesgroup.json')
loader = loader.replace("../data/json/core/runes66groups.json", "../data/json/core/runesgroup.json")
new_loader.write_text(loader, encoding='utf-8')
old_loader.unlink()

replacements = {
    'js/runeLibrary.js': [
        ('// runeLibrary.js - unified LunaRunes66 runtime access', '// runeLibrary.js - unified LunaRunes runtime access'),
        ("./runes66.js", "./runes.js"),
    ],
    'js/rune-draw.js': [("./runes66.js", "./runes.js")],
    'js/rune.js': [('data/json/core/runes66groups.json', 'data/json/core/runesgroup.json')],
    'service-worker.js': [
        ('/data/json/core/runes66groups.json', '/data/json/core/runesgroup.json'),
        ('/js/runes66.js', '/js/runes.js'),
    ],
}

for rel, pairs in replacements.items():
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    for old, new in pairs:
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')

# Cache bump so old loader/group names disappear from clients.
sw = ROOT / 'service-worker.js'
text = sw.read_text(encoding='utf-8')
import re
m = re.search(r'moon-runes-pwa-v(\d+)', text)
if m:
    n = int(m.group(1)) + 1
    text = text[:m.start()] + f'moon-runes-pwa-v{n}' + text[m.end():]
sw.write_text(text, encoding='utf-8')

# Repository governance: new files required, old names forbidden/stale.
validator = ROOT / 'card_api/scripts/validate_repo_layout.py'
text = validator.read_text(encoding='utf-8')
if 'ROOT / "data" / "json" / "core" / "runes66groups.json"' not in text:
    anchor = '    ROOT / "data" / "json" / "core" / "runes66.json",\n'
    if anchor in text:
        text = text.replace(anchor, anchor + '    ROOT / "data" / "json" / "core" / "runes66groups.json",\n    ROOT / "js" / "runes66.js",\n', 1)
if 'ROOT / "data" / "json" / "core" / "runesgroup.json"' not in text:
    anchor = '    ROOT / "data" / "json" / "core" / "runes.json",\n'
    text = text.replace(anchor, anchor + '    ROOT / "data" / "json" / "core" / "runesgroup.json",\n    ROOT / "js" / "runes.js",\n', 1)
if '    "runes66groups.json",\n' not in text:
    anchor = '    "runes66.json",\n'
    text = text.replace(anchor, anchor + '    "runes66groups.json",\n    "runes66.js",\n', 1)
validator.write_text(text, encoding='utf-8')

# Final active-reference guard, excluding validator because it intentionally forbids old names.
old_tokens = ('runes66groups.json', 'runes66.js')
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
    if any(token in body for token in old_tokens):
        remaining.append(rel)
if remaining:
    raise SystemExit('old rune naming still referenced by: ' + ', '.join(sorted(remaining)))

print('Renamed runes66groups.json -> runesgroup.json')
print('Renamed runes66.js -> runes.js')
print('Updated active imports/fetch/cache/governance references')
