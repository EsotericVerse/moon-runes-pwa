from __future__ import annotations

import json
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path

from keyword_analysis import keyword_counts_for_row, load_governance

CARD_API_ROOT = Path(__file__).resolve().parent
REPO_ROOT = CARD_API_ROOT.parent
FACEBOOK_ROOT = REPO_ROOT / "data" / "json" / "sources" / "facebook"
MANIFEST_PATH = FACEBOOK_ROOT / "manifest.json"
GOVERNANCE_PATH = REPO_ROOT / "data" / "json" / "registries" / "LOC_KEYWORD_GOVERNANCE.json"
OUTPUT_DIR = CARD_API_ROOT / "generated"
OUTPUT_PATH = OUTPUT_DIR / "facebook_keyword_index.sqlite3"


def _normalize_search_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).lower()
    return " ".join(value.split())


def build_index(
    manifest_path: Path = MANIFEST_PATH,
    governance_path: Path = GOVERNANCE_PATH,
    output_path: Path = OUTPUT_PATH,
) -> Path | None:
    if not manifest_path.exists():
        print(f"Facebook manifest not found; skip keyword index: {manifest_path}")
        return None

    facebook_root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    shards = manifest.get("shards") or []
    if not isinstance(shards, list) or not shards:
        print("Facebook manifest has no shards; skip keyword index")
        return None

    governance = load_governance(governance_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    try:
        conn.executescript(
            """
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            CREATE TABLE meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE daily_documents (
                date TEXT PRIMARY KEY,
                document_count INTEGER NOT NULL
            );
            CREATE TABLE daily_stats (
                date TEXT NOT NULL,
                term TEXT NOT NULL,
                document_count INTEGER NOT NULL,
                hit_count INTEGER NOT NULL,
                PRIMARY KEY (date, term)
            );
            CREATE TABLE total_stats (
                term TEXT PRIMARY KEY,
                document_count INTEGER NOT NULL,
                hit_count INTEGER NOT NULL
            );
            CREATE TABLE search_documents (
                ordinal INTEGER PRIMARY KEY,
                record_id TEXT,
                date TEXT,
                year INTEGER,
                retrieval_text TEXT NOT NULL,
                keyword_text TEXT NOT NULL,
                payload_json TEXT NOT NULL
            );
            """
        )

        total_df: Counter[str] = Counter()
        total_hits: Counter[str] = Counter()
        total_documents = 0
        search_documents = 0
        ordinal = 0
        date_min = ""
        date_max = ""

        for shard_name in shards:
            shard_path = facebook_root / str(shard_name)
            rows = json.loads(shard_path.read_text(encoding="utf-8"))
            if not isinstance(rows, list):
                raise ValueError(f"Facebook shard must be a list: {shard_name}")

            daily_df: dict[str, Counter[str]] = {}
            daily_hits: dict[str, Counter[str]] = {}
            daily_documents: Counter[str] = Counter()

            for row in rows:
                if not isinstance(row, dict):
                    continue
                if row.get("searchable") is False or "爭議文章" in (row.get("classification") or []):
                    continue

                ordinal += 1
                raw_date = str(row.get("date") or row.get("created_date") or "")
                date = raw_date[:10]
                year_value = row.get("year")
                if not isinstance(year_value, int):
                    try:
                        year_value = int(str(year_value)) if year_value not in (None, "") else None
                    except ValueError:
                        year_value = None
                if year_value is None and len(date) >= 4 and date[:4].isdigit():
                    year_value = int(date[:4])

                retrieval_text = _normalize_search_text(
                    str(row.get("retrieval_text") or row.get("text") or "")
                )
                keyword_text = _normalize_search_text(
                    " ".join(str(item) for item in (row.get("semantic_keywords") or []))
                )
                conn.execute(
                    "INSERT INTO search_documents(ordinal, record_id, date, year, retrieval_text, keyword_text, payload_json) "
                    "VALUES(?, ?, ?, ?, ?, ?, ?)",
                    (
                        ordinal,
                        str(row.get("record_id") or ""),
                        date,
                        year_value,
                        retrieval_text,
                        keyword_text,
                        json.dumps(row, ensure_ascii=False, separators=(",", ":")),
                    ),
                )
                search_documents += 1

                if not date:
                    continue

                counts = keyword_counts_for_row(row, governance=governance)
                if not counts:
                    continue

                daily_documents[date] += 1
                total_documents += 1
                date_min = date if not date_min or date < date_min else date_min
                date_max = date if not date_max or date > date_max else date_max

                df = daily_df.setdefault(date, Counter())
                hits = daily_hits.setdefault(date, Counter())
                for term, count in counts.items():
                    df[term] += 1
                    hits[term] += int(count)
                    total_df[term] += 1
                    total_hits[term] += int(count)

            for date, count in daily_documents.items():
                conn.execute(
                    "INSERT INTO daily_documents(date, document_count) VALUES(?, ?) "
                    "ON CONFLICT(date) DO UPDATE SET document_count = document_count + excluded.document_count",
                    (date, int(count)),
                )
                conn.executemany(
                    "INSERT INTO daily_stats(date, term, document_count, hit_count) VALUES(?, ?, ?, ?) "
                    "ON CONFLICT(date, term) DO UPDATE SET "
                    "document_count = document_count + excluded.document_count, "
                    "hit_count = hit_count + excluded.hit_count",
                    [
                        (date, term, int(doc_count), int(daily_hits[date][term]))
                        for term, doc_count in daily_df[date].items()
                    ],
                )

            conn.commit()

        conn.executemany(
            "INSERT INTO total_stats(term, document_count, hit_count) VALUES(?, ?, ?)",
            [
                (term, int(doc_count), int(total_hits[term]))
                for term, doc_count in total_df.items()
            ],
        )
        meta = {
            "schema_version": "0.2",
            "source": "facebook",
            "document_count": str(total_documents),
            "search_document_count": str(search_documents),
            "date_start": date_min,
            "date_end": date_max,
            "manifest_records": str(manifest.get("records") or ""),
        }
        conn.executemany("INSERT INTO meta(key, value) VALUES(?, ?)", meta.items())
        conn.execute("CREATE INDEX idx_daily_stats_date ON daily_stats(date)")
        conn.execute("CREATE INDEX idx_search_documents_date ON search_documents(date)")
        conn.execute("CREATE INDEX idx_search_documents_year ON search_documents(year)")
        conn.commit()
    finally:
        conn.close()

    print(f"Built Facebook keyword/search index: {output_path}")
    return output_path


if __name__ == "__main__":
    build_index()
