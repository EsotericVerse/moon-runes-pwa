#!/usr/bin/env python3
"""Legacy static-runtime boundary check for RC4.

Current public runtime keeps the legacy static PWA boundary isolated while the Next
architecture is verified separately:
- Fixed governed data such as LunaRunes may remain in static JS for legacy pages.
- Editable datasets may publish a static JS runtime projection from their authoring source.
- Legacy browser runtime must not fetch rune JSON, Google Sheets, or old Render/state APIs.
- Presentation authority is migrating to css/; retained legacy inline styles are reported
  as migration debt but do not block RC4 while equivalent Next routes are being verified.
- Cloudflare/KV service configuration is governed separately under services/ and is not
  treated as an obsolete deployment merely because this legacy browser check is static-only.

This check applies only to retained legacy static entrypoints. New local-first Next
features (Library, style groups, classification, My Style) are verified by the Next build
and are intentionally not constrained by the legacy localStorage rule below.
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
    "js/runes.js",
    "js/galaxy.js",
    "js/rune-analytics.js",
    "js/rune-daily-records.js",
    "js/rune-context-graph.js",
    "js/facebook-repo-corpus.js",
]
RUNTIME_FILES = HTML_RUNTIME + JS_RUNTIME

FORBIDDEN = {
    "Google Sheets runtime": re.compile(r"script\.google\.com|SHEET_API_URL", re.I),
    "legacy Render runtime": re.compile(r"moon-runes-pwa\.onrender\.com", re.I),
    "legacy state API runtime": re.compile(
        r"api\.lo3rwang\.cc/(?:context|daily-runes|eras|evolution)",
        re.I,
    ),
    "legacy browser data cache/state": re.compile(
        r"localStorage\.(?:getItem|setItem)\(", re.I
    ),
    "retired rune runtime": re.compile(
        r"(?:runes66\.js|data/json/core/runes(?:66groups)?\.json|lunarune-groups-data\.js)",
        re.I,
    ),
}

JSON_FETCH = re.compile(
    r"fetch\s*\([^\n;]{0,260}?(?:\.json|data/json/)[^\n;]{0,260}?\)",
    re.I | re.S,
)
INLINE_STYLE = re.compile(r"\sstyle\s*=\s*['\"]", re.I)

MUST_NOT_EXIST = [
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
    warnings: list[str] = []
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
                f"{rel}:{line_of(text, match.start())}: runtime JSON fetch; publish/load static JS instead"
            )

        if rel.endswith(".html"):
            for match in INLINE_STYLE.finditer(text):
                warnings.append(
                    f"{rel}:{line_of(text, match.start())}: legacy inline style migration debt"
                )

    runes_path = ROOT / "js/runes.js"
    if runes_path.exists():
        text = runes_path.read_text(encoding="utf-8", errors="replace")
        if re.search(r"\bfetch\s*\(", text):
            failures.append("js/runes.js: rune core must not fetch at runtime")
        if re.search(r"\.json\b", text, re.I):
            failures.append("js/runes.js: rune core must not depend on JSON")

    if warnings:
        print("RC4 legacy static runtime migration debt:")
        for item in warnings:
            print(" -", item)

    if failures:
        print("RC4 legacy static runtime boundary: FAIL")
        for item in failures:
            print(" -", item)
        print(f"{len(failures)} violation(s) across {checked} runtime file(s).")
        return 1

    print(f"RC4 legacy static runtime boundary: PASS ({checked} runtime files checked)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
