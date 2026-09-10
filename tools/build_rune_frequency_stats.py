#!/usr/bin/env python3
"""Build deterministic LunaRunes frequency statistics for the Search ranking view.

Counting policy:
- Count structured rune evidence, not accidental character occurrence in free text.
- Do not deduplicate across evidence types. If one work has both a recorded draw and a
  separate semantic-rune classification, both are valid rune evidence and both count.
- Do not count the canonical rune dictionary itself as usage evidence.
- Rune 0 德 is excluded. Rune 1-66 are counted; 65/66 are grouped as 特殊.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "data/json/core/runes66.json"
OUT = ROOT / "data/json/generated/LOC_RUNE_FREQUENCY_STATS.json"

SOURCE_PATHS = [
    "data/json/registries/LOC8_DAILY_RUNE_SNAPSHOT.json",
    "data/json/registries/LOC1_OW3GS_READING_REGISTRY.json",
    "data/json/registries/LOC1_READING_EXAMPLE_REGISTRY.json",
    "data/json/registries/LOC1_THREE_RUNE_NARRATIVE_EVIDENCE.json",
    "data/json/registries/RUNE_LITERATURE_REGISTRY.json",
    "data/json/registries/LOC3_RUNE_SONG_REGISTRY.json",
    "data/json/registries/LOC4_MOON_SPEAKER_RUNE_RECOVERY.json",
]

RUNE_KEYS = {"rune", "rune_name", "canonical_name", "符文", "符文名稱"}
RUNE_LIST_KEYS = {"runes", "canonical_names", "search_runes"}
STRUCTURED_CONTAINER_KEYS = {
    "cards", "rune_configuration", "matched_rune_sources", "rune_matches",
    "draw_runes", "semantic_runes", "classified_runes", "rune_membership",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def canon() -> tuple[set[str], dict[str, str], dict[str, int]]:
    data = load_json(CORE)
    names: set[str] = set()
    groups: dict[str, str] = {}
    ids: dict[str, int] = {}
    for row in data.get("runes", []):
        rid = int(row.get("id", row.get("編號", -1)))
        if rid < 1 or rid > 66:
            continue
        name = str(row.get("name", row.get("名稱", ""))).strip()
        if not name:
            continue
        group = str(row.get("group", row.get("所屬分組", ""))).strip()
        if rid in (65, 66):
            group = "特殊"
        names.add(name)
        groups[name] = group
        ids[name] = rid
    return names, groups, ids


def iter_structured_runes(value: Any, canonical_names: set[str], parent_key: str = "") -> Iterable[str]:
    """Yield only explicit structured rune fields.

    This intentionally does not scan arbitrary strings for rune characters.
    Repeated evidence in different structured fields is retained by design.
    """
    if isinstance(value, dict):
        for key, item in value.items():
            if key in RUNE_KEYS:
                if isinstance(item, str) and item.strip() in canonical_names:
                    yield item.strip()
                continue
            if key in RUNE_LIST_KEYS and isinstance(item, list):
                for part in item:
                    if isinstance(part, str) and part.strip() in canonical_names:
                        yield part.strip()
                    elif isinstance(part, dict):
                        yield from iter_structured_runes(part, canonical_names, key)
                continue
            if key in STRUCTURED_CONTAINER_KEYS:
                yield from iter_structured_runes(item, canonical_names, key)
                continue
            # Recurse into record containers so nested records are found, but rune
            # names are still counted only when they sit in explicit rune fields.
            if isinstance(item, (dict, list)):
                yield from iter_structured_runes(item, canonical_names, key)
    elif isinstance(value, list):
        for item in value:
            yield from iter_structured_runes(item, canonical_names, parent_key)


def main() -> int:
    canonical_names, group_for, id_for = canon()
    rune_counts: Counter[str] = Counter()
    source_counts: dict[str, int] = {}

    for rel in SOURCE_PATHS:
        path = ROOT / rel
        if not path.exists():
            continue
        data = load_json(path)
        hits = list(iter_structured_runes(data, canonical_names))
        rune_counts.update(hits)
        source_counts[rel] = len(hits)

    group_counts: Counter[str] = Counter()
    for rune, count in rune_counts.items():
        group_counts[group_for[rune]] += count

    runes = [
        {
            "id": id_for[name],
            "rune": name,
            "group": group_for[name],
            "count": rune_counts.get(name, 0),
        }
        for name in sorted(canonical_names, key=lambda x: id_for[x])
    ]
    rune_ranking = sorted(runes, key=lambda x: (-x["count"], x["id"]))
    group_order = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"]
    groups = [
        {"group": group, "count": group_counts.get(group, 0)}
        for group in group_order
    ]
    group_ranking = sorted(groups, key=lambda x: (-x["count"], group_order.index(x["group"])))

    payload = {
        "schema_version": "1.0",
        "dataset": "LOC_RUNE_FREQUENCY_STATS",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counting_policy": {
            "structured_evidence_only": True,
            "cross_evidence_deduplication": False,
            "free_text_character_hits": False,
            "rune_zero_excluded": True,
            "note": "Recorded draw evidence and separately classified semantic-rune evidence may both count; this is intentional."
        },
        "source_counts": source_counts,
        "total_rune_hits": sum(rune_counts.values()),
        "distinct_runes_with_hits": sum(1 for x in runes if x["count"] > 0),
        "runes": runes,
        "rune_ranking": rune_ranking,
        "groups": groups,
        "group_ranking": group_ranking,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {payload['total_rune_hits']} rune hits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
