#!/usr/bin/env python3
"""Generate multimedia classification, relation, and analysis projections.

Principles:
- priority / exclusion / fallback only
- no numeric semantic weights or scores
- no URL inference
- LOC_MEDIA_REGISTRY.json remains the authoritative source
- generated files are disposable projections and may be rebuilt
- generated files never carry governance authority
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data/json/registries/LOC_MEDIA_REGISTRY.json"
DEFAULT_OUT = ROOT / "data/json/generated/loc5"


def text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def values(value: Any) -> list:
    return value if isinstance(value, list) else []


def lower(value: Any) -> str:
    return text(value).lower()


def classify(item: dict) -> dict:
    related = [text(x) for x in values(item.get("related_locs"))]
    purpose = lower(item.get("purpose"))
    media_type = lower(item.get("media_type"))
    matched: list[str] = []
    excluded: list[str] = []
    candidates: list[str] = []

    explicit = []
    if "LOC1" in related:
        explicit.append("rune_system_media")
    if item.get("linked_song_id") or "LOC3" in related:
        explicit.append("music_media")
    if "LOC4" in related:
        explicit.append("literary_media")

    # Priority 1: explicit historical provenance relations retained by the source.
    if "rune_system_media" in explicit:
        primary = "rune_system_media"
        matched.append("historical_provenance_LOC1_relation")
    elif "music_media" in explicit:
        primary = "music_media"
        matched.append("historical_provenance_LOC3_relation_or_linked_song")
    elif "literary_media" in explicit:
        primary = "literary_media"
        matched.append("historical_provenance_LOC4_relation")
    # Priority 2: governed purpose.
    elif any(k in purpose for k in ("rune", "lunarune", "divination")):
        primary = "rune_system_media"
        matched.append("governed_purpose_rune")
    elif any(k in purpose for k in ("music", "song", "mv", "lyrics")):
        primary = "music_media"
        matched.append("governed_purpose_music")
    elif any(k in purpose for k in ("literary", "writing", "article", "novel")):
        primary = "literary_media"
        matched.append("governed_purpose_literary")
    elif purpose in {"personal_design", "visual_design", "personal_visual"} or "visual" in purpose:
        primary = "visual_personal_media"
        matched.append("governed_purpose_visual")
    # Priority 3: media-type fallback only.
    elif any(k in media_type for k in ("image", "photo", "design", "graphic")):
        primary = "visual_personal_media"
        matched.append("media_type_visual_fallback")
    else:
        primary = "other_multimedia"
        matched.append("unresolved_fallback")

    # Multiple historical LOC provenance relations are retained as dispute candidates rather than scored.
    candidates = [c for c in explicit if c != primary]
    status = "disputed" if candidates else ("fallback" if primary == "other_multimedia" else "classified")

    # Exclusions are rule-based, not weighted. Generic media type cannot override explicit provenance.
    if explicit and primary != "visual_personal_media" and any(k in media_type for k in ("image", "photo", "design", "graphic")):
        excluded.append("visual_personal_media:generic_media_type_cannot_override_explicit_LOC_relation")
    if item.get("url") in (None, ""):
        excluded.append("none:missing_url_does_not_exclude_historical_media")

    return {
        "media_id": item.get("media_id"),
        "title": item.get("title"),
        "primary_class": primary,
        "matched_rules": matched,
        "excluded_by_rules": excluded,
        "dispute_candidates": candidates,
        "status": status,
        "source_fields": {
            "related_locs": related,
            "linked_song_id": item.get("linked_song_id"),
            "linked_work_id": item.get("linked_work_id"),
            "purpose": item.get("purpose"),
            "media_type": item.get("media_type"),
        },
    }


def relation_rows(item: dict, classification: dict) -> list[dict]:
    media_id = item.get("media_id")
    rows: list[dict] = []

    for loc in values(item.get("related_locs")):
        rows.append({
            "from_media_id": media_id,
            "relation": "related_loc",
            "target_type": "loc_scope",
            "target_id": loc,
            "provenance": "canonical_explicit",
        })

    if item.get("linked_song_id"):
        rows.append({
            "from_media_id": media_id,
            "relation": "linked_song",
            "target_type": "loc3_song",
            "target_id": item["linked_song_id"],
            "provenance": "canonical_explicit",
        })

    if item.get("linked_work_id"):
        rows.append({
            "from_media_id": media_id,
            "relation": "linked_work",
            "target_type": "work",
            "target_id": item["linked_work_id"],
            "provenance": "canonical_explicit",
        })

    if item.get("era_id"):
        rows.append({
            "from_media_id": media_id,
            "relation": "in_era",
            "target_type": "loc8_era",
            "target_id": item["era_id"],
            "provenance": "canonical_explicit",
        })

    for ref in values(item.get("source_refs")):
        if not isinstance(ref, dict):
            continue
        source_type = text(ref.get("source_type"))
        source_id = text(ref.get("source_id"))
        if source_type or source_id:
            rows.append({
                "from_media_id": media_id,
                "relation": "source_reference",
                "target_type": source_type or "source",
                "target_id": source_id or None,
                "provenance": "source_observed",
            })

    rows.append({
        "from_media_id": media_id,
        "relation": "primary_multimedia_class",
        "target_type": "loc5_class",
        "target_id": classification["primary_class"],
        "provenance": "system_derived",
        "derivation": "priority_exclusion_fallback_no_weights",
    })
    return rows


def generate(source: Path, outdir: Path) -> dict:
    source_data = json.loads(source.read_text(encoding="utf-8"))
    items = values(source_data.get("items"))
    outdir.mkdir(parents=True, exist_ok=True)

    classifications = [classify(item) for item in items]
    class_by_id = {row["media_id"]: row for row in classifications}
    relations = [rel for item in items for rel in relation_rows(item, class_by_id.get(item.get("media_id"), classify(item)))]

    class_counts = Counter(row["primary_class"] for row in classifications)
    status_counts = Counter(row["status"] for row in classifications)
    platform_counts = Counter(text(item.get("platform")) or "unknown" for item in items)
    media_type_counts = Counter(text(item.get("media_type")) or "unknown" for item in items)
    relation_provenance = Counter(row["provenance"] for row in relations)
    relation_types = Counter(row["relation"] for row in relations)

    with_url = sum(bool(text(item.get("url"))) for item in items)
    semantic_index = sum(item.get("linked_to_semantic_index") is True for item in items)
    with_visual_summary = sum(bool(text((item.get("semantic_descriptor") or {}).get("visual_summary"))) for item in items)
    with_manual_tags = sum(bool(values((item.get("semantic_descriptor") or {}).get("manual_tags"))) for item in items)
    with_generated_tags = sum(bool(values((item.get("semantic_descriptor") or {}).get("generated_tags"))) for item in items)

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    common = {
        "schema_version": "0.1",
        "authority": None,
        "projection_status": "generated_projection_without_governance_authority",
        "authoritative_source": "data/json/registries/LOC_MEDIA_REGISTRY.json",
        "source": "data/json/registries/LOC_MEDIA_REGISTRY.json",
        "generator": "scripts/generate_loc5_data.py",
        "generated_at": generated_at,
        "semantic_policy": "priority + exclusion + fallback + dispute; no numeric weights",
    }

    classification_doc = {
        **common,
        "registry": "LOC5_MEDIA_CLASSIFICATION",
        "record_count": len(classifications),
        "items": classifications,
    }
    relations_doc = {
        **common,
        "registry": "LOC5_MEDIA_RELATIONS",
        "relation_count": len(relations),
        "items": relations,
    }
    report_doc = {
        **common,
        "registry": "LOC5_MEDIA_ANALYSIS_REPORT",
        "summary": {
            "total_media_records": len(items),
            "with_verified_or_canonical_url_field": with_url,
            "without_url_historical_or_pending": len(items) - with_url,
            "linked_to_semantic_index": semantic_index,
            "not_linked_to_semantic_index": len(items) - semantic_index,
            "with_visual_summary": with_visual_summary,
            "with_manual_tags": with_manual_tags,
            "with_generated_tags": with_generated_tags,
            "classification_status": dict(sorted(status_counts.items())),
            "primary_class": dict(sorted(class_counts.items())),
            "platform": dict(sorted(platform_counts.items())),
            "media_type": dict(sorted(media_type_counts.items())),
            "relation_provenance": dict(sorted(relation_provenance.items())),
            "relation_type": dict(sorted(relation_types.items())),
        },
        "disputed_media_ids": [row["media_id"] for row in classifications if row["status"] == "disputed"],
        "fallback_media_ids": [row["media_id"] for row in classifications if row["status"] == "fallback"],
        "governance_notes": [
            "No semantic numeric weights or scores are generated.",
            "Historical LOC provenance relations are preserved as source evidence; they do not define Current architecture or ownership.",
            "Missing URL does not remove or downgrade a historical LOC5 media record.",
            "No URL is inferred, generated, or promoted by this analyzer.",
            "Multiple explicit LOC relations are preserved as dispute candidates instead of being numerically ranked.",
        ],
    }

    outputs = {
        "LOC5_MEDIA_CLASSIFICATION.json": classification_doc,
        "LOC5_MEDIA_RELATIONS.json": relations_doc,
        "LOC5_MEDIA_ANALYSIS_REPORT.json": report_doc,
    }
    for name, payload in outputs.items():
        (outdir / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return report_doc["summary"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    summary = generate(args.source, args.outdir)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
