#!/usr/bin/env python3
"""LOC static runtime publisher.

Governance:
- JSON is the editable / versioned source of truth.
- Generated JS is the browser runtime representation.
- Runtime pages load JS only; they do not fetch JSON, KV, Render, or API data.
- Run this only when source JSON changes.

This tool intentionally stays small and dependency-free.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def publish(source: Path, target: Path, global_name: str) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "/* AUTO-GENERATED from %s. DO NOT hand-edit. */\n"
        "window.%s=%s;\n" % (source.as_posix(), global_name, encoded),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish JSON as static browser JS")
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("global_name")
    args = parser.parse_args()
    publish(args.source, args.target, args.global_name)
    print(f"published {args.source} -> {args.target} as window.{args.global_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
