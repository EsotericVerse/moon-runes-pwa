from __future__ import annotations

from pathlib import Path
import re
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
    "data/json/shared/",
    "data/json/runtime/card_api/",
]

TEXT_SUFFIXES = {".py", ".js", ".html", ".md", ".json", ".yml", ".yaml", ".xml", ".txt"}

JSON_REFERENCE_PATTERNS = [
    ("fetch", re.compile(r"""fetch\(\s*["'`]([^"'\`?#]+\.json)(?:\?[^"'\`]*)?["'`]""")),
    ("core_json", re.compile(r"""core_json\(\s*["']([^"']+\.json)["']\s*\)""")),
    ("registry_json", re.compile(r"""registry_json\(\s*["']([^"']+\.json)["']\s*\)""")),
    ("search_json", re.compile(r"""search_json\(\s*["']([^"']+)["']\s*,\s*["']([^"']+\.json)["']\s*\)""")),
]

def json_reference_target(kind: str, match: re.Match[str], source: Path) -> Path:
    if kind == "core_json":
        return ROOT / "data" / "json" / "core" / match.group(1)
    if kind == "registry_json":
        return ROOT / "data" / "json" / "registries" / match.group(1)
    if kind == "search_json":
        return ROOT / "data" / "json" / "search" / match.group(1) / match.group(2)
    raw = match.group(1).lstrip("/")
    # Browser fetch paths in this repository are site-root relative even when
    # the fetch call lives inside js/*.js modules.
    return ROOT / raw


SKIP_PREFIXES = (
    "data/json/archive/",
)
SKIP_FILES = {
    "docs/REPOSITORY_GOVERNANCE.md",
    "card_api/scripts/validate_repo_layout.py",
    "engine/README.md",
}

JSON_PATH_RE = re.compile(
    r"""(?P<path>/?(?:data|card_api|engine|loc8_api)/[A-Za-z0-9_./-]+\.json(?:\.gz)?)"""
)

HTML_JS_PATH_RE = re.compile(
    r"""(?P<path>(?:\./|/)?[A-Za-z0-9_./-]+\.(?:html|js))(?:[?#][^"'\s<]*)?"""
)


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
        for kind, pattern in JSON_REFERENCE_PATTERNS:
            for match in pattern.finditer(content):
                target = json_reference_target(kind, match, path)
                if not target.exists():
                    failures.append(
                        f"missing JSON reference via {kind}: {rp} -> {rel(target)}"
                    )

        # Repository-relative JSON references are executable/data contracts.
        # Verify the referenced file actually exists after every path migration.
        for match in JSON_PATH_RE.finditer(content):
            target = match.group("path").lstrip("/")
            if not (ROOT / target).is_file():
                failures.append(f"missing JSON target {target!r}: referenced by {rp}")

        # HTML/JS routes and module references are runtime contracts.
        # Keep this check to executable/configuration surfaces; Markdown may
        # legitimately mention historical or external URLs.
        if path.suffix.lower() in {".html", ".js", ".json", ".yml", ".yaml"}:
            for match in HTML_JS_PATH_RE.finditer(content):
                raw = match.group("path")
                if "://" in raw:
                    continue
                if raw.startswith("/"):
                    target = raw.lstrip("/")
                elif raw.startswith("./") or raw.startswith("../"):
                    candidate = (ROOT / Path(rp).parent / raw).resolve()
                    try:
                        target = candidate.relative_to(ROOT.resolve()).as_posix()
                    except ValueError:
                        failures.append(f"HTML/JS target escapes repository {raw!r}: referenced by {rp}")
                        continue
                else:
                    # Bare module names inside JS resolve beside that module.
                    if path.suffix.lower() == ".js" and "/" not in raw:
                        target = (Path(rp).parent / raw).as_posix()
                    else:
                        target = raw
                if target.startswith("data/json/archive/"):
                    continue
                if not (ROOT / target).is_file():
                    failures.append(f"missing HTML/JS target {target!r}: referenced by {rp}")

    if failures:
        print("Repository layout validation FAILED")
        for item in failures:
            print(f"- {item}")
        return 1

    print("Repository layout validation PASS")
    print("- JSON roles: core / registries / search / generated / archive / experimental")
    print("- no forbidden legacy data paths")
    print("- no stale runtime/document references")
    print("- all static JSON fetch/path-helper references resolve to existing files")
    print("- every repository-relative JSON reference resolves to an existing file")
    print("- every current HTML/JS route/module reference resolves to an existing file")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
