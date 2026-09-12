from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

_SPACE_RE = re.compile(r"\s+")
_CJK_RUN_RE = re.compile(r"[\u3400-\u9fff]+")
_LATIN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{1,}")


def _norm(value: str) -> str:
    return _SPACE_RE.sub(" ", unicodedata.normalize("NFKC", value or "").strip()).lower()


def load_governance(path: Path | None) -> dict[str, Any]:
    if not path or not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _canonical(term: str, aliases: dict[str, str]) -> str:
    t = _norm(term)
    return _norm(aliases.get(t, t))


def _preferred_terms(row: dict[str, Any]) -> list[str]:
    for key in ("semantic_keywords", "keywords", "tags"):
        value = row.get(key)
        if isinstance(value, list) and value:
            return [str(x).strip() for x in value if str(x).strip()]
    return []


def _extract_fallback(text: str, min_len: int, max_len: int) -> Counter[str]:
    counts: Counter[str] = Counter()
    for token in _LATIN_RE.findall(text or ""):
        counts[_norm(token)] += 1
    for run in _CJK_RUN_RE.findall(text or ""):
        n = len(run)
        for size in range(min_len, max_len + 1):
            if n < size:
                continue
            for i in range(n - size + 1):
                counts[run[i:i + size]] += 1
    return counts


def keyword_counts_for_row(
    row: dict[str, Any],
    *,
    governance: dict[str, Any] | None = None,
    text_fields: tuple[str, ...] = ("text", "retrieval_text", "summary"),
) -> Counter[str]:
    """Return governed keyword hit counts for one document.

    The build-time Facebook index uses the same extraction path as runtime
    ranking so precomputed results cannot drift from the public ranking rules.
    """
    governance = governance or {}
    stop = {_norm(x) for x in governance.get("stop_terms", []) if str(x).strip()}
    aliases = {_norm(k): _norm(v) for k, v in (governance.get("aliases", {}) or {}).items()}
    min_len = max(2, int(governance.get("min_term_length", 2) or 2))
    max_len = max(min_len, int(governance.get("max_term_length", 4) or 4))

    text = ""
    for field in text_fields:
        if isinstance(row.get(field), str) and row.get(field).strip():
            text = str(row.get(field))
            break

    preferred = _preferred_terms(row)
    local: Counter[str] = Counter()
    if preferred:
        normalized_text = _norm(text)
        for raw in preferred:
            term = _canonical(raw, aliases)
            if not term or term in stop or len(term) < min_len:
                continue
            count = normalized_text.count(term) if normalized_text else 0
            local[term] += max(1, count)
    else:
        local = _extract_fallback(text, min_len, max_len)

    cleaned: Counter[str] = Counter()
    for raw, count in local.items():
        term = _canonical(raw, aliases)
        if not term or term in stop:
            continue
        if len(term) < min_len or (len(term) > max_len and not re.search(r"[a-z]", term)):
            continue
        if term.isdigit():
            continue
        cleaned[term] += int(count)
    return cleaned


def _rank_keyword_sqlite(
    index_path: Path,
    *,
    start_date: str,
    end_date: str,
    top_k: int,
    governance: dict[str, Any],
) -> dict[str, Any]:
    min_df = max(1, int(governance.get("min_document_frequency", 2) or 2))
    limit = max(1, min(int(top_k or 10), 100))

    conn = sqlite3.connect(index_path)
    try:
        if not start_date and not end_date:
            meta = dict(conn.execute("SELECT key, value FROM meta").fetchall())
            rows = conn.execute(
                "SELECT term, document_count, hit_count FROM total_stats "
                "WHERE document_count >= ? "
                "ORDER BY document_count DESC, hit_count DESC, term ASC LIMIT ?",
                (min_df, limit),
            ).fetchall()
            return {
                "document_count": int(meta.get("document_count") or 0),
                "date_start": meta.get("date_start") or "",
                "date_end": meta.get("date_end") or "",
                "items": [
                    {"term": term, "document_count": int(doc_count), "hit_count": int(hit_count)}
                    for term, doc_count, hit_count in rows
                ],
            }

        where: list[str] = []
        params: list[Any] = []
        if start_date:
            where.append("date >= ?")
            params.append(start_date)
        if end_date:
            where.append("date <= ?")
            params.append(end_date)
        where_sql = " WHERE " + " AND ".join(where) if where else ""

        doc_row = conn.execute(
            "SELECT COALESCE(SUM(document_count), 0), MIN(date), MAX(date) "
            f"FROM daily_documents{where_sql}",
            params,
        ).fetchone()

        ranking_params = [*params, min_df, limit]
        rows = conn.execute(
            "SELECT term, SUM(document_count) AS dc, SUM(hit_count) AS hc "
            f"FROM daily_stats{where_sql} "
            "GROUP BY term HAVING SUM(document_count) >= ? "
            "ORDER BY dc DESC, hc DESC, term ASC LIMIT ?",
            ranking_params,
        ).fetchall()

        return {
            "document_count": int((doc_row or [0])[0] or 0),
            "date_start": (doc_row[1] if doc_row and doc_row[1] else start_date) or "",
            "date_end": (doc_row[2] if doc_row and doc_row[2] else end_date) or "",
            "items": [
                {"term": term, "document_count": int(doc_count), "hit_count": int(hit_count)}
                for term, doc_count, hit_count in rows
            ],
        }
    finally:
        conn.close()


def rank_keyword_documents(
    documents: Iterable[dict[str, Any]],
    *,
    start_date: str = "",
    end_date: str = "",
    top_k: int = 10,
    governance: dict[str, Any] | None = None,
    date_fields: tuple[str, ...] = ("date", "created_date"),
    text_fields: tuple[str, ...] = ("text", "retrieval_text", "summary"),
) -> dict[str, Any]:
    governance = governance or {}

    # Large Facebook corpora expose a reusable shard stream. On Render, the
    # build step creates a SQLite aggregate beside that stream; use it when
    # available so a leaderboard request never has to rescan 18k+ documents.
    index_path = getattr(documents, "keyword_index_path", None)
    if index_path:
        path = Path(index_path)
        if path.exists():
            return _rank_keyword_sqlite(
                path,
                start_date=start_date,
                end_date=end_date,
                top_k=top_k,
                governance=governance,
            )

    min_df = max(1, int(governance.get("min_document_frequency", 2) or 2))
    df: Counter[str] = Counter()
    hits: Counter[str] = Counter()
    analyzed = 0
    date_min = ""
    date_max = ""

    for row in documents:
        date = ""
        for field in date_fields:
            if row.get(field):
                date = str(row.get(field))[:10]
                break
        if start_date and date and date < start_date:
            continue
        if end_date and date and date > end_date:
            continue

        cleaned = keyword_counts_for_row(row, governance=governance, text_fields=text_fields)
        if not cleaned:
            continue

        analyzed += 1
        if date:
            date_min = date if not date_min or date < date_min else date_min
            date_max = date if not date_max or date > date_max else date_max
        for term, count in cleaned.items():
            df[term] += 1
            hits[term] += count

    ranked = [
        {"term": term, "document_count": count, "hit_count": hits[term]}
        for term, count in df.items()
        if count >= min_df
    ]
    ranked.sort(key=lambda x: (-x["document_count"], -x["hit_count"], x["term"]))
    ranked = ranked[:max(1, min(int(top_k or 10), 100))]

    return {
        "document_count": analyzed,
        "date_start": date_min or start_date or "",
        "date_end": date_max or end_date or "",
        "items": ranked,
    }
