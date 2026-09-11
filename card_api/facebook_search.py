from __future__ import annotations

import heapq
import json
import math
import re
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
    """Return cheap literal candidates before expensive n-gram scoring.

    Latin words are kept whole. CJK queries contribute 2-4 character windows so
    a longer phrase can still find records containing its meaningful subphrases.
    This is deliberately lightweight: it narrows CPU work without building a
    resident corpus-wide index.
    """
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


class FacebookSearchEngine:
    """Memory-bounded Facebook corpus searcher.

    Manifest-backed corpora are streamed one shard at a time. The service does
    not keep all Facebook posts, document features, or document vectors resident
    in memory. Search retains only a fixed-size global Top-K heap.

    A cheap literal/semantic-keyword prefilter runs before n-gram vectorization,
    so normal queries do not recompute expensive features for all 18k+ records.
    """

    def __init__(self, dataset_path: Path):
        self.dataset_path = dataset_path
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))

        self.shards: list[str] = []
        self.posts: list[dict[str, Any]] | None = None

        if isinstance(payload, dict) and isinstance(payload.get("shards"), list):
            self.shards = [str(name) for name in payload["shards"]]
            self.dataset = {
                "schema_version": payload.get("schema_version"),
                "records": payload.get("records"),
                "source": payload.get("source"),
                "concept_bridge": payload.get("concept_bridge", {}),
            }
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

        for index, post in enumerate(self._iter_posts()):
            if post.get("searchable") is False or "爭議文章" in (post.get("classification") or []):
                continue

            date = str(post.get("date") or "")
            if start_date and date[:10] < start_date:
                continue
            if end_date and date[:10] > end_date:
                continue
            if year and post.get("year") != year:
                continue

            # Most records are rejected here using substring checks only. This
            # avoids rebuilding character n-gram vectors for the full corpus on
            # every query, the main source of Facebook-search timeouts.
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
