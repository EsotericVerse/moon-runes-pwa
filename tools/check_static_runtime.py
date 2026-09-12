#!/usr/bin/env python3
"""RC3 static-runtime governance check.

This is intentionally small and dependency-free. It prevents the legacy
remote/cache architecture from silently returning to current public runtime.
It scans only current runtime surfaces, not archived/history/API source.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RUNTIME_FILES = [
    "index.html",
    "runes.html",
    "context.html",
    "evolution.html",
    "search.html",
    "game.html",
    "statics.html",
    "js/loc-periods.js",
    "js/rune-analytics.js",
    "js/rune-daily-records.js",
    "js/rune-context-graph.js",
    "js/runes66.js",
]

# API/Graph/RAG may return later behind api.lo3rwang.cc, but RC3 static pages
# must not require them to render or search their canonical datasets.
FORBIDDEN = {
    "legacy Render runtime": re.compile(r"moon-runes-pwa\.onrender\.com", re.I),
    "legacy state API runtime": re.compile(r"api\.lo3rwang\.cc/(?:context|daily-runes|eras|evolution)", re.I),
    "data cache in localStorage": re.compile(r"localStorage\.(?:getItem|setItem)\([^\n]{0,120}(?:cache|context|rune|era)", re.I),
}

# Canonical JSON may be authored and built, but current browser runtime should
# consume generated JS for these known authorities.
FORBIDDEN_JSON_RUNTIME = [
    "data/json/core/runes.json",
    "data/json/core/runes66groups.json",
    "data/json/registries/LOC_ERA_REGISTRY.json",
    "data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json",
    "data/json/registries/LUNARUNE_EVOLUTION_ANALYSIS.json",
    "data/json/registries/LUNARUNE_DERIVED_LEXICON.json",
    "data/json/registries/LOC8_EVENT_SNAPSHOT.json",
    "data/json/registries/LOC2_EVENT_REGISTRY.json",
    "data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json",
    "data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json",
]


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def main() -> int:
    failures: list[str] = []
    checked = 0
    for rel in RUNTIME_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        checked += 1
        text = path.read_text(encoding="utf-8", errors="replace")
        for label, pattern in FORBIDDEN.items():
            for match in pattern.finditer(text):
                failures.append(f"{rel}:{line_of(text, match.start())}: {label}")
        for needle in FORBIDDEN_JSON_RUNTIME:
            start = 0
            while True:
                pos = text.find(needle, start)
                if pos < 0:
                    break
                # Header/source comments in generated JS are documentation,
                # not browser I/O. Only flag when the path appears near fetch().
                window = text[max(0, pos - 180):pos + len(needle) + 40]
                if re.search(r"fetch\s*\(", window, re.I):
                    failures.append(
                        f"{rel}:{line_of(text, pos)}: canonical JSON fetched at runtime: {needle}"
                    )
                start = pos + len(needle)

    if failures:
        print("RC3 static runtime governance: FAIL")
        for item in failures:
            print(" -", item)
        print(f"{len(failures)} violation(s) across {checked} runtime file(s).")
        return 1

    print(f"RC3 static runtime governance: PASS ({checked} runtime files checked)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
