#!/usr/bin/env python3
"""Publish all current LOC JSON authorities to static browser JS.

RC3 runtime rule:
    JSON = editable/versioned authority
    JS   = browser runtime

Run this after changing any mapped JSON source. It intentionally performs no
network I/O and has no third-party dependencies.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def dump_global(source: str, target: str, global_name: str) -> None:
    src = ROOT / source
    dst = ROOT / target
    payload = json.loads(src.read_text(encoding="utf-8"))
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(
        f"/* AUTO-GENERATED from {source}. DO NOT hand-edit. */\n"
        f"window.{global_name}={encoded};\n",
        encoding="utf-8",
    )
    print(f"published {source} -> {target} ({global_name})")


def dump_combined(sources: dict[str, str], target: str, global_name: str) -> None:
    payload = {
        key: json.loads((ROOT / source).read_text(encoding="utf-8"))
        for key, source in sources.items()
    }
    dst = ROOT / target
    dst.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    source_note = ", ".join(sources.values())
    dst.write_text(
        f"/* AUTO-GENERATED from {source_note}. DO NOT hand-edit. */\n"
        f"window.{global_name}={encoded};\n",
        encoding="utf-8",
    )
    print(f"published {source_note} -> {target} ({global_name})")


def main() -> int:
    dump_global(
        "data/json/registries/LOC_ERA_REGISTRY.json",
        "data/js/loc-era-data.js",
        "LOC_ERA_DATA",
    )
    dump_global(
        "data/json/core/runes66groups.json",
        "data/js/lunarune-groups-data.js",
        "LUNARUNE_GROUPS_DATA",
    )
    dump_combined(
        {
            "history": "data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json",
            "analysis": "data/json/registries/LUNARUNE_EVOLUTION_ANALYSIS.json",
        },
        "data/js/lunarune-evolution-data.js",
        "LUNARUNE_EVOLUTION_DATA",
    )
    dump_global(
        "data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json",
        "data/js/lunarune-daily-data.js",
        "LUNARUNE_DAILY_DATA",
    )
    dump_global(
        "data/json/registries/LOC8_EVENT_SNAPSHOT.json",
        "data/js/loc-event-data.js",
        "LOC_EVENT_DATA",
    )
    dump_global(
        "data/json/registries/LOC2_EVENT_REGISTRY.json",
        "data/js/loc-scenario-data.js",
        "LOC_SCENARIO_DATA",
    )
    dump_global(
        "data/json/registries/LOC_CROSS_RELATIONSHIP_REGISTRY.json",
        "data/js/loc-relation-data.js",
        "LOC_RELATION_DATA",
    )
    dump_combined(
        {
            "loc3": "data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json",
            "loc6": "data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json",
        },
        "data/js/loc-period-analysis-data.js",
        "LOC_PERIOD_ANALYSIS_DATA",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
