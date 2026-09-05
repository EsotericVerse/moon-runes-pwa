#!/usr/bin/env python3
"""LOC6 API-minimal keyword candidate extractor.

Zero cloud API calls. Designed first for Meta Threads export JSON.
Outputs a reviewable JSON registry and CSV candidate list.

Usage:
  python tools/loc6_keyword_extract.py threads_and_replies.json --out data/generated/loc6
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

URL_RE = re.compile(r"https?://\\S+")
CJK_RE = re.compile(r"[\\u3400-\\u9fff]+")

# Intentionally small: corpus statistics should discover vocabulary.
STOP_FRAGMENTS = {
    "這個", "那個", "就是", "不是", "自己", "一個", "沒有", "可以", "因為", "所以",
    "如果", "但是", "還是", "其實", "真的", "已經", "現在", "覺得", "什麼", "這樣",
    "一下", "很多", "可能", "應該", "比較", "今天", "昨天", "明天", "東西", "事情",
}

ERA_RANGES = [
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


def repair_meta_text(value: str) -> str:
    """Repair common UTF-8-as-latin1 mojibake in Meta exports."""
    if not isinstance(value, str):
        return ""
    try:
        repaired = value.encode("latin1").decode("utf-8")
        # Avoid replacing legitimate text when repair makes no difference/use.
        if any("\\u4e00" <= ch <= "\\u9fff" for ch in repaired):
            return repaired
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return value


def ts_to_date(ts) -> str:
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).date().isoformat()
    except Exception:
        return ""


def era_for(date: str) -> str:
    if not date:
        return "UNASSIGNED"
    for era, start, end in ERA_RANGES:
        if (start is None or date >= start) and (end is None or date <= end):
            return era
    return "UNASSIGNED"


def normalize_text(text: str) -> str:
    text = repair_meta_text(text)
    text = URL_RE.sub(" ", text)
    text = re.sub(r"\\s+", " ", text).strip()
    return text


def extract_threads(payload: dict) -> list[dict]:
    posts = payload.get("text_post_app_text_posts") or []
    docs = []
    seen = set()

    for idx, post in enumerate(posts):
        media = post.get("media") or []
        post_title = normalize_text(post.get("title") or "")
        post_ts = post.get("creation_timestamp")

        candidates = []
        if post_title:
            candidates.append((post_title, post_ts, False, ""))

        for m in media:
            title = normalize_text(m.get("title") or "")
            tapp = m.get("text_app_post") or {}
            if title:
                candidates.append((
                    title,
                    m.get("creation_timestamp") or post_ts,
                    bool(tapp.get("is_reply")),
                    tapp.get("in_reply_to_username") or "",
                ))

        # Export may repeat identical post-level/media-level title.
        for text, ts, is_reply, reply_to in candidates:
            key = (text, ts, is_reply)
            if key in seen:
                continue
            seen.add(key)
            date = ts_to_date(ts)
            docs.append({
                "source_id": f"threads:{idx}:{ts or 0}",
                "date": date,
                "era": era_for(date),
                "is_reply": is_reply,
                "reply_to": reply_to,
                "text": text,
            })
    return docs


def cjk_ngrams(text: str, min_n: int, max_n: int):
    for chunk in CJK_RE.findall(text):
        L = len(chunk)
        for n in range(min_n, max_n + 1):
            if L < n:
                continue
            for i in range(L - n + 1):
                term = chunk[i:i+n]
                if term in STOP_FRAGMENTS:
                    continue
                if any(term.startswith(x) or term.endswith(x) for x in ("這個", "那個")):
                    continue
                yield term


def score_candidates(docs: list[dict], min_n=2, max_n=6, min_df=3):
    tf = Counter()
    df = Counter()
    era_counts = defaultdict(Counter)
    examples = defaultdict(list)

    for doc in docs:
        grams = list(cjk_ngrams(doc["text"], min_n, max_n))
        tf.update(grams)
        unique = set(grams)
        df.update(unique)
        for term in unique:
            era_counts[term][doc["era"]] += 1
            if len(examples[term]) < 3:
                examples[term].append({
                    "source_id": doc["source_id"],
                    "date": doc["date"],
                    "era": doc["era"],
                    "is_reply": doc["is_reply"],
                    "text": doc["text"][:280],
                })

    N = max(1, len(docs))
    rows = []
    for term, freq in tf.items():
        d = df[term]
        if d < min_df:
            continue
        # TF × IDF × moderate phrase-length bonus.
        idf = math.log((N + 1) / (d + 1)) + 1
        length_bonus = 1 + min(len(term) - 2, 4) * 0.12
        score = math.log1p(freq) * idf * length_bonus
        rows.append({
            "term": term,
            "score": round(score, 6),
            "term_frequency": freq,
            "document_frequency": d,
            "era_distribution": dict(sorted(era_counts[term].items())),
            "source_type": "threads",
            "examples": examples[term],
            "status": "candidate",
            "canonical_concept": None,
            "confidence": "recorded",
            "review_note": "",
        })

    rows.sort(key=lambda x: (-x["score"], -x["document_frequency"], x["term"]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, default=Path("data/generated/loc6"))
    ap.add_argument("--min-df", type=int, default=3)
    ap.add_argument("--top", type=int, default=2000)
    ap.add_argument("--include-replies", action="store_true")
    args = ap.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    docs = extract_threads(payload)
    if not args.include_replies:
        docs = [d for d in docs if not d["is_reply"]]

    rows = score_candidates(docs, min_df=args.min_df)[:args.top]

    args.out.mkdir(parents=True, exist_ok=True)
    registry_path = args.out / "LOC6_KEYWORD_CANDIDATES.json"
    csv_path = args.out / "LOC6_KEYWORD_CANDIDATES.csv"

    registry = {
        "version": "0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": str(args.input),
        "document_count": len(docs),
        "api_calls": 0,
        "items": rows,
    }
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["term", "score", "term_frequency", "document_frequency", "era_distribution", "status", "canonical_concept", "review_note"])
        for r in rows:
            w.writerow([
                r["term"], r["score"], r["term_frequency"], r["document_frequency"],
                json.dumps(r["era_distribution"], ensure_ascii=False),
                r["status"], "", "",
            ])

    print(f"documents={len(docs)} candidates={len(rows)} api_calls=0")
    print(registry_path)
    print(csv_path)


if __name__ == "__main__":
    main()
