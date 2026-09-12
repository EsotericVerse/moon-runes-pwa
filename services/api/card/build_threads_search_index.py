from __future__ import annotations

import json
import sqlite3
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "threads" / "LOC4_THREADS_DOCUMENT_MANIFEST.json"
OUTPUT_PATH = Path(__file__).resolve().parent / "generated" / "threads_search_index.sqlite3"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    shards = manifest.get("browser_shards") or manifest.get("shards") or []
    if not shards:
        raise RuntimeError("Threads manifest has no searchable shards")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT_PATH.exists():
        OUTPUT_PATH.unlink()

    connection = sqlite3.connect(OUTPUT_PATH)
    try:
        connection.executescript(
            """
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            PRAGMA temp_store=MEMORY;
            CREATE TABLE documents (
                ordinal INTEGER PRIMARY KEY,
                id TEXT NOT NULL,
                source_id TEXT,
                date TEXT,
                era TEXT,
                source_role TEXT,
                text TEXT NOT NULL,
                char_count INTEGER NOT NULL DEFAULT 0,
                matched_terms_json TEXT NOT NULL DEFAULT '[]'
            );
            CREATE INDEX idx_threads_date ON documents(date);
            CREATE INDEX idx_threads_era ON documents(era);
            CREATE INDEX idx_threads_role ON documents(source_role);
            """
        )

        ordinal = 0
        for shard in shards:
            rel_path = str(shard.get("path") or "").strip()
            if not rel_path:
                continue
            path = REPO_ROOT / rel_path
            payload = json.loads(path.read_text(encoding="utf-8"))
            for doc in payload.get("documents", []) or []:
                if not isinstance(doc, dict):
                    continue
                ordinal += 1
                connection.execute(
                    """
                    INSERT INTO documents (
                        ordinal, id, source_id, date, era, source_role,
                        text, char_count, matched_terms_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ordinal,
                        str(doc.get("id") or f"THR-{ordinal}"),
                        str(doc.get("source_id") or ""),
                        str(doc.get("date") or ""),
                        str(doc.get("era") or ""),
                        str(doc.get("source_role") or ""),
                        str(doc.get("text") or ""),
                        int(doc.get("char_count") or len(str(doc.get("text") or ""))),
                        json.dumps(doc.get("matched_terms") or [], ensure_ascii=False, separators=(",", ":")),
                    ),
                )
            del payload

        expected = manifest.get("browser_document_count") or (manifest.get("indexed_layer") or {}).get("document_count")
        if isinstance(expected, int) and ordinal != expected:
            raise RuntimeError(f"Threads index count mismatch: built={ordinal}, expected={expected}")

        connection.commit()
        connection.execute("PRAGMA optimize")
        print(f"Built Threads search index: {ordinal} documents -> {OUTPUT_PATH}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
