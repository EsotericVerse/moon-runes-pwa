#!/usr/bin/env python3
"""Publish current LOC JSON authorities to static browser JS.

RC3 runtime rule:
    JSON = editable/versioned authority
    JS   = browser runtime

Run after changing any mapped JSON source. It performs no network I/O and has
no third-party dependencies. Historical snapshots may be inputs, but current
runtime output is normalized against current authorities before publishing.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_json(source: str):
    return json.loads((ROOT / source).read_text(encoding="utf-8"))


def write_global(payload, sources: list[str], target: str, global_name: str) -> None:
    dst = ROOT / target
    dst.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    source_note = ", ".join(sources)
    dst.write_text(
        f"/* AUTO-GENERATED from {source_note}. DO NOT hand-edit. */\n"
        f"window.{global_name}={encoded};\n",
        encoding="utf-8",
    )
    print(f"published {source_note} -> {target} ({global_name})")


def dump_global(source: str, target: str, global_name: str) -> None:
    write_global(read_json(source), [source], target, global_name)


def dump_combined(sources: dict[str, str], target: str, global_name: str) -> None:
    payload = {key: read_json(source) for key, source in sources.items()}
    write_global(payload, list(sources.values()), target, global_name)


def resolve_era(date: str, eras: list[dict]) -> dict | None:
    day = str(date or "")[:10]
    if not day:
        return None
    for era in eras:
        if era.get("period_type") == "parent":
            continue
        start = str(era.get("start_date") or "")
        end = str(era.get("end_date") or "")
        if (not start or day >= start) and (not end or day <= end):
            return era
    return None


def dump_normalized_events() -> None:
    source = "data/json/registries/LOC8_EVENT_SNAPSHOT.json"
    era_source = "data/json/registries/LOC_ERA_REGISTRY.json"
    snapshot = read_json(source)
    era_doc = read_json(era_source)
    eras = list(era_doc.get("eras") or [])
    rows = []
    for raw in snapshot.get("events") or []:
        row = dict(raw)
        old_era = row.get("era")
        era = resolve_era(row.get("date"), eras)
        if era:
            row["legacy_era"] = old_era
            row["era"] = era.get("period")
            row["era_id"] = era.get("era_id")
            row["era_label"] = era.get("display_label")
        rows.append(row)
    payload = {
        "schema_version": "1.0",
        "role": "normalized derived event history",
        "source": source,
        "era_authority": era_source,
        "events": rows,
    }
    write_global(
        payload,
        [source, era_source],
        "data/js/loc-event-data.js",
        "LOC_EVENT_DATA",
    )


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
    dump_normalized_events()
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
