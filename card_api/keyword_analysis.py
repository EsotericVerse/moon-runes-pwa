from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

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

def rank_keyword_documents(
    documents: list[dict[str, Any]],
    *,
    start_date: str = "",
    end_date: str = "",
    top_k: int = 10,
    governance: dict[str, Any] | None = None,
    date_fields: tuple[str, ...] = ("date", "created_date"),
    text_fields: tuple[str, ...] = ("text", "retrieval_text", "summary"),
) -> dict[str, Any]:
    governance = governance or {}
    stop = {_norm(x) for x in governance.get("stop_terms", []) if str(x).strip()}
    aliases = {_norm(k): _norm(v) for k, v in (governance.get("aliases", {}) or {}).items()}
    min_len = max(2, int(governance.get("min_term_length", 2) or 2))
    max_len = max(min_len, int(governance.get("max_term_length", 4) or 4))
    min_df = max(1, int(governance.get("min_document_frequency", 2) or 2))

    df: Counter[str] = Counter()
    hits: Counter[str] = Counter()
    analyzed = 0
    dates: list[str] = []

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
            if len(term) < min_len or len(term) > max_len and not re.search(r"[a-z]", term):
                continue
            if term.isdigit():
                continue
            cleaned[term] += int(count)

        if not cleaned:
            continue
        analyzed += 1
        if date:
            dates.append(date)
        for term, count in cleaned.items():
            df[term] += 1
            hits[term] += count

    ranked = [
        {
            "term": term,
            "document_count": count,
            "hit_count": hits[term],
        }
        for term, count in df.items()
        if count >= min_df
    ]
    ranked.sort(key=lambda x: (-x["document_count"], -x["hit_count"], x["term"]))
    ranked = ranked[:max(1, min(int(top_k or 10), 100))]

    return {
        "document_count": analyzed,
        "date_start": min(dates) if dates else (start_date or ""),
        "date_end": max(dates) if dates else (end_date or ""),
        "items": ranked,
    }
