#!/usr/bin/env python3
"""Publish current LOC JSON authorities to compact static browser JS.

RC3 runtime rule:
    JSON = editable/versioned authority
    JS   = browser runtime

The publisher intentionally performs no network I/O and has no third-party
requirements. Historical snapshots remain historical inputs; current runtime
output is normalized against current authorities before publishing.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY_PERIOD_MAP = {
    "P0": "P5.0", "P0.5": "P5.1", "P1": "P6.0", "P2": "P6.1",
    "P3": "P6.2", "P4": "P7.0", "P5": "P7.0", "P6": "P7.0",
    "P7": "P7.1", "P8": "P7.2",
}


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
    write_global(
        {key: read_json(source) for key, source in sources.items()},
        list(sources.values()), target, global_name,
    )


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
    eras = list(read_json(era_source).get("eras") or [])
    keep = (
        "id", "date", "object_type", "object_id", "event_type", "event_title",
        "title", "description", "state_before", "state_after", "status",
    )
    rows = []
    for raw in snapshot.get("events") or []:
        row = {key: raw[key] for key in keep if key in raw}
        old_era = raw.get("era")
        era = resolve_era(raw.get("date"), eras)
        if old_era:
            row["legacy_era"] = old_era
        if era:
            row["era"] = era.get("period")
            row["era_id"] = era.get("era_id")
            row["era_label"] = era.get("display_label")
        rows.append(row)
    write_global(
        {"schema_version": "1.0", "role": "normalized compact derived event history", "events": rows},
        [source, era_source], "data/js/loc-event-data.js", "LOC_EVENT_DATA",
    )


def dump_compact_scenarios() -> None:
    source = "data/json/registries/LOC2_EVENT_REGISTRY.json"
    doc = read_json(source)
    fields = ("event_id", "title", "event_group", "requirement_signature", "description")
    records = [{key: row.get(key) for key in fields if row.get(key) is not None} for row in doc.get("records") or []]
    write_global(
        {"schema_version": "1.0", "role": "compact scenario runtime projection", "records": records},
        [source], "data/js/loc-scenario-data.js", "LOC_SCENARIO_DATA",
    )


def top_keywords(rows: list[dict], key: str, limit: int = 5) -> list[dict]:
    return [
        {"term": item.get("term"), "percent": item.get("percent")}
        for item in (rows or [])[:limit]
        if item.get("term")
    ]


def dump_compact_period_analysis() -> None:
    loc3_source = "data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json"
    loc6_source = "data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json"
    loc3_doc, loc6_doc = read_json(loc3_source), read_json(loc6_source)
    loc3 = []
    for row in loc3_doc.get("periods") or []:
        period = str(row.get("period") or "")
        loc3.append({
            "period": period,
            "canonical_period": LEGACY_PERIOD_MAP.get(period, period),
            "start_date": row.get("start_date"),
            "work_count": row.get("work_count", 0),
            "keywords": top_keywords(row.get("normalized_top_keywords") or [], "normalized_top_keywords"),
        })
    loc6 = []
    for row in loc6_doc.get("periods") or []:
        period = str(row.get("period") or "")
        loc6.append({
            "period": period,
            "canonical_period": LEGACY_PERIOD_MAP.get(period, period),
            "document_count": row.get("document_count", 0),
            "keywords": top_keywords(row.get("keywords") or [], "keywords"),
        })
    write_global(
        {"schema_version": "1.0", "role": "compact period-analysis runtime projection", "loc3": loc3, "loc6": loc6},
        [loc3_source, loc6_source], "data/js/loc-period-analysis-data.js", "LOC_PERIOD_ANALYSIS_DATA",
    )


def main() -> int:
    dump_global("data/json/registries/LOC_ERA_REGISTRY.json", "data/js/loc-era-data.js", "LOC_ERA_DATA")
    dump_global("data/json/core/runes66groups.json", "data/js/lunarune-groups-data.js", "LUNARUNE_GROUPS_DATA")
    dump_combined(
        {"history": "data/json/registries/LUNARUNE_EVOLUTION_HISTORY.json", "analysis": "data/json/registries/LUNARUNE_EVOLUTION_ANALYSIS.json"},
        "data/js/lunarune-evolution-data.js", "LUNARUNE_EVOLUTION_DATA",
    )
    dump_global("data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json", "data/js/lunarune-daily-data.js", "LUNARUNE_DAILY_DATA")
    dump_normalized_events()
    dump_compact_scenarios()
    dump_global("data/json/registries/LOC_CROSS_RELATIONSHIP_REGISTRY.json", "data/js/loc-relation-data.js", "LOC_RELATION_DATA")
    dump_compact_period_analysis()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
