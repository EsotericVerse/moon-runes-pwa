from __future__ import annotations

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]

FORBIDDEN_PATHS = [
    ROOT / "data" / "shared",
    ROOT / "data" / "generated",
    ROOT / "data" / "archive",
    ROOT / "card_api" / "data",
    ROOT / "temp.json",
    ROOT / "mp3" / "my.mp3",
    ROOT / "LOC_LOC_LunaCodex_OW3gs.md",
    ROOT / "data" / "json" / "facebook",
    ROOT / "data" / "json" / "fb-semantic-summary.json",
    ROOT / "js" / "runes_all_data.js",
    ROOT / "statics.htm",
    ROOT / "statics.htmll",
]

REQUIRED_PATHS = [
    ROOT / "statics.html",
    ROOT / "data" / "json" / "core" / "runes66.json",
    ROOT / "data" / "json" / "core" / "rune_interpretations.json",
    ROOT / "data" / "json" / "core" / "three_card_combinations.json",
    ROOT / "data" / "json" / "core" / "lots.json",
    ROOT / "data" / "json" / "registries" / "LOC_SHARED_MANIFEST.json",
    ROOT / "data" / "json" / "registries" / "LOC_LANGUAGE_SYSTEM_REGISTRY.json",
    ROOT / "data" / "json" / "search" / "faq" / "LOC_FAQ_v0.4.json",
    ROOT / "data" / "json" / "search" / "faq" / "LOC_FAQ_RAG_v0.4.json",
    ROOT / "data" / "json" / "search" / "loc3" / "LOC3_LYRICS_SEARCH_v0.1.json",
    ROOT / "data" / "json" / "sources" / "facebook" / "manifest.json",
    ROOT / "data" / "json" / "generated" / "facebook" / "fb-semantic-summary.json",
    ROOT / "card_api" / "paths.py",
]

STALE_TOKENS = [
    "data/shared/",
    "data/generated/",
    "data/archive/",
    "card_api/data/",
    "card_api/new_runes.json",
    "card_api/runes_all_data.json",
    "card_api/three_card_combinations.json",
    "engine/runes07.json",
    "engine/runes_all_data.json",
    "engine/runes64_alldata.json",
    "data/json/shared/",
    "data/json/runtime/card_api/",
    "data/json/facebook/",
    "data/json/fb-semantic-summary.json",
]

TEXT_SUFFIXES = {".py", ".js", ".html", ".md", ".json", ".yml", ".yaml", ".xml", ".txt"}
SKIP_PREFIXES = (
    "data/json/archive/",
)
SKIP_FILES = {
    "card_api/scripts/validate_repo_layout.py",
    "engine/README.md",
}
SKIP_JSON_TARGET_PREFIXES = (
    "data/json/inbox/",
)

JSON_PATH_RE = re.compile(
    r"""(?P<path>/?(?:data|card_api|engine|loc8_api)/[A-Za-z0-9_./-]+\.json(?:\.gz)?)"""
)

PUBLIC_MD_LINK_RE = re.compile(
    r"""href\s*[:=]\s*["'][^"']+\.md(?:[?#][^"']*)?["']""",
    re.IGNORECASE,
)

SEMANTIC_DOMAINS = {
    "runes",
    "context",
    "music",
    "literary",
    "media",
    "governance",
    "knowledge",
    "evolution",
    "global",
}

HOMEPAGE_LOC_LABELS = tuple(f"LOC{i}" for i in range(1, 9))


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> int:
    failures: list[str] = []

    for path in FORBIDDEN_PATHS:
        if path.exists():
            failures.append(f"forbidden path exists: {rel(path)}")

    # statics.html is the only allowed statistics-page filename.
    for candidate in ROOT.glob("statics.htm*"):
        if candidate.is_file() and candidate.name != "statics.html":
            failures.append(f"duplicate/malformed statics page exists: {rel(candidate)}")

    for path in REQUIRED_PATHS:
        if not path.exists():
            failures.append(f"required path missing: {rel(path)}")

    # LOC1–8 are explanatory classification labels only.
    # Backend governance must use semantic domains instead of LOC-number ownership.
    language_registry_path = ROOT / "data" / "json" / "registries" / "LOC_LANGUAGE_SYSTEM_REGISTRY.json"
    shared_schema_path = ROOT / "data" / "json" / "registries" / "LOC_SHARED_SCHEMA.json"
    try:
        language_registry = json.loads(language_registry_path.read_text(encoding="utf-8"))
        system = (language_registry.get("systems") or [None])[0] or {}
        constants = system.get("fixed_constants") or {}

        if constants.get("lunarunes_count") != 66:
            failures.append("LunaRunes fixed count drifted from 66")

        homepage_usage = system.get("public_concept_map_usage")
        if homepage_usage != "homepage_only":
            failures.append("LOC1-8 classification labels must remain homepage-only explanatory metadata")

        homepage_note = str(system.get("public_concept_map_note") or "")
        if "homepage" not in homepage_note.lower():
            failures.append("language-system registry must state that LOC1-8 are explanatory homepage labels only")

        backend_domains = system.get("backend_domains") or {}
        invalid_domains = sorted(
            {str(k) for k in backend_domains.keys() if str(k) not in SEMANTIC_DOMAINS}
        )
        if invalid_domains:
            failures.append(f"invalid backend semantic domain ids in language-system registry: {invalid_domains}")

        shared_schema = json.loads(shared_schema_path.read_text(encoding="utf-8"))
        domain_spec = ((shared_schema.get("required_common_fields") or {}).get("domain")
                       or (shared_schema.get("properties") or {}).get("domain")
                       or {})
        enum_values = set(domain_spec.get("enum") or [])
        if enum_values and enum_values != SEMANTIC_DOMAINS:
            failures.append(
                "shared schema semantic domain enum drifted from governance contract: "
                f"{sorted(enum_values)}"
            )
    except Exception as exc:
        failures.append(f"failed to validate semantic-domain governance: {exc}")

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        rp = rel(path)
        if rp in SKIP_FILES or any(rp.startswith(prefix) for prefix in SKIP_PREFIXES):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for token in STALE_TOKENS:
            if token in content:
                failures.append(f"stale path token {token!r}: {rp}")

        # Public web surfaces must route knowledge through Search/Web views.
        # Never expose raw Markdown files as clickable links from HTML/JS.
        if path.suffix.lower() in {".html", ".js"} and PUBLIC_MD_LINK_RE.search(content):
            failures.append(f"public .md link exposed in web surface: {rp}")

        # Repository-relative JSON references are executable/data contracts.
        # Verify the referenced file actually exists after every path migration.
        for match in JSON_PATH_RE.finditer(content):
            target = match.group("path").lstrip("/")
            if any(target.startswith(prefix) for prefix in SKIP_JSON_TARGET_PREFIXES):
                continue
            if not (ROOT / target).is_file():
                failures.append(f"missing JSON target {target!r}: referenced by {rp}")

    if failures:
        print("Repository layout validation FAILED")
        for item in failures:
            print(f"- {item}")
        return 1

    print("Repository layout validation PASS")
    print("- statics.html is the only allowed statistics-page filename")
    print("- JSON roles: core / registries / sources / search / generated / archive / experimental / inbox")
    print("- no forbidden legacy data paths")
    print("- no stale runtime/document references")
    print("- every repository-relative JSON reference resolves to an existing file")
    print("- no public HTML/JS links expose raw Markdown files")
    print("- LOC1-8 remain explanatory homepage classification labels only")
    print("- backend governance uses semantic domains")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
