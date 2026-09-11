from __future__ import annotations

import json
import sqlite3
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = Path(__file__).resolve().parent / "generated" / "loc4_runtime_index.sqlite3"
CORPUS_MANIFEST = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "corpus" / "LOC4_TEXT_CORPUS_MANIFEST.json"
HISTORY_MANIFEST = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "offline_history" / "LOC4_OFFLINE_HISTORY_MANIFEST.json"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    corpus_manifest = _load(CORPUS_MANIFEST)
    history_manifest = _load(HISTORY_MANIFEST)

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

            CREATE TABLE authored_documents (
                ordinal INTEGER PRIMARY KEY,
                id TEXT NOT NULL,
                work_id TEXT,
                title TEXT,
                section TEXT,
                segment INTEGER,
                date TEXT,
                source_file TEXT,
                source_type TEXT,
                content_type TEXT,
                primary_loc TEXT,
                related_locs_json TEXT NOT NULL DEFAULT '[]',
                display_policy TEXT,
                text TEXT NOT NULL,
                retrieval_text TEXT NOT NULL
            );
            CREATE INDEX idx_authored_work ON authored_documents(work_id);
            CREATE INDEX idx_authored_date ON authored_documents(date);

            CREATE TABLE offline_documents (
                ordinal INTEGER PRIMARY KEY,
                id TEXT NOT NULL,
                title TEXT,
                date TEXT,
                author_id TEXT,
                platform TEXT,
                source_type TEXT,
                source_role TEXT,
                content_type TEXT,
                primary_loc TEXT,
                related_locs_json TEXT NOT NULL DEFAULT '[]',
                display_policy TEXT,
                searchable INTEGER NOT NULL DEFAULT 1,
                classification_json TEXT NOT NULL DEFAULT '[]',
                text TEXT NOT NULL,
                char_count INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX idx_offline_date ON offline_documents(date);
            CREATE INDEX idx_offline_platform ON offline_documents(platform);
            CREATE INDEX idx_offline_searchable ON offline_documents(searchable);
            """
        )

        authored_count = 0
        for shard in corpus_manifest.get("shards", []) or []:
            rel = str(shard.get("path") or "").strip()
            if not rel:
                continue
            payload = _load(REPO_ROOT / rel)
            for doc in payload.get("documents", []) or []:
                if not isinstance(doc, dict):
                    continue
                authored_count += 1
                connection.execute(
                    """
                    INSERT INTO authored_documents (
                        ordinal, id, work_id, title, section, segment, date,
                        source_file, source_type, content_type, primary_loc,
                        related_locs_json, display_policy, text, retrieval_text
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        authored_count,
                        str(doc.get("id") or f"LOC4-DOC-{authored_count}"),
                        str(doc.get("work_id") or ""),
                        str(doc.get("title") or ""),
                        str(doc.get("section") or ""),
                        int(doc.get("segment") or 0),
                        str(doc.get("date") or ""),
                        str(doc.get("source_file") or ""),
                        str(doc.get("source_type") or ""),
                        str(doc.get("content_type") or ""),
                        str(doc.get("primary_loc") or ""),
                        json.dumps(doc.get("related_locs") or [], ensure_ascii=False, separators=(",", ":")),
                        str(doc.get("display_policy") or ""),
                        str(doc.get("text") or ""),
                        str(doc.get("retrieval_text") or doc.get("text") or ""),
                    ),
                )
            del payload

        history_count = 0
        for shard in history_manifest.get("shards", []) or []:
            rel = str(shard.get("path") or "").strip()
            if not rel:
                continue
            payload = _load(REPO_ROOT / rel)
            for doc in payload.get("documents", []) or []:
                if not isinstance(doc, dict):
                    continue
                history_count += 1
                connection.execute(
                    """
                    INSERT INTO offline_documents (
                        ordinal, id, title, date, author_id, platform,
                        source_type, source_role, content_type, primary_loc,
                        related_locs_json, display_policy, searchable,
                        classification_json, text, char_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        history_count,
                        str(doc.get("id") or f"LOC4-HIST-{history_count}"),
                        str(doc.get("title") or ""),
                        str(doc.get("date") or ""),
                        str(doc.get("author_id") or ""),
                        str(doc.get("platform") or ""),
                        str(doc.get("source_type") or "offline_archive"),
                        str(doc.get("source_role") or "author_post"),
                        str(doc.get("content_type") or "text_record"),
                        str(doc.get("primary_loc") or "LOC4"),
                        json.dumps(doc.get("related_locs") or [], ensure_ascii=False, separators=(",", ":")),
                        str(doc.get("display_policy") or "full"),
                        0 if doc.get("searchable") is False else 1,
                        json.dumps(doc.get("classification") or [], ensure_ascii=False, separators=(",", ":")),
                        str(doc.get("text") or ""),
                        int(doc.get("char_count") or len(str(doc.get("text") or ""))),
                    ),
                )
            del payload

        expected_authored = corpus_manifest.get("document_count")
        expected_history = history_manifest.get("document_count")
        if isinstance(expected_authored, int) and authored_count != expected_authored:
            raise RuntimeError(f"LOC4 authored count mismatch: built={authored_count}, expected={expected_authored}")
        if isinstance(expected_history, int) and history_count != expected_history:
            raise RuntimeError(f"LOC4 history count mismatch: built={history_count}, expected={expected_history}")

        connection.commit()
        connection.execute("PRAGMA optimize")
        print(
            f"Built LOC4 runtime index: authored={authored_count}, "
            f"offline_history={history_count} -> {OUTPUT_PATH}"
        )
    finally:
        connection.close()


if __name__ == "__main__":
    main()
