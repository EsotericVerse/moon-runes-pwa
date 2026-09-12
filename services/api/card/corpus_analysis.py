"""Local-first corpus parsing and keyword/trend analysis for LOC.

This module deliberately uses Python's standard library only.  External LLM or
embedding APIs may enrich the result later, but are never required to build the
keyword library or time-series trend projection.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
import math
import re
from typing import Any

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]+")
_LATIN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{1,31}")

# Small structural stop list.  Domain-specific terms should be supplied through
# seed_keywords rather than hard-coded here.
STOP_TERMS = {
    "一個","一些","這個","那個","自己","我們","你們","他們","因為","所以","但是","如果",
    "就是","不是","可以","可能","還是","以及","而且","已經","沒有","什麼","怎麼","這樣",
    "那樣","現在","今天","昨天","明天","時候","事情","東西","真的","覺得","知道","看到",
    "the","and","that","this","with","from","have","has","was","were","will","would","could",
}


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _normalize_date(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    m = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})", value)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3))).date().isoformat()
        except ValueError:
            return ""
    return ""


def _period_key(date_value: str, granularity: str) -> str:
    if not date_value:
        return "undated"
    y, m, _ = date_value.split("-")
    if granularity == "year":
        return y
    if granularity == "quarter":
        q = (int(m) - 1) // 3 + 1
        return f"{y}-Q{q}"
    return f"{y}-{m}"


def _candidates(text: str, ngram_min: int, ngram_max: int) -> Counter[str]:
    counts: Counter[str] = Counter()

    for token in _LATIN_RE.findall(text):
        term = token.lower()
        if term not in STOP_TERMS:
            counts[term] += 1

    for block in _CJK_RE.findall(text):
        length = len(block)
        for n in range(ngram_min, ngram_max + 1):
            if length < n:
                continue
            for i in range(0, length - n + 1):
                term = block[i:i+n]
                if term in STOP_TERMS:
                    continue
                # Reject repetitive punctuation-like or single-character-repeat noise.
                if len(set(term)) == 1:
                    continue
                counts[term] += 1
    return counts


def analyze_corpus(
    documents: list[dict[str, Any]],
    *,
    seed_keywords: list[str] | None = None,
    top_k: int = 80,
    min_df: int = 2,
    granularity: str = "month",
    ngram_min: int = 2,
    ngram_max: int = 4,
) -> dict[str, Any]:
    if granularity not in {"month", "quarter", "year"}:
        raise ValueError("granularity must be month, quarter, or year")
    if ngram_min < 2 or ngram_max < ngram_min or ngram_max > 6:
        raise ValueError("ngram range must satisfy 2 <= min <= max <= 6")

    normalized: list[dict[str, Any]] = []
    doc_term_counts: list[Counter[str]] = []
    df: Counter[str] = Counter()
    tf: Counter[str] = Counter()

    seeds = [str(x).strip() for x in (seed_keywords or []) if str(x).strip()]

    for index, raw in enumerate(documents):
        text = _clean_text(raw.get("text", ""))
        if not text:
            continue
        date_value = _normalize_date(raw.get("date", ""))
        source = str(raw.get("source", "") or "unknown").strip()
        doc_id = str(raw.get("id", "") or f"doc-{index+1}")
        counts = _candidates(text, ngram_min, ngram_max)

        # Canonical/seed terms are exact-match counted so known vocabulary is
        # retained even when it is longer than the n-gram window.
        for term in seeds:
            hit = text.count(term)
            if hit:
                counts[term] = max(counts.get(term, 0), hit)

        normalized.append({
            "id": doc_id,
            "date": date_value,
            "source": source,
            "text": text,
        })
        doc_term_counts.append(counts)
        tf.update(counts)
        for term in counts:
            df[term] += 1

    doc_count = len(normalized)
    if not doc_count:
        return {
            "document_count": 0,
            "keyword_library": [],
            "periods": [],
            "trajectories": [],
            "sources": {},
        }

    # TF-IDF-like ranking: document frequency provides stability; IDF prevents
    # ubiquitous filler phrases from dominating.
    scored: list[tuple[float, str]] = []
    seed_set = set(seeds)
    for term, doc_freq in df.items():
        if doc_freq < min_df and term not in seed_set:
            continue
        idf = math.log((1 + doc_count) / (1 + doc_freq)) + 1.0
        score = (doc_freq * idf) + math.log1p(tf[term])
        if term in seed_set:
            score += doc_count * 0.05
        scored.append((score, term))

    scored.sort(key=lambda row: (-row[0], -df[row[1]], -tf[row[1]], row[1]))
    selected = [term for _, term in scored[:top_k]]

    keyword_library = [
        {
            "term": term,
            "document_count": df[term],
            "hit_count": tf[term],
            "document_percent": round(df[term] * 100.0 / doc_count, 2),
            "seed": term in seed_set,
        }
        for term in selected
    ]

    period_docs: dict[str, list[int]] = defaultdict(list)
    source_counts: Counter[str] = Counter()
    for idx, doc in enumerate(normalized):
        period_docs[_period_key(doc["date"], granularity)].append(idx)
        source_counts[doc["source"]] += 1

    periods = []
    per_term_points: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for period in sorted(period_docs, key=lambda p: (p == "undated", p)):
        indexes = period_docs[period]
        period_size = len(indexes)
        keyword_rows = []
        for term in selected:
            docs_with = sum(1 for idx in indexes if term in doc_term_counts[idx])
            hits = sum(doc_term_counts[idx].get(term, 0) for idx in indexes)
            if not docs_with:
                continue
            percent = round(docs_with * 100.0 / period_size, 2)
            row = {
                "term": term,
                "document_count": docs_with,
                "hit_count": hits,
                "percent": percent,
            }
            keyword_rows.append(row)
            per_term_points[term].append({
                "period": period,
                "document_count": docs_with,
                "percent": percent,
            })
        keyword_rows.sort(key=lambda x: (-x["document_count"], -x["hit_count"], x["term"]))
        periods.append({
            "period": period,
            "document_count": period_size,
            "keywords": keyword_rows[: min(30, top_k)],
        })

    trajectories = []
    for term in selected:
        points = per_term_points.get(term, [])
        if len(points) < 2:
            continue
        previous = None
        for point in points:
            point["delta_pp"] = None if previous is None else round(point["percent"] - previous, 2)
            previous = point["percent"]
        peak = max(points, key=lambda x: x["percent"])
        trajectories.append({
            "term": term,
            "peak_period": peak["period"],
            "peak_percent": peak["percent"],
            "points": points,
        })

    return {
        "document_count": doc_count,
        "dated_document_count": sum(1 for d in normalized if d["date"]),
        "keyword_library": keyword_library,
        "periods": periods,
        "trajectories": trajectories,
        "sources": dict(source_counts.most_common()),
    }


def classify_text(
    text: str,
    *,
    categories: dict[str, list[str]] | None = None,
    seed_keywords: list[str] | None = None,
    top_k: int = 12,
) -> dict[str, Any]:
    """Classify one text with deterministic keyword rules.

    No external model/API is required.  Callers may provide their own category
    dictionary, making this useful outside the author's personal corpus.
    """
    cleaned = _clean_text(text)
    if not cleaned:
        return {
            "text_length": 0,
            "keywords": [],
            "categories": [],
            "matched_terms": {},
        }

    seeds = [str(x).strip() for x in (seed_keywords or []) if str(x).strip()]
    counts = _candidates(cleaned, 2, 4)
    for term in seeds:
        hit = cleaned.count(term)
        if hit:
            counts[term] = max(counts.get(term, 0), hit)

    keywords = [
        {"term": term, "hit_count": count}
        for term, count in counts.most_common(max(1, min(top_k, 50)))
    ]

    category_rows = []
    matched_terms: dict[str, list[dict[str, Any]]] = {}
    for label, terms in (categories or {}).items():
        label = str(label).strip()
        if not label:
            continue
        hits = []
        score = 0
        for raw_term in terms or []:
            term = str(raw_term).strip()
            if not term:
                continue
            count = cleaned.count(term)
            if count:
                score += count
                hits.append({"term": term, "hit_count": count})
        if score:
            hits.sort(key=lambda row: (-row["hit_count"], row["term"]))
            matched_terms[label] = hits
            category_rows.append({
                "label": label,
                "score": score,
                "matched_term_count": len(hits),
            })

    category_rows.sort(key=lambda row: (-row["score"], -row["matched_term_count"], row["label"]))

    return {
        "text_length": len(cleaned),
        "keywords": keywords,
        "categories": category_rows,
        "matched_terms": matched_terms,
    }
