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
]

REQUIRED_PATHS = [
    ROOT / "data" / "json" / "core" / "runes64.json",
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

CANONICAL_LOC_MAP = {
    "LOC1": {"name": "LunaRunes", "zh": "月之符文", "role": "符文語彙（Token）"},
    "LOC2": {"name": "Context", "zh": "脈絡", "role": "脈絡"},
    "LOC3": {"name": "Music", "zh": "音樂", "role": "音樂"},
    "LOC4": {"name": "Literary", "zh": "文字創作", "role": "文字創作"},
    "LOC5": {"name": "MultiMedia", "zh": "多媒體", "role": "多媒體"},
    "LOC6": {"name": "Methodology", "zh": "方法論", "role": "方法論"},
    "LOC7": {"name": "Algorithm", "zh": "演算法（知識庫）", "role": "演算法（知識庫）"},
    "LOC8": {"name": "Evolution", "zh": "推演", "role": "推演"},
}

CANONICAL_SURFACE_SNIPPETS = {
    "README.md": [
        "| LOC1 | LunaRunes 月之符文 |",
        "| LOC5 | MultiMedia 多媒體 |",
        "| LOC6 | Methodology 方法論 |",
        "| LOC7 | Algorithm 演算法（知識庫） |",
        "| LOC8 | Evolution 推演 |",
    ],
    "index.html": [
        "kicker:'LOC1 · LunaRunes'",
        "kicker:'LOC5 · MultiMedia'",
        "kicker:'LOC6 · Methodology'",
        "kicker:'LOC7 · Algorithm'",
        "kicker:'LOC8 · Evolution'",
    ],
    "data/json/search/faq/LOC_FAQ_v0.4.json": [
        "LOC5 MultiMedia／多媒體",
        "LOC6 Methodology／方法論",
        "LOC7 Algorithm／演算法（知識庫）",
        "LOC8 Evolution／推演",
    ],
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> int:
    failures: list[str] = []

    for path in FORBIDDEN_PATHS:
        if path.exists():
            failures.append(f"forbidden path exists: {rel(path)}")

    for path in REQUIRED_PATHS:
        if not path.exists():
            failures.append(f"required path missing: {rel(path)}")

    # LOC1–8 naming/role Canon must be single-source and exact.
    language_registry_path = ROOT / "data" / "json" / "registries" / "LOC_LANGUAGE_SYSTEM_REGISTRY.json"
    try:
        language_registry = json.loads(language_registry_path.read_text(encoding="utf-8"))
        system = (language_registry.get("systems") or [None])[0] or {}
        actual_map = system.get("canonical_loc_map")
        if actual_map != CANONICAL_LOC_MAP:
            failures.append(
                "LOC1-8 canonical map drifted from validator contract: "
                "data/json/registries/LOC_LANGUAGE_SYSTEM_REGISTRY.json"
            )
        if language_registry.get("canonical_priority") != "highest_for_LOC1_8_names_and_roles":
            failures.append("LOC1-8 canonical priority is not locked in language-system registry")
        if language_registry.get("canon_version") != "1.0" or language_registry.get("canon_status") != "formal":
            failures.append("current LOC Canon is not locked to formal 1.0")
        constants = system.get("fixed_constants") or {}
        if constants.get("loc_range") != "LOC1–LOC8 only; LOC9 does not exist":
            failures.append("LOC range constant drifted: LOC must remain LOC1–LOC8 only")
        if constants.get("lunarunes_count") != 66:
            failures.append("LunaRunes fixed count drifted from 66")
        if constants.get("context_zh") != "脈絡":
            failures.append("LOC2 canonical Chinese term must remain 脈絡")
    except Exception as exc:
        failures.append(f"failed to validate LOC1-8 canonical map: {exc}")

    # Key current surfaces must project the Canon instead of inventing another mapping.
    for rp, snippets in CANONICAL_SURFACE_SNIPPETS.items():
        path = ROOT / rp
        try:
            content = path.read_text(encoding="utf-8")
        except Exception as exc:
            failures.append(f"failed to read canonical surface {rp}: {exc}")
            continue
        for snippet in snippets:
            if snippet not in content:
                failures.append(f"canonical LOC label missing from {rp}: {snippet!r}")

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
    print("- JSON roles: core / registries / sources / search / generated / archive / experimental / inbox")
    print("- no forbidden legacy data paths")
    print("- no stale runtime/document references")
    print("- every repository-relative JSON reference resolves to an existing file")
    print("- no public HTML/JS links expose raw Markdown files")
    print("- LOC1-8 canonical naming/roles are locked and projected consistently")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
