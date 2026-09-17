#!/usr/bin/env python3
"""Migrate retired LOC1–8 Current ownership into Scope/Feature authority.

Historical/provenance fields are intentionally left untouched where possible.
This script is idempotent and only rewrites Current registries.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REG = ROOT / "data/json/registries"

PATH_MAP = {
    "LOC1_OW3GS_READING_REGISTRY.json": "LUNARUNES_OW3GS_READING_REGISTRY.json",
    "LOC1_READING_EXAMPLE_REGISTRY.json": "LUNARUNES_READING_EXAMPLE_REGISTRY.json",
    "LOC1_THREE_RUNE_NARRATIVE_EVIDENCE.json": "LUNARUNES_THREE_RUNE_NARRATIVE_EVIDENCE.json",
    "LOC2_EVENT_REGISTRY.json": "CONTEXT_EVENT_REGISTRY.json",
    "LOC3_AUTHOR_ANNOTATION_REGISTRY.json": "LO3RWANG_MUSIC_ANNOTATION_REGISTRY.json",
    "LOC3_FACETS.json": "MUSIC_FACETS.json",
    "LOC3_KEYWORD_REGISTRY.json": "MUSIC_KEYWORD_REGISTRY.json",
    "LOC3_PENDING_WORKS.json": "MUSIC_PENDING_WORKS.json",
    "LOC3_PERIOD_KEYWORD_ANALYSIS.json": "MUSIC_PERIOD_KEYWORD_ANALYSIS.json",
    "LOC3_REASONING_SCHEMA.json": "MUSIC_REASONING_SCHEMA.json",
    "LOC3_RUNE_SONG_REGISTRY.json": "MUSIC_RUNE_SONG_REGISTRY.json",
    "LOC3_SONG_ORIGIN_KM_20260916.json": "MUSIC_SONG_ORIGIN_KM_20260916.json",
    "LOC4_LOC6_BOUNDARY_REGISTRY.json": "WRITING_GOVERNANCE_BOUNDARY_REGISTRY.json",
    "LOC4_MOON_SPEAKER_RUNE_RECOVERY.json": "WRITING_MOON_SPEAKER_RUNE_RECOVERY.json",
    "LOC4_TEXT_ANALYSIS_REGISTRY.json": "WRITING_TEXT_ANALYSIS_REGISTRY.json",
    "LOC4_THREADS_KM_INDEX.json": "LO3RWANG_THREADS_KM_INDEX.json",
    "LOC4_WRITING_REGISTRY.json": "WRITING_REGISTRY.json",
    "LOC5_MEDIA_RECOVERY_REGISTRY.json": "MEDIA_RECOVERY_REGISTRY.json",
    "LOC6_DUAL_RUNE_RELATION_REGISTRY.json": "LUNARUNES_DUAL_RUNE_RELATION_REGISTRY.json",
    "LOC6_ERA_STYLE_EVIDENCE.json": "LO3RWANG_ERA_STYLE_EVIDENCE.json",
    "LOC6_GOVERNANCE_REGISTRY.json": "LO3RWANG_GOVERNANCE_REGISTRY.json",
    "LOC6_PERIOD_KEYWORD_ANALYSIS.json": "LO3RWANG_PERIOD_KEYWORD_ANALYSIS.json",
    "LOC6_RUNE_INTERPRETATION_REGISTRY.json": "LUNARUNES_RUNE_INTERPRETATION_REGISTRY.json",
    "LOC6_RUNE_METHODOLOGY_REGISTRY.json": "LUNARUNES_RUNE_METHODOLOGY_REGISTRY.json",
    "LOC7_LINGUISTIC_ANALYSIS_REGISTRY.json": "ANALYSIS_LINGUISTIC_REGISTRY.json",
    "LOC8_DAILY_RUNE_REPO_HISTORY.json": "LUNARUNES_DAILY_RUNE_REPO_HISTORY.json",
    "LOC8_DAILY_RUNE_SNAPSHOT.json": "LUNARUNES_DAILY_RUNE_SNAPSHOT.json",
    "LOC8_EVENT_SNAPSHOT.json": "CONTEXT_EVENT_SNAPSHOT.json",
    "LOC8_RELATION_SCHEMA.json": "CONTEXT_RELATION_SCHEMA.json",
}

ID_MAP = {k.removesuffix(".json"): v.removesuffix(".json") for k, v in PATH_MAP.items()}

FAMILY_AUTHORITY = {
    "LUNARUNES_": "LunaRunes",
    "LO3RWANG_": "lo3rwang",
    "MUSIC_": "Music",
    "WRITING_": "Writing",
    "MEDIA_": "Media",
    "CONTEXT_": "Context",
    "ANALYSIS_": "Analysis",
}

OLD_SCOPE_DEFAULT = {
    "LOC1": "LunaRunes",
    "LOC2": "Context",
    "LOC3": "Music",
    "LOC4": "Writing",
    "LOC5": "Media",
    "LOC6": "lo3rwang",
    "LOC7": "Analysis",
    "LOC8": "LOC",
    "LOC1_KM": "LunaRunes",
    "LOC7_KM": "Analysis",
}

HISTORICAL_KEYS = ("historical", "provenance", "legacy", "former", "superseded", "compatibility")


def is_historical_key(key: str) -> bool:
    lower = key.lower()
    return any(token in lower for token in HISTORICAL_KEYS)


def authority_for_filename(name: str) -> str | None:
    for prefix, authority in FAMILY_AUTHORITY.items():
        if name.startswith(prefix):
            return authority
    special = {
        "LOC_CROSS_RELATIONSHIP_REGISTRY.json": "Context",
        "LOC_GRAPH_SCHEMA.json": "Context",
        "LOC_GRAPH_EVAL_CASES.json": "Analysis",
        "LOC_KM_KEYWORDS.json": "Analysis",
        "LOC_KNOWLEDGE_ASSET_REGISTRY.json": "LOC",
        "LOC_MEDIA_REGISTRY.json": "Media",
        "LOC_SOURCE_ACTIVITY_REGISTRY.json": "LOC",
    }
    return special.get(name)


def scope_from_path(value: str, fallback: str | None = None) -> str | None:
    for old, new in PATH_MAP.items():
        value = value.replace(f"data/json/registries/{old}", f"data/json/registries/{new}")
        value = value.replace(old, new)
    upper = value.upper()
    for prefix, scope in FAMILY_AUTHORITY.items():
        if prefix in upper:
            return scope
    return fallback


def replace_paths_and_ids(text: str) -> str:
    for old, new in PATH_MAP.items():
        text = text.replace(f"data/json/registries/{old}", f"data/json/registries/{new}")
        text = text.replace(old, new)
    for old, new in ID_MAP.items():
        text = text.replace(old, new)
    return text


def rewrite_text(text: str) -> str:
    text = replace_paths_and_ids(text)
    replacements = {
        "LOC2 owns relation/context semantics": "Context owns relation/context semantics",
        "LOC2 owns scenario-event definitions": "Context owns scenario-event definitions",
        "LOC7 implements Graph RAG traversal/retrieval algorithms": "Analysis implements Graph RAG traversal/retrieval algorithms",
        "LOC8 consumes graph projections": "Evolution consumes graph projections",
        "Media assets are owned by LOC5": "Media assets are governed by the Media feature",
        "LOC3 owns keyword evidence": "Music owns keyword evidence",
        "LOC8 owns period boundaries": "period boundaries are governed by the owning Scope",
        "LOC7 may index": "Analysis may index",
        "Facebook/Threads are LOC4 life writing": "Facebook/Threads are Writing-source records in the lo3rwang Scope",
        "LOC6 owns derived meaning/governance/Zhengde-style/style-state/rune interpretation records": "lo3rwang governs personal meaning, governance and Zhengde-style records; LunaRunes governs rune interpretation records",
        "ordinary work/chapter literary-semantic analysis remain LOC4": "ordinary work/chapter literary-semantic analysis remains governed by Writing",
        "Aggregate LOC3 work metadata back into LOC6 ERA style analysis. ERA dates/names remain owned by LOC8.": "Aggregate Music work metadata into lo3rwang ERA style analysis. ERA dates and names remain governed by the lo3rwang Scope.",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def transform(value, filename: str, *, historical: bool = False, parent_key: str = ""):
    if isinstance(value, list):
        return [transform(v, filename, historical=historical, parent_key=parent_key) for v in value]
    if not isinstance(value, dict):
        if isinstance(value, str) and not historical:
            return rewrite_text(value)
        return value

    out = {}
    file_auth = authority_for_filename(filename)
    for key, child in value.items():
        child_historical = historical or is_historical_key(key)
        new_key = key
        if not child_historical:
            if key == "loc3_evidence":
                new_key = "music_evidence"
            elif key == "related_locs":
                new_key = "related_scopes"

        if child_historical:
            out[new_key] = transform(child, filename, historical=True, parent_key=key)
            continue

        if isinstance(child, str):
            child = rewrite_text(child)
            if key in {"registry"} and child in ID_MAP:
                child = ID_MAP[child]
            if key in {"authority", "owner", "owner_rule", "scope"} and child in OLD_SCOPE_DEFAULT:
                child = file_auth or OLD_SCOPE_DEFAULT[child]
            if key == "primary_loc" and child in OLD_SCOPE_DEFAULT:
                child = file_auth or OLD_SCOPE_DEFAULT[child]
            out[new_key] = child
        else:
            out[new_key] = transform(child, filename, historical=False, parent_key=key)

    # File-level Current authority is determined by the owning Scope/Feature.
    if file_auth:
        if "registry" in out and filename.removesuffix(".json") in {
            "LO3RWANG_ERA_STYLE_EVIDENCE", "LO3RWANG_GOVERNANCE_REGISTRY", "LO3RWANG_MUSIC_ANNOTATION_REGISTRY",
            "LO3RWANG_PERIOD_KEYWORD_ANALYSIS", "LO3RWANG_THREADS_KM_INDEX", "LUNARUNES_OW3GS_READING_REGISTRY",
            "LUNARUNES_RUNE_INTERPRETATION_REGISTRY", "LUNARUNES_THREE_RUNE_NARRATIVE_EVIDENCE", "MUSIC_PENDING_WORKS",
            "MUSIC_PERIOD_KEYWORD_ANALYSIS", "MUSIC_RUNE_SONG_REGISTRY", "MUSIC_SONG_ORIGIN_KM_20260916",
            "WRITING_GOVERNANCE_BOUNDARY_REGISTRY", "WRITING_MOON_SPEAKER_RUNE_RECOVERY", "WRITING_REGISTRY",
            "WRITING_TEXT_ANALYSIS_REGISTRY"
        }:
            out["registry"] = filename.removesuffix(".json")
        if "authority" in out and isinstance(out["authority"], str) and out["authority"] in OLD_SCOPE_DEFAULT:
            out["authority"] = file_auth

    return out


def postprocess(filename: str, doc: dict) -> dict:
    # Explicit file semantics where retired distributions had overloaded meanings.
    if filename == "LO3RWANG_ERA_STYLE_EVIDENCE.json":
        doc["registry"] = "LO3RWANG_ERA_STYLE_EVIDENCE"
        doc["authority"] = "lo3rwang"
    elif filename == "LO3RWANG_GOVERNANCE_REGISTRY.json":
        doc["registry"] = "LO3RWANG_GOVERNANCE_REGISTRY"
        doc["authority"] = "lo3rwang"
        if isinstance(doc.get("fragment_schema"), dict):
            fields = doc["fragment_schema"].get("fields")
            if isinstance(fields, dict) and fields.get("primary_loc") == "LOC6":
                fields["primary_loc"] = "lo3rwang"
    elif filename == "LO3RWANG_MUSIC_ANNOTATION_REGISTRY.json":
        doc["registry"] = "LO3RWANG_MUSIC_ANNOTATION_REGISTRY"
        doc["authority"] = "lo3rwang"
    elif filename == "LO3RWANG_PERIOD_KEYWORD_ANALYSIS.json":
        doc["registry"] = "LO3RWANG_PERIOD_KEYWORD_ANALYSIS"
    elif filename == "LO3RWANG_THREADS_KM_INDEX.json":
        doc["registry"] = "LO3RWANG_THREADS_KM_INDEX"
        doc["authority"] = "lo3rwang"
        if doc.get("primary_loc") in {"LOC4", "Writing"}:
            doc["primary_loc"] = "lo3rwang"
    elif filename == "LOC_CROSS_RELATIONSHIP_REGISTRY.json":
        doc["authority"] = "Context"
    elif filename == "LOC_GRAPH_SCHEMA.json":
        doc["authority"] = "Context"
        if isinstance(doc.get("public_access"), dict):
            doc["public_access"]["owner"] = "Analysis"
    elif filename == "LOC_GRAPH_EVAL_CASES.json":
        doc["authority"] = "Analysis"
    elif filename == "LOC_KM_KEYWORDS.json":
        if isinstance(doc.get("governance"), dict):
            doc["governance"]["authority"] = "Analysis"
    elif filename == "LOC_KNOWLEDGE_ASSET_REGISTRY.json":
        doc["authority"] = "LOC"
        for asset in doc.get("assets", []):
            if not isinstance(asset, dict):
                continue
            path = str(asset.get("path", ""))
            old = asset.get("primary_loc")
            fallback = OLD_SCOPE_DEFAULT.get(old, old)
            if old == "LOC8":
                fallback = "LOC"
            if old == "LOC6" and "LUNARUNES_" in path.upper():
                fallback = "LunaRunes"
            asset["primary_loc"] = scope_from_path(path, fallback) or "LOC"
            if "related_locs" in asset:
                asset["related_scopes"] = [OLD_SCOPE_DEFAULT.get(x, x) for x in asset.pop("related_locs")]
    elif filename == "LOC_MEDIA_REGISTRY.json":
        doc["authority"] = "Media"
        for item in doc.get("items", []):
            if isinstance(item, dict) and item.get("primary_loc") == "LOC5":
                item["primary_loc"] = "Media"
            if isinstance(item, dict) and "related_locs" in item:
                item["related_scopes"] = [OLD_SCOPE_DEFAULT.get(x, x) for x in item.pop("related_locs")]
    elif filename == "LOC_SOURCE_ACTIVITY_REGISTRY.json":
        if doc.get("authority") == "LOC8":
            doc["authority"] = "LOC"
    elif filename.startswith("LUNARUNES_"):
        if "registry" in doc and str(doc["registry"]).startswith("LOC"):
            doc["registry"] = filename.removesuffix(".json")
        if doc.get("authority") in OLD_SCOPE_DEFAULT:
            doc["authority"] = "LunaRunes"
        if isinstance(doc.get("record_schema"), dict) and doc["record_schema"].get("primary_loc") == "LOC6":
            doc["record_schema"]["primary_loc"] = "LunaRunes"
    elif filename.startswith("MUSIC_"):
        if "registry" in doc and str(doc["registry"]).startswith("LOC"):
            doc["registry"] = filename.removesuffix(".json")
        if doc.get("authority") in OLD_SCOPE_DEFAULT:
            doc["authority"] = "Music"
        if doc.get("primary_loc") in OLD_SCOPE_DEFAULT:
            doc["primary_loc"] = "Music"
        if filename == "MUSIC_SONG_ORIGIN_KM_20260916.json":
            for song in doc.get("songs", []):
                if isinstance(song, dict):
                    if isinstance(song.get("author_source_text"), dict):
                        song["author_source_text"]["primary_loc"] = "Writing"
                    if isinstance(song.get("generated_lyrics"), dict):
                        song["generated_lyrics"]["primary_loc"] = "Music"
    elif filename.startswith("WRITING_"):
        if "registry" in doc and str(doc["registry"]).startswith("LOC"):
            doc["registry"] = filename.removesuffix(".json")
        if doc.get("authority") in OLD_SCOPE_DEFAULT:
            doc["authority"] = "Writing"
        if isinstance(doc.get("work_schema"), dict):
            fields = doc["work_schema"].get("fields")
            if isinstance(fields, dict) and fields.get("primary_loc") == "LOC4":
                fields["primary_loc"] = "Writing"
        for work in doc.get("works", []):
            if not isinstance(work, dict):
                continue
            if work.get("primary_loc") == "LOC4":
                work["primary_loc"] = "Writing"
            pa = work.get("period_assignment")
            if isinstance(pa, dict) and pa.get("authority") == "LOC8":
                pa["authority"] = "lo3rwang"
    return doc


def main() -> None:
    changed = []
    for path in sorted(REG.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        transformed = postprocess(path.name, transform(doc, path.name))
        rendered = json.dumps(transformed, ensure_ascii=False, indent=2) + "\n"
        current = path.read_text(encoding="utf-8")
        if rendered != current:
            path.write_text(rendered, encoding="utf-8")
            changed.append(path.relative_to(ROOT).as_posix())
    print(f"migrated {len(changed)} Current registries")
    for path in changed:
        print(path)


if __name__ == "__main__":
    main()
