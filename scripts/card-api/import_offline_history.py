#!/usr/bin/env python3
"""Import deduplicated KKCity/Wretch author text into LOC4 search shards."""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "data/json/generated/loc4/offline_history"
SHARD_SIZE = 100
RESTRICTED = {"爭議文章"}


def main(source: Path) -> None:
    rows = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines() if line.strip()]
    docs = []
    excluded = []
    for row in rows:
        classes = set(row.get("classification") or [])
        if not row.get("is_owner_authored") or classes & RESTRICTED:
            if classes & RESTRICTED:
                excluded.append(row.get("record_id"))
            continue
        platform = "KKCity" if row.get("platform") == "KKCity" else "無名小站"
        text = row.get("full_text") or ""
        docs.append({
            "id": row["record_id"], "title": row.get("title") or "（無標題）",
            "date": str(row.get("date_iso") or "")[:10], "author_id": row.get("author_id"),
            "platform": platform, "source_type": "offline_archive", "source_role": "author_post",
            "content_type": "text_record", "primary_loc": "LOC4",
            "related_locs": ["LOC6", "LOC7", "LOC8"], "display_policy": "full",
            "searchable": True, "classification": sorted(classes), "text": text, "char_count": len(text),
            "provenance": {"offline_only": True, "site_closed": True, "external_url": None,
                "source_path": row.get("source_path"), "raw_sha256": row.get("raw_sha256"),
                "normalized_sha256": row.get("normalized_sha256"), "source_aliases": row.get("source_aliases") or []},
        })
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("LOC4_OFFLINE_HISTORY_*.json"):
        old.unlink()
    shards = []
    for index in range(0, len(docs), SHARD_SIZE):
        part = docs[index:index + SHARD_SIZE]
        name = f"LOC4_OFFLINE_HISTORY_{index // SHARD_SIZE + 1:02d}.json"
        (OUT / name).write_text(json.dumps({"schema_version": "1.0", "documents": part}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        shards.append({"path": f"data/json/generated/loc4/offline_history/{name}", "document_count": len(part)})
    manifest = {"schema_version": "1.0", "dataset": "LOC4 closed-platform authored history",
        "authority": "LOC4", "status": "searchable_fulltext", "generated_at": date.today().isoformat(),
        "document_count": len(docs), "excluded_restricted_count": len(excluded),
        "deduplication": "normalized full-text SHA-256; one canonical record per article",
        "display_policy": "click_to_expand_full_text", "line_break_policy": "preserve; HTML white-space: pre-wrap",
        "closed_platforms": ["KKCity", "無名小站"],
        "external_url_policy": "No URL required or fabricated for closed-platform offline archives.",
        "restricted_classifications": sorted(RESTRICTED), "shards": shards}
    (OUT / "LOC4_OFFLINE_HISTORY_MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"imported": len(docs), "excluded": len(excluded), "shards": len(shards)}, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: import_offline_history.py OWNER_FULLTEXT_PRIVATE.jsonl")
    main(Path(sys.argv[1]).resolve())
