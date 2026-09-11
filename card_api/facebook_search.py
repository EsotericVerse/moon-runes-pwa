from __future__ import annotations

import heapq
import json
import math
import re
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

_SPACE_RE = re.compile(r"\s+")
_TOKEN_RE = re.compile(r"[a-z0-9]+|[\u3400-\u9fff]")


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").lower()
    return _SPACE_RE.sub(" ", value).strip()


def _features(value: str) -> Counter[str]:
    normalized = _normalize(value)
    compact = "".join(_TOKEN_RE.findall(normalized))
    features: Counter[str] = Counter()
    for token in re.findall(r"[a-z0-9]+", normalized):
        features[f"w:{token}"] += 1
    for size in (2, 3, 4):
        for start in range(max(0, len(compact) - size + 1)):
            features[f"c{size}:{compact[start:start + size]}"] += 1
    return features


def _vectorize(features: Counter[str]) -> dict[str, float]:
    weighted = {
        feature: 1 + math.log(frequency)
        for feature, frequency in features.items()
        if frequency > 0
    }
    norm = math.sqrt(sum(value * value for value in weighted.values())) or 1.0
    return {feature: value / norm for feature, value in weighted.items()}


def _prefilter_terms(value: str) -> list[str]:
    normalized = _normalize(value)
    terms: list[str] = []

    for token in re.findall(r"[a-z0-9]+", normalized):
        if len(token) >= 2:
            terms.append(token)

    cjk = "".join(ch for ch in normalized if "\u3400" <= ch <= "\u9fff")
    if cjk:
        if len(cjk) <= 4:
            terms.append(cjk)
        for size in (4, 3, 2):
            if len(cjk) < size:
                continue
            for start in range(len(cjk) - size + 1):
                terms.append(cjk[start:start + size])

    return list(dict.fromkeys(term for term in terms if term))


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class _FacebookPostStream:
    def __init__(self, engine: "FacebookSearchEngine"):
        self.engine = engine
        self.keyword_index_path = engine.keyword_index_path

    def __iter__(self) -> Iterator[dict[str, Any]]:
        return self.engine._iter_posts()

    def __len__(self) -> int:
        value = self.engine.dataset.get("records")
        return int(value) if isinstance(value, int) or str(value).isdigit() else 0


