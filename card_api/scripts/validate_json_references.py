from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

RUNTIME_SUFFIXES = {".py", ".js", ".html", ".yml", ".yaml"}
SKIP_PREFIXES = ("data/json/archive/",)
PATH_RE = re.compile(r"""["'`](?P<path>(?:\.{0,2}/)?(?:data|card_api|engine|loc8_api)/[^"'`\s<>]*?\.json)["'`]""")
ROOT_JSON_RE = re.compile(r"""["'`](?P<path>manifest\.json)["'`]""")

HELPERS = [
    (re.compile(r"""core_json\(\s*["']([^"']+\.json)["']\s*\)"""), lambda m: ROOT / "data/json/core" / m.group(1)),
    (re.compile(r"""registry_json\(\s*["']([^"']+\.json)["']\s*\)"""), lambda m: ROOT / "data/json/registries" / m.group(1)),
    (re.compile(r"""search_json\(\s*["']([^"']+)["']\s*,\s*["']([^"']+\.json)["']\s*\)"""), lambda m: ROOT / "data/json/search" / m.group(1) / m.group(2)),
]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def resolve_literal(source: Path, raw: str) -> Path:
    raw = raw.split("?", 1)[0].split("#", 1)[0]
    if raw.startswith("/"):
        return ROOT / raw.lstrip("/")
    if raw.startswith("../") or raw.startswith("./"):
        return (source.parent / raw).resolve()
    return ROOT / raw


def iter_registry_paths(value):
    if isinstance(value, dict):
        for item in value.values():
            yield from iter_registry_paths(item)
    elif isinstance(value, list):
        for item in value:
            yield from iter_registry_paths(item)
    elif isinstance(value, str):
        clean = value.split("?", 1)[0].split("#", 1)[0]
        if clean.endswith(".json") and "/" in clean and not clean.startswith(("http://", "https://")):
            yield clean


def main() -> int:
    failures: list[str] = []
    checked: set[tuple[str, str]] = set()

    # Runtime source references: HTML / JS / Python / workflows.
    for source in ROOT.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in RUNTIME_SUFFIXES:
            continue
        rp = rel(source)
        if any(rp.startswith(prefix) for prefix in SKIP_PREFIXES):
            continue
        try:
            content = source.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for regex in (PATH_RE, ROOT_JSON_RE):
            for match in regex.finditer(content):
                raw = match.group("path")
                target = resolve_literal(source, raw)
                key = (rp, raw)
                if key in checked:
                    continue
                checked.add(key)
                if not target.exists():
                    failures.append(f"missing JSON reference: {rp} -> {raw}")

        for regex, resolver in HELPERS:
            for match in regex.finditer(content):
                target = resolver(match)
                raw = rel(target) if target.is_absolute() and str(target).startswith(str(ROOT)) else str(target)
                key = (rp, raw)
                if key in checked:
                    continue
                checked.add(key)
                if not target.exists():
                    failures.append(f"missing JSON helper target: {rp} -> {raw}")

    # Structured registries carry provenance/path references used by KM/Search.
    registry_root = ROOT / "data/json/registries"
    for source in registry_root.glob("*.json"):
        try:
            payload = json.loads(source.read_text(encoding="utf-8"))
        except Exception as exc:
            failures.append(f"invalid registry JSON: {rel(source)} -> {exc}")
            continue
        for raw in iter_registry_paths(payload):
            # Bare filenames are intentionally ignored; only repository paths are checked.
            target = resolve_literal(source, raw)
            key = (rel(source), raw)
            if key in checked:
                continue
            checked.add(key)
            if not target.exists():
                failures.append(f"missing registry JSON path: {rel(source)} -> {raw}")

    if failures:
        print("JSON reference validation FAILED")
        for item in failures:
            print(f"- {item}")
        return 1

    print("JSON reference validation PASS")
    print(f"- checked {len(checked)} static JSON references")
    print("- runtime source paths exist")
    print("- registry JSON paths exist")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
