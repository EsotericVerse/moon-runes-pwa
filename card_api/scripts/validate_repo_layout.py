from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

FORBIDDEN_PATHS = [
    ROOT / "data" / "shared",
    ROOT / "data" / "generated",
    ROOT / "data" / "archive",
    ROOT / "card_api" / "data",
    ROOT / "temp.json",
    ROOT / "mp3" / "my.mp3",
    ROOT / "LOC_LOC_LunaCodex_OW3gs.md",
]

REQUIRED_PATHS = [
    ROOT / "data" / "json" / "core" / "runes64.json",
    ROOT / "data" / "json" / "core" / "rune_interpretations.json",
    ROOT / "data" / "json" / "core" / "three_card_combinations.json",
    ROOT / "data" / "json" / "core" / "lots.json",
    ROOT / "data" / "json" / "registries" / "LOC_SHARED_MANIFEST.json",
    ROOT / "data" / "json" / "search" / "faq" / "LOC_FAQ_RAG_v0.4.json",
    ROOT / "data" / "json" / "search" / "loc3" / "LOC3_LYRICS_SEARCH_v0.1.json",
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
]

TEXT_SUFFIXES = {".py", ".js", ".html", ".md", ".json", ".yml", ".yaml", ".xml", ".txt"}
SKIP_PREFIXES = (
    "data/json/archive/",
)
SKIP_FILES = {
    "docs/REPOSITORY_GOVERNANCE.md",
    "card_api/scripts/validate_repo_layout.py",
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

    if failures:
        print("Repository layout validation FAILED")
        for item in failures:
            print(f"- {item}")
        return 1

    print("Repository layout validation PASS")
    print("- JSON roles: core / registries / search / generated / archive / experimental")
    print("- no forbidden legacy data paths")
    print("- no stale runtime/document references")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
