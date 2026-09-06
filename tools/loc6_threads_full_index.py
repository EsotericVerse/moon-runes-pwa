#!/usr/bin/env python3
"""Build the full LOC6 Threads main-post corpus index.

Usage:
    python tools/loc6_threads_full_index.py threads_and_replies.json \
      --out data/generated/loc6/threads

The extractor preserves primary-source text and emits sharded JSON plus a manifest.
Replies are counted but remain supplemental evidence and are not copied into the
primary main-post shards.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ERA = [
    ("P0", None, "2025-02-20"),
    ("P0.5", "2025-02-21", "2025-05-06"),
    ("P1", "2025-05-07", "2025-10-15"),
    ("P2", "2025-10-16", "2026-01-14"),
    ("P3", "2026-01-15", "2026-03-08"),
    ("P4", "2026-03-09", "2026-06-09"),
    ("P5", "2026-06-10", "2026-06-30"),
    ("P6", "2026-07-01", "2026-07-31"),
    ("P7", "2026-08-01", "2026-08-31"),
    ("P8", "2026-09-01", None),
]

def repair_meta_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    try:
        repaired = value.encode("latin1").decode("utf-8")
        cjk = lambda s: sum("\u4e00" <= ch <= "\u9fff" for ch in s)
        if cjk(repaired) > cjk(value):
            return repaired
    except Exception:
        pass
    return value

def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", repair_meta_text(value)).strip()

def era_for(date: str) -> str | None:
    for era, start, end in ERA:
        if (start is None or date >= start) and (end is None or date <= end):
            return era
    return None

def extract(source: Path) -> tuple[list[dict], list[dict]]:
    raw = json.loads(source.read_text(encoding="utf-8"))
    seen: set[tuple[str, object, bool]] = set()
    docs: list[dict] = []
    for post_index, post in enumerate(raw.get("text_post_app_text_posts", [])):
        post_ts = post.get("creation_timestamp")
        candidates: list[tuple[str, object, bool, str]] = []
        top_title = normalize_text(post.get("title") or "")
        if top_title:
            candidates.append((top_title, post_ts, False, ""))
        for media in post.get("media") or []:
            text = normalize_text(media.get("title") or "")
            text_app = media.get("text_app_post") or {}
            if text:
                candidates.append((
                    text,
                    media.get("creation_timestamp") or post_ts,
                    bool(text_app.get("is_reply")),
                    text_app.get("in_reply_to_username") or "",
                ))
        for text, ts, is_reply, reply_to in candidates:
            key = (text, ts, is_reply)
            if key in seen:
                continue
            seen.add(key)
            try:
                date = (
                    datetime.fromtimestamp(int(ts), tz=timezone.utc)
                    .astimezone(ZoneInfo("Asia/Taipei"))
                    .date()
                    .isoformat()
                )
            except Exception:
                date = ""
            stable = hashlib.sha1(f"{ts}|{is_reply}|{text}".encode("utf-8")).hexdigest()[:12]
            docs.append({
                "id": f"THR-{stable}",
                "source_id": f"threads:{post_index}:{ts or 0}",
                "date": date,
                "era": era_for(date),
                "source_role": "reply" if is_reply else "main_post",
                "reply_to": reply_to or None,
                "text": text,
                "char_count": len(text),
            })
    main = sorted(
        [row for row in docs if row["source_role"] == "main_post"],
        key=lambda row: (row["date"], row["source_id"]),
    )
    replies = [row for row in docs if row["source_role"] == "reply"]
    return main, replies

def write_index(main: list[dict], replies: list[dict], out_dir: Path, shard_size: int) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    main_dir = out_dir / "main"
    main_dir.mkdir(parents=True, exist_ok=True)

    shard_rows = []
    for start in range(0, len(main), shard_size):
        number = start // shard_size + 1
        docs = main[start:start + shard_size]
        rel = f"data/generated/loc6/threads/main/part-{number:03d}.json"
        path = main_dir / f"part-{number:03d}.json"
        payload = {
            "schema_version": "1.0",
            "registry": "LOC6_THREADS_MAIN_POST_SHARD",
            "shard": number,
            "start_index": start,
            "end_index": start + len(docs) - 1,
            "document_count": len(docs),
            "documents": docs,
        }
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        shard_rows.append({"shard": number, "path": rel, "document_count": len(docs)})

    era_counts: dict[str, int] = {}
    for row in main:
        era_counts[row.get("era") or "UNASSIGNED"] = era_counts.get(row.get("era") or "UNASSIGNED", 0) + 1

    dates = [row["date"] for row in main if row.get("date")]
    manifest = {
        "schema_version": "1.0",
        "registry": "LOC6_THREADS_DOCUMENT_MANIFEST",
        "status": "working",
        "source": "threads_and_replies.json",
        "source_window": {
            "start": min(dates) if dates else None,
            "end": max(dates) if dates else None,
            "timezone": "Asia/Taipei",
        },
        "corpus_counts": {
            "deduplicated": len(main) + len(replies),
            "main_posts": len(main),
            "replies": len(replies),
        },
        "indexed_layer": {
            "role": "main_post_primary_evidence",
            "document_count": len(main),
            "shard_size": shard_size,
            "shard_count": len(shard_rows),
        },
        "era_distribution": era_counts,
        "shards": shard_rows,
        "reply_policy": "Replies remain supplemental evidence and are not included in the primary main-post shard set.",
        "governance": "Document text is primary-source evidence. Search hits, frequency and clustering do not automatically become Canon.",
    }
    (out_dir / "LOC6_THREADS_DOCUMENT_MANIFEST.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/generated/loc6/threads"))
    parser.add_argument("--shard-size", type=int, default=400)
    parser.add_argument("--expect-main", type=int, default=4578)
    parser.add_argument("--expect-replies", type=int, default=2430)
    args = parser.parse_args()

    main_posts, replies = extract(args.source)
    if args.expect_main and len(main_posts) != args.expect_main:
        raise SystemExit(f"main-post count mismatch: {len(main_posts)} != {args.expect_main}")
    if args.expect_replies and len(replies) != args.expect_replies:
        raise SystemExit(f"reply count mismatch: {len(replies)} != {args.expect_replies}")

    write_index(main_posts, replies, args.out, args.shard_size)
    print(f"LOC6 Threads index ready: {len(main_posts)} main posts / {len(replies)} replies")

if __name__ == "__main__":
    main()