class FacebookSearchEngine:
    def __init__(self, dataset_path: Path):
        self.dataset_path = dataset_path
        self.keyword_index_path = Path(__file__).resolve().parent / "generated" / "facebook_keyword_index.sqlite3"
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))

        self.shards: list[str] = []
        self.posts: Any = None

        if isinstance(payload, dict) and isinstance(payload.get("shards"), list):
            self.shards = [str(name) for name in payload["shards"]]
            self.dataset = {
                "schema_version": payload.get("schema_version"),
                "records": payload.get("records"),
                "source": payload.get("source"),
                "concept_bridge": payload.get("concept_bridge", {}),
            }
            self.posts = _FacebookPostStream(self)
        else:
            posts = payload.get("posts") if isinstance(payload, dict) else None
            if not isinstance(posts, list):
                raise ValueError("Facebook dataset must contain a posts array or shard manifest")
            self.posts = posts
            self.dataset = payload.get("dataset", {})

        self.concepts = self.dataset.get("concept_bridge", {}) or {}

    def _iter_posts(self) -> Iterator[dict[str, Any]]:
        if self.shards:
            for shard_name in self.shards:
                shard_path = self.dataset_path.parent / shard_name
                shard = json.loads(shard_path.read_text(encoding="utf-8"))
                if not isinstance(shard, list):
                    raise ValueError(f"Facebook shard must be a list: {shard_name}")
                for post in shard:
                    if isinstance(post, dict):
                        yield post
                del shard
            return

        for post in self.posts or []:
            yield post

    def _search_index_available(self) -> bool:
        path = self.keyword_index_path
        if not path.exists():
            return False
        try:
            with sqlite3.connect(path) as conn:
                row = conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='search_documents'"
                ).fetchone()
            return bool(row)
        except sqlite3.Error:
            return False

    def _iter_index_posts(
        self,
        terms: list[str],
        *,
        start_date: str = "",
        end_date: str = "",
        year: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []

        if start_date:
            clauses.append("date >= ?")
            params.append(start_date)
        if end_date:
            clauses.append("date <= ?")
            params.append(end_date)
        if year:
            clauses.append("year = ?")
            params.append(int(year))

        if terms:
            term_clauses: list[str] = []
            for term in terms:
                pattern = f"%{_escape_like(term)}%"
                term_clauses.append("(retrieval_text LIKE ? ESCAPE '\\' OR keyword_text LIKE ? ESCAPE '\\')")
                params.extend([pattern, pattern])
            clauses.append("(" + " OR ".join(term_clauses) + ")")

        sql = "SELECT payload_json FROM search_documents"
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY ordinal"

        with sqlite3.connect(self.keyword_index_path) as conn:
            for (payload_json,) in conn.execute(sql, params):
                post = json.loads(payload_json)
                if isinstance(post, dict):
                    yield post

    @staticmethod
    def _cosine(left: dict[str, float], right: dict[str, float]) -> float:
        if len(left) > len(right):
            left, right = right, left
        return sum(value * right.get(feature, 0.0) for feature, value in left.items())

    def _expand_query(self, query: str) -> str:
        normalized = _normalize(query)
        additions: list[str] = []
        for group in self.concepts.values():
            if any(term in normalized for term in group):
                additions.extend(group)
        return " ".join([normalized, *dict.fromkeys(additions)])

    @staticmethod
    def _passes_prefilter(post: dict[str, Any], terms: list[str]) -> bool:
        if not terms:
            return True

        retrieval_text = _normalize(str(post.get("retrieval_text") or post.get("text") or ""))
        if any(term in retrieval_text for term in terms):
            return True

        keywords = post.get("semantic_keywords") or []
        keyword_text = _normalize(" ".join(str(item) for item in keywords))
        return any(term in keyword_text for term in terms)

    def search(
        self,
        query: str,
        top_k: int = 10,
        *,
        start_date: str = "",
        end_date: str = "",
        year: int | None = None,
    ) -> list[dict[str, Any]]:
        query = query.strip()
        if not query:
            raise ValueError("query must not be blank")

        limit = max(1, min(top_k, 50))
        expanded_query = self._expand_query(query)
        query_vector = _vectorize(_features(expanded_query))
        prefilter_terms = _prefilter_terms(expanded_query)
        normalized_query = _normalize(query)
        heap: list[tuple[float, int, dict[str, Any], list[str]]] = []

        if self._search_index_available():
            source = self._iter_index_posts(
                prefilter_terms,
                start_date=start_date,
                end_date=end_date,
                year=year,
            )
        else:
            source = self._iter_posts()

        for index, post in enumerate(source):
            if post.get("searchable") is False or "爭議文章" in (post.get("classification") or []):
                continue

            date = str(post.get("date") or "")
            if start_date and date[:10] < start_date:
                continue
            if end_date and date[:10] > end_date:
                continue
            if year and post.get("year") != year:
                continue

            if not self._passes_prefilter(post, prefilter_terms):
                continue

            retrieval_text = str(post.get("retrieval_text") or post.get("text") or "")
            score = self._cosine(query_vector, _vectorize(_features(retrieval_text)))

            text = _normalize(str(post.get("text") or ""))
            if normalized_query and normalized_query in text:
                score += 0.05

            matched_concepts = [
                label
                for label, group in self.concepts.items()
                if any(term in normalized_query for term in group)
                and label in post.get("concepts", [])
            ]
            score += min(len(matched_concepts) * 0.015, 0.06)

            if score <= 0:
                continue

            candidate = (score, -index, post, matched_concepts)
            if len(heap) < limit:
                heapq.heappush(heap, candidate)
            elif candidate[:2] > heap[0][:2]:
                heapq.heapreplace(heap, candidate)

        ranked = sorted(heap, key=lambda item: (-item[0], -item[1]))
        return [
            {
                "result_id": post.get("record_id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC4",
                "related_locs": ["LOC7", "LOC8"],
                "content_type": "facebook_post",
                "group": "social_archive",
                "title": f"Facebook｜{str(post.get('date') or '')[:10]}",
                "summary": post.get("text") or "",
                "score": round(score, 6),
                "source_refs": [{
                    "source_type": "facebook",
                    "source_id": post.get("record_id"),
                    "note": "author-owned Facebook life-writing source corpus",
                }],
                "payload": {
                    **post,
                    "matched_concepts": matched_concepts,
                },
            }
            for score, _, post, matched_concepts in ranked
        ]
