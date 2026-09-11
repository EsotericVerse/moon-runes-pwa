from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / 'data/json/core/runes66.json'
CANON = 'data/json/core/runes.json'
LEGACY_TOKEN = 'data/json/core/runes66.json'

TEXT_SUFFIXES = {'.py', '.js', '.html', '.md', '.json', '.yml', '.yaml', '.xml', '.txt'}
SKIP_PREFIXES = ('data/json/archive/',)

changed = []
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel == 'tools/remove_legacy_runes66_json_once.py' or any(rel.startswith(p) for p in SKIP_PREFIXES):
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    new = text.replace(LEGACY_TOKEN, CANON).replace('runes66.json', 'runes.json')
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed.append(rel)

validator = ROOT / 'card_api/scripts/validate_repo_layout.py'
text = validator.read_text(encoding='utf-8')
legacy_forbidden = '    ROOT / "data" / "json" / "core" / "runes66.json",\n'
if legacy_forbidden not in text:
    marker = '    ROOT / "loc2-game.html",\n'
    text = text.replace(marker, marker + legacy_forbidden)
text = text.replace('    ROOT / "data" / "json" / "core" / "runes66.json",\n', '', 1) if 'REQUIRED_PATHS = [' in text else text
# Ensure canonical runes.json is required.
req_marker = 'REQUIRED_PATHS = [\n    ROOT / "statics.html",\n'
if req_marker in text and 'ROOT / "data" / "json" / "core" / "runes.json"' not in text.split('STALE_TOKENS =',1)[0]:
    text = text.replace(req_marker, req_marker + '    ROOT / "data" / "json" / "core" / "runes.json",\n')
# Re-add legacy path to forbidden section if the earlier removal hit it.
forbidden_head = text.split('REQUIRED_PATHS =',1)[0]
if 'ROOT / "data" / "json" / "core" / "runes66.json"' not in forbidden_head:
    text = text.replace('    ROOT / "loc2-game.html",\n', '    ROOT / "loc2-game.html",\n    ROOT / "data" / "json" / "core" / "runes66.json",\n')
validator.write_text(text, encoding='utf-8')
if 'card_api/scripts/validate_repo_layout.py' not in changed:
    changed.append('card_api/scripts/validate_repo_layout.py')

if LEGACY.exists():
    LEGACY.unlink()
    changed.append('data/json/core/runes66.json (deleted)')

print('Changed:')
for item in changed:
    print('-', item)
