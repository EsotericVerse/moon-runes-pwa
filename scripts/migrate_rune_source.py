#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = "runes66.json"


def p(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return p(rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    p(rel).write_text(text, encoding="utf-8")


def replace_required(rel: str, old: str, new: str, expected: int | None = None) -> None:
    text = read(rel)
    count = text.count(old)
    if count == 0:
        raise SystemExit(f"required pattern missing in {rel}: {old[:80]!r}")
    if expected is not None and count != expected:
        raise SystemExit(f"unexpected occurrence count in {rel}: {count} != {expected}")
    write(rel, text.replace(old, new))


def regex_required(rel: str, pattern: str, repl: str, count: int = 1) -> None:
    text = read(rel)
    updated, n = re.subn(pattern, repl, text, count=count, flags=re.S)
    if n != count:
        raise SystemExit(f"regex replacement failed in {rel}: {n} != {count}")
    write(rel, updated)


# Browser runtime: imported/generated JS is the only rune runtime source.
old_hint = '''async function loadRuneHints() {
  try {
    const response = await fetch("data/json/core/runes66.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);
    runeHintMap = new Map(items.map(item => [Number(item.編號), item]));
  } catch (error) {
    console.warn("LunaRunes rune hint JSON unavailable; using local JS fallback.", error);
    runeHintMap = new Map();
  }
}'''
new_hint = '''async function loadRuneHints() {
  runeHintMap = new Map(rune.filter(Boolean).map(item => [Number(item.編號), item]));
}'''
for rel in ("js/rune-draw.js", "js/result.js"):
    replace_required(rel, old_hint, new_hint, expected=1)

old_list = '''    const [runeResponse, groupResponse] = await Promise.all([
      fetch("data/json/core/runes66.json", { cache: "no-store" }),
      fetch("data/json/core/runes66groups.json", { cache: "no-store" })
    ]);
    if (!runeResponse.ok) throw new Error(`runes66.json HTTP ${runeResponse.status}`);
    if (!groupResponse.ok) throw new Error(`runes66groups.json HTTP ${groupResponse.status}`);

    const runePayload = await runeResponse.json();
    const groupPayload = await groupResponse.json();
    runeRows = Array.isArray(runePayload) ? runePayload : (runePayload.runes || []);
    groups = Array.isArray(groupPayload) ? groupPayload : (groupPayload.groups || []);'''
new_list = '''    const [runeModule, groupResponse] = await Promise.all([
      import("./runes66.js"),
      fetch("data/json/core/runes66groups.json", { cache: "no-store" })
    ]);
    if (!groupResponse.ok) throw new Error(`runes66groups.json HTTP ${groupResponse.status}`);

    const groupPayload = await groupResponse.json();
    runeRows = runeModule.rune.filter(Boolean);
    if (runeModule.runeZero) runeRows = [...runeRows, runeModule.runeZero];
    groups = Array.isArray(groupPayload) ? groupPayload : (groupPayload.groups || []);'''
replace_required("js/list.js", old_list, new_list, expected=1)

old_main = '''      const response = await fetch("data/json/core/runes66.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);'''
new_main = '''      const runeModule = await import("/js/runes66.js");
      const rows = runeModule.rune.filter(Boolean);
      if (runeModule.runeZero) rows.push(runeModule.runeZero);'''
replace_required("js/main.js", old_main, new_main, expected=1)
replace_required(
    "js/main.js",
    'console.error("Failed to render homepage rune from runes66.json", error);',
    'console.error("Failed to render homepage rune from generated runtime", error);',
    expected=1,
)

old_governance = '''      const response=await fetch('data/json/core/runes66.json',{cache:'no-store'});
      if(!response.ok) return;
      const payload=await response.json();
      const rows=Array.isArray(payload)?payload:(payload.runes||payload.items||[]);'''
new_governance = '''      const runeModule=await import('/js/runes66.js');
      const rows=runeModule.rune.filter(Boolean);
      if(runeModule.runeZero) rows.push(runeModule.runeZero);'''
replace_required("js/rune-display-governance.js", old_governance, new_governance, expected=1)

# Search: rune records are injected from generated JS runtime, not routed as JSON.
replace_required(
    "js/search-sources.js",
    '  "data/json/core/runes66.json": "data/json/core/runes66.json",\n',
    "",
    expected=1,
)
regex_required(
    "search.html",
    r'''const d=await localJson\(window\.LOC_SEARCH_SOURCES\["data/json/core/runes66\.json"\]\);\s*for\(const rune of d\.runes\|\|\[\]\)\{''',
    '''const runeModule=await import('/js/runes66.js');
          const runeRows=runeModule.rune.filter(Boolean);
          if(runeModule.runeZero) runeRows.push(runeModule.runeZero);
          for(const rune of runeRows){''',
)

# Server/build-time consumers use the canonical projection directly.
for rel in (
    "card_api/main.py",
    "card_api/scripts/evaluate_graph_rag.py",
    "card_api/scripts/validate_search_core.py",
    "card_api/scripts/validate_repo_layout.py",
    "engine/README.md",
    "engine/g.py",
    "engine/g-1.py",
):
    text = read(rel)
    if LEGACY not in text:
        raise SystemExit(f"expected legacy reference missing in {rel}")
    text = text.replace(LEGACY, "runes.json")
    if rel in ("engine/g.py", "engine/g-1.py"):
        text = text.replace("RUNES66", "RUNES_SOURCE")
    write(rel, text)

# Service worker must not cache or special-case the deleted duplicate source.
sw = read("service-worker.js")
if LEGACY not in sw:
    raise SystemExit("expected service-worker legacy reference missing")
sw = "\n".join(line for line in sw.splitlines() if LEGACY not in line) + "\n"
sw = re.sub(r'moon-runes-pwa-v(\d+)', lambda m: f"moon-runes-pwa-v{int(m.group(1))+1}", sw, count=1)
write("service-worker.js", sw)

# Delete the duplicated projection only after every known dependency has been migrated.
legacy_file = p("data/json/core/runes66.json")
if not legacy_file.exists():
    raise SystemExit("legacy rune JSON is already missing before dependency migration")
legacy_file.unlink()

# This migration is one-shot; remove itself so the repository can prove zero legacy references.
self_path = Path(__file__).resolve()
self_path.unlink()

# Repository-wide zero-residual check for text files.
residual: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    if LEGACY in text:
        residual.append(str(path.relative_to(ROOT)))

if residual:
    raise SystemExit("legacy runes66 JSON references remain: " + ", ".join(sorted(residual)))

print("Rune source migration complete: canonical runes.json + generated JS runtime; legacy duplicate removed.")
