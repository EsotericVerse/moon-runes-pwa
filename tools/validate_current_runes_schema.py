#!/usr/bin/env python3
"""Validate current LunaRunes data and detect legacy schema contamination.

Current authority:
- data/json/core/runes66.json
- data/json/core/runes66groups.json

This validator intentionally treats the old runes64-era aggregate schema as
legacy. Historical/experimental files may preserve old fields, but active
runtime consumers must not depend on them.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNES = ROOT / "data/json/core/runes66.json"
GROUPS = ROOT / "data/json/core/runes66groups.json"

REQUIRED_RUNE_FIELDS = {
    "編號",
    "符文名稱",
    "英文",
    "圖騰",
    "所屬分組",
    "月相",
    "卡片屬性",
    "關鍵詞",
}

# Fields from the old merged Basic+Spec+Direction+Runtime+History model.
FORBIDDEN_CURRENT_DATA_FIELDS = {
    "顯化形式",
    "spec",
    "history",
    "id",
    "name",
    "english",
    "group",
    "moon_phase",
    "card_attribute",
    "keyword",
}

# Only active runtime/search files are checked. Historical docs and
# data/json/experimental are deliberately outside this list.
ACTIVE_RUNTIME_FILES = [
    "js/main.js",
    "js/list.js",
    "js/rune-draw.js",
    "js/runes66.js",
    "js/runeLibrary.js",
    "search.html",
    "lots.html",
    "runes.html",
    "game.html",
    "context.html",
    "statics.html",
    "evolution.html",
    "card_api/main.py",
    "card_api/unified_search.py",
]

FORBIDDEN_RUNTIME_PATTERNS = {
    "legacy manifestation field": re.compile(r"(?:\.顯化形式|get\([\"']顯化形式[\"']|[\"']顯化形式[\"']\s*:|顯化形式：)"),
    "legacy spec field": re.compile(r"(?:\.spec\b|get\([\"']spec[\"']|[\"']spec[\"']\s*:|rune66-spec)"),
    "runes64 runtime source": re.compile(r"runes64(?:\.js|\.json|_alldata|alldata)", re.I),
}


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def load_json(path: pathlib.Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize_rune_rows(payload):
    if not isinstance(payload, list):
        raise ValueError("runes66.json must use the current top-level JSON array schema")
    return payload


def main() -> int:
    errors: list[str] = []

    try:
        rows = normalize_rune_rows(load_json(RUNES))
    except Exception as exc:
        print(f"FAIL: cannot load current runes66 schema: {exc}")
        return 1

    try:
        groups_payload = load_json(GROUPS)
    except Exception as exc:
        print(f"FAIL: cannot load runes66groups.json: {exc}")
        return 1

    if len(rows) != 67:
        fail(f"runes66.json must contain 67 records (0 + 1..66), got {len(rows)}", errors)

    ids = []
    by_id = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            fail(f"runes66[{index}] is not an object", errors)
            continue
        missing = REQUIRED_RUNE_FIELDS - set(row)
        if missing:
            fail(f"runes66[{index}] missing fields: {sorted(missing)}", errors)
        forbidden = FORBIDDEN_CURRENT_DATA_FIELDS & set(row)
        if forbidden:
            fail(f"runes66[{index}] contains legacy fields: {sorted(forbidden)}", errors)
        rid = row.get("編號")
        if isinstance(rid, int):
            ids.append(rid)
            by_id[rid] = row

    if set(ids) != set(range(67)):
        fail("runes66 編號 must be exactly 0..66", errors)

    rune65 = by_id.get(65, {})
    if rune65.get("符文名稱") != "玄" or rune65.get("英文") != "Chaos":
        fail("Rune 65 must be 玄 / Chaos", errors)
    if rune65.get("所屬分組") != "特殊":
        fail("Rune 65 group must be 特殊", errors)
    if rune65.get("月相") != "無" or rune65.get("卡片屬性") != "未知":
        fail("Rune 65 must use 月相=無 and 卡片屬性=未知", errors)

    rune66 = by_id.get(66, {})
    if rune66.get("符文名稱") != "命" or rune66.get("英文") != "Fate":
        fail("Rune 66 must be 命 / Fate", errors)
    if rune66.get("所屬分組") != "特殊":
        fail("Rune 66 group must be 特殊", errors)

    group_rows = groups_payload.get("groups", []) if isinstance(groups_payload, dict) else []
    group_members = {}
    for group in group_rows:
        group_name = group.get("group_zh")
        for member in group.get("runes", []):
            rid = member.get("id")
            if isinstance(rid, int):
                group_members[rid] = (group_name, member.get("zh"), member.get("en"))

    for rid in range(1, 65):
        rune = by_id.get(rid)
        member = group_members.get(rid)
        if not rune:
            continue
        if not member:
            fail(f"runes66groups missing rune {rid} {rune.get('符文名稱')}", errors)
            continue
        group_name, zh, en = member
        if rune.get("符文名稱") != zh:
            fail(f"rune {rid} name mismatch: runes66={rune.get('符文名稱')} groups={zh}", errors)
        if rune.get("英文") != en:
            fail(f"rune {rid} English mismatch: runes66={rune.get('英文')} groups={en}", errors)
        if rune.get("所屬分組") != group_name:
            fail(f"rune {rid} group mismatch: runes66={rune.get('所屬分組')} groups={group_name}", errors)

    for rel in ACTIVE_RUNTIME_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for label, pattern in FORBIDDEN_RUNTIME_PATTERNS.items():
            if pattern.search(text):
                fail(f"{rel}: {label}", errors)

    if errors:
        print("LunaRunes current-schema validation FAILED")
        for item in errors:
            print(f"- {item}")
        return 1

    print("LunaRunes current-schema validation PASSED")
    print("- runes66 current schema: OK")
    print("- runes66groups cross-check: OK")
    print("- active runtime legacy-field scan: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
