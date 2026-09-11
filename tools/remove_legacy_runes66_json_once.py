from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CANON = ROOT / "data/json/core/runes.json"
LEGACY = ROOT / "data/json/core/runes66.json"
SELF = ROOT / "tools/remove_legacy_runes66_json_once.py"
ARCHIVE_PREFIX = "data/json/archive/"
TEXT_SUFFIXES = {".py", ".js", ".html", ".md", ".json", ".yml", ".yaml", ".xml", ".txt"}

if not CANON.is_file():
    raise SystemExit("canonical data/json/core/runes.json is missing")
if not LEGACY.is_file():
    raise SystemExit("legacy data/json/core/runes66.json is already missing")

canon_text = CANON.read_text(encoding="utf-8")
for required_field in ('"符文說明"', '"正向關鍵詞"', '"反向關鍵詞"'):
    if required_field not in canon_text:
        raise SystemExit(f"runes.json is not the latest governed schema; missing {required_field}")

changed: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    if path in {CANON, LEGACY, SELF}:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith(ARCHIVE_PREFIX):
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    new = text.replace("runes66.json", "runes.json")
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(rel)

# Make the current renderer explicitly prefer the latest manually governed schema.
rune_js = ROOT / "js/rune.js"
text = rune_js.read_text(encoding="utf-8")
text = text.replace(
    "關鍵詞:row.關鍵詞 ?? row.keyword ?? \"\"",
    "關鍵詞:row.正向關鍵詞 ?? row.關鍵詞 ?? row.keyword ?? \"\"",
)
text = text.replace(
    "valueOf(rune,'特別說明','說明','description')",
    "valueOf(rune,'符文說明','特別說明','說明','description')",
)
text = text.replace(
    "valueOf(rune,'關鍵詞','keyword')",
    "valueOf(rune,'正向關鍵詞','關鍵詞','keyword')",
)
rune_js.write_text(text, encoding="utf-8")

loader_js = ROOT / "js/runes66.js"
text = loader_js.read_text(encoding="utf-8")
text = text.replace(
    "關鍵詞: row.關鍵詞 ?? row.keyword,",
    "符文說明: row.符文說明 ?? row.特別說明 ?? row.description,\n    關鍵詞: row.正向關鍵詞 ?? row.關鍵詞 ?? row.keyword,",
)
loader_js.write_text(text, encoding="utf-8")

validator = ROOT / "card_api/scripts/validate_repo_layout.py"
text = validator.read_text(encoding="utf-8")
legacy_forbidden = '    ROOT / "data" / "json" / "core" / "runes66.json",\n'
if legacy_forbidden not in text:
    anchor = '    ROOT / "loc2-game.html",\n'
    if anchor not in text:
        raise SystemExit("validator forbidden-path anchor not found")
    text = text.replace(anchor, anchor + legacy_forbidden, 1)
if '    "runes66.json",\n' not in text:
    anchor = '    "data/json/fb-semantic-summary.json",\n'
    if anchor not in text:
        raise SystemExit("validator stale-token anchor not found")
    text = text.replace(anchor, anchor + '    "runes66.json",\n', 1)
if '    "tools/remove_legacy_runes66_json_once.py",\n' not in text:
    anchor = '    "engine/README.md",\n'
    if anchor not in text:
        raise SystemExit("validator skip-file anchor not found")
    text = text.replace(anchor, anchor + '    "tools/remove_legacy_runes66_json_once.py",\n', 1)
validator.write_text(text, encoding="utf-8")

# Force clients to drop any cached copy of the retired JSON.
sw = ROOT / "service-worker.js"
text = sw.read_text(encoding="utf-8")
match = re.search(r'moon-runes-pwa-v(\d+)', text)
if match:
    next_version = int(match.group(1)) + 1
    text = text[:match.start()] + f"moon-runes-pwa-v{next_version}" + text[match.end():]
sw.write_text(text, encoding="utf-8")

# Delete only after all active consumers and governance rules are rewired.
LEGACY.unlink()

# Final guard: no active text file may still name the retired JSON.
remaining: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES or path == SELF:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith(ARCHIVE_PREFIX):
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    if "runes66.json" in text:
        remaining.append(rel)
if remaining:
    raise SystemExit("retired runes66.json still referenced by: " + ", ".join(sorted(remaining)))

print("Canonical rune source verified: data/json/core/runes.json")
print("Latest schema verified: 符文說明 / 正向關鍵詞 / 反向關鍵詞")
print("Removed legacy source: data/json/core/runes66.json")
print("Rewired active references:", ", ".join(sorted(set(changed))) or "none")
