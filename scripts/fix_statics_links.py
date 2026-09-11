#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = "statics.htm"
NEW = "statics.html"

# Keep only the compatibility redirect and explicit historical migration records.
KEEP = {
    "statics.htm",
    "data/json/registries/LOC_TERMINOLOGY_CANON.json",
    "data/json/search/faq/LOC_FAQ_CANON_OVERRIDES.json",
}

changed = []
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel in KEEP or rel == Path(__file__).relative_to(ROOT).as_posix():
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    if OLD not in text:
        continue
    path.write_text(text.replace(OLD, NEW), encoding="utf-8")
    changed.append(rel)

# Remove the now-unnecessary runtime repair rules; links should be correct at source.
for rel in ("js/loc-nav.js", "js/public-terminology.js"):
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    text = text.replace("statics.htm", "statics.html")
    path.write_text(text, encoding="utf-8")

# One-shot script removes itself after use.
Path(__file__).unlink()
print("Updated statics links:")
for rel in changed:
    print(rel)
