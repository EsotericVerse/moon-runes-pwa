#!/usr/bin/env python3
"""RC3 static-runtime governance check.

Current public runtime is static PWA only:
- JSON is authoring/canonical data.
- Browser runtime consumes generated JS.
- Google Sheets, KV, legacy Render/state APIs and browser data caches are not
  allowed in current static surfaces.
- card_api/ is intentionally excluded: it is the near-term api.lo3rwang.cc
  RAG/Graph/Search workspace, not current PWA runtime.
- Presentation authority lives in css/, not inline HTML styles.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML_RUNTIME = [
    "index.html",
    "lots.html",
    "runes.html",
    "context.html",
    "evolution.html",
    "search.html",
    "game.html",
    "statics.html",
]
JS_RUNTIME = [
    "js/loc-periods.js",
    "js/rune.js",
    "js/direction64.js",
    "js/runes66.js",
    "js/rune-analytics.js",
    "js/rune-daily-records.js",
    "js/rune-context-graph.js",
    "js/facebook-repo-corpus.js",
]
RUNTIME_FILES = HTML_RUNTIME + JS_RUNTIME

FORBIDDEN = {
    "Google Sheets runtime": re.compile(r"script\.google\.com|SHEET_API_URL", re.I),
    "legacy Render runtime": re.compile(r"moon-runes-pwa\.onrender\.com", re.I),
    "legacy state/KV runtime": re.compile(
        r"api\.lo3rwang\.cc/(?:context|daily-runes|eras|evolution)|LOC_KV|wrangler",
        re.I,
    ),
    "browser data cache/state": re.compile(
        r"localStorage\.(?:getItem|setItem)\(", re.I
    ),
}

JSON_FETCH = re.compile(
    r"fetch\s*\([^\n;]{0,260}?(?:\.json|data/json/)[^\n;]{0,260}?\)",
    re.I | re.S,
)
INLINE_STYLE = re.compile(r"\sstyle\s*=\s*['\"]", re.I)

# Deployment mechanisms removed from RC3 must remain physically absent.
MUST_NOT_EXIST = [
    "wrangler.toml",
    "cloudflare",
    ".wrangler",
    "render.yaml",
    "Procfile",
    "Dockerfile",
]


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def main() -> int:
    failures: list[str] = []
    checked = 0

    for rel in MUST_NOT_EXIST:
        if (ROOT / rel).exists():
            failures.append(f"{rel}: obsolete deployment/runtime path must not exist")

    for rel in RUNTIME_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        checked += 1
        text = path.read_text(encoding="utf-8", errors="replace")

        for label, pattern in FORBIDDEN.items():
            for match in pattern.finditer(text):
                failures.append(f"{rel}:{line_of(text, match.start())}: {label}")

        for match in JSON_FETCH.finditer(text):
            failures.append(
                f"{rel}:{line_of(text, match.start())}: runtime JSON fetch; publish JSON to JS first"
            )

        if rel.endswith(".html"):
            for match in INLINE_STYLE.finditer(text):
                failures.append(
                    f"{rel}:{line_of(text, match.start())}: inline style; move presentation to css/"
                )

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
