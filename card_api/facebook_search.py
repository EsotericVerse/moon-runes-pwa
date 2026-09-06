from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

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

class FacebookSearchEngine:
    """Optional private Facebook corpus searcher.

    The corpus is intentionally not committed to the public repository.
    Set LOC_FB_SEARCH_DATASET to a mounted/private LOC_FB_SEARCH_v0.1.json file.
    """

    def __init__(self, dataset_path: Path):
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        posts = payload.get("posts")
        if not isinstance(posts, list):
            raise ValueError("Facebook dataset must contain a posts array")
        self.dataset = payload.get("dataset", {})
        self.posts = posts
        self.concepts = self.dataset.get("concept_bridge", {})
        self._features = [_features(str(p.get("retrieval_text", ""))) for p in posts]
        document_frequency: Counter[str] = Counter()
        for features in self._features:
            document_frequency.update(features.keys())
        count = len(posts)
        self._idf = {
            feature: math.log((count + 1) / (frequency + 1)) + 1
            for feature, frequency in document_frequency.items()
        }
        self._vectors = [self._vectorize(features) for features in self._features]

    def _vectorize(self, features: Counter[str]) -> dict[str, float]:
        weighted = {
            feature: (1 + math.log(frequency)) * self._idf.get(feature, 1.0)
            for feature, frequency in features.items() if frequency > 0
        }
        norm = math.sqrt(sum(value * value for value in weighted.values())) or 1.0
        return {feature: value / norm for feature, value in weighted.items()}

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
        query_vector = self._vectorize(_features(self._expand_query(query)))
        normalized_query = _normalize(query)
        scored: list[tuple[float, int, dict[str, Any]]] = []

        for index, (post, vector) in enumerate(zip(self.posts, self._vectors)):
            date = str(post.get("date") or "")
            if start_date and date[:10] < start_date:
                continue
            if end_date and date[:10] > end_date:
                continue
            if year and post.get("year") != year:
                continue

            score = self._cosine(query_vector, vector)
            text = _normalize(str(post.get("text") or ""))
            if normalized_query and normalized_query in text:
                score += 0.05
            matched_concepts = [
                label for label, group in self.concepts.items()
                if any(term in normalized_query for term in group)
                and label in post.get("concepts", [])
            ]
            score += min(len(matched_concepts) * 0.015, 0.06)
            if score > 0:
                row = dict(post)
                row["matched_concepts"] = matched_concepts
                scored.append((score, index, row))

        scored.sort(key=lambda item: (-item[0], item[1]))
        return [
            {
                "result_id": post.get("record_id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC6",
                "related_locs": ["LOC7", "LOC8"],
                "content_type": "facebook_post",
                "group": "social_archive",
                "title": f"Facebook｜{str(post.get('date') or '')[:10]}",
                "summary": post.get("text") or "",
                "score": round(score, 6),
                "source_refs": [{
                    "source_type": "facebook",
                    "source_id": post.get("record_id"),
                    "note": "private archive; mounted at runtime",
                }],
                "payload": post,
            }
            for score, _, post in scored[:max(1, min(top_k, 50))]
        ]
