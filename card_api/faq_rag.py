from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


_SPACE_RE = re.compile(r"\s+")
_WORD_RE = re.compile(r"[a-z0-9]+|[\u3400-\u9fff]")


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    return _SPACE_RE.sub(" ", text).strip()


def _features(text: str) -> Counter[str]:
    """Create dependency-free features suitable for short Traditional Chinese queries."""
    normalized = _normalize(text)
    compact = "".join(_WORD_RE.findall(normalized))
    features: Counter[str] = Counter()

    for token in _WORD_RE.findall(normalized):
        features[f"w:{token}"] += 1

    for size in range(1, 5):
        for start in range(max(0, len(compact) - size + 1)):
            features[f"c{size}:{compact[start:start + size]}"] += 1

    return features


@dataclass(frozen=True)
class SearchResult:
    rank: int
    score: float
    chunk: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "rank": self.rank,
            "score": round(self.score, 6),
            "id": self.chunk["id"],
            "parent_id": self.chunk["parent_id"],
            "intent": self.chunk["intent"],
            "question": self.chunk["question"],
            "answer": self.chunk["answer"],
            "category": self.chunk["category"],
            "source_refs": self.chunk.get("source_refs", []),
            "canon_version": self.chunk.get("canon_version"),
        }


class FAQSearchEngine:
    """Small hybrid retriever for the LOC7 FAQ dataset.

    The dataset contains confirmed questions, aliases and keywords. Character
    n-gram TF-IDF handles short Chinese queries while exact alias/keyword
    matches provide deterministic boosts. No external model is required.
    """

    def __init__(self, dataset_path: Path):
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        chunks = payload.get("chunks")
        if not isinstance(chunks, list) or not chunks:
            raise ValueError("FAQ dataset must contain a non-empty chunks array")

        ids = [chunk.get("id") for chunk in chunks]
        if any(not chunk_id for chunk_id in ids) or len(ids) != len(set(ids)):
            raise ValueError("FAQ chunk IDs must be present and unique")

        self.dataset = payload.get("dataset", {})
        self.chunks = chunks
        self._document_features = [
            _features(str(chunk.get("retrieval_text", ""))) for chunk in chunks
        ]
        document_frequency: Counter[str] = Counter()
        for features in self._document_features:
            document_frequency.update(features.keys())

        count = len(chunks)
        self._idf = {
            feature: math.log((count + 1) / (frequency + 1)) + 1
            for feature, frequency in document_frequency.items()
        }
        self._document_vectors = [
            self._vectorize(features) for features in self._document_features
        ]

    def _vectorize(self, features: Counter[str]) -> dict[str, float]:
        weighted = {
            feature: (1 + math.log(frequency)) * self._idf.get(feature, 1.0)
            for feature, frequency in features.items()
            if frequency > 0
        }
        norm = math.sqrt(sum(value * value for value in weighted.values())) or 1.0
        return {feature: value / norm for feature, value in weighted.items()}

    @staticmethod
    def _cosine(left: dict[str, float], right: dict[str, float]) -> float:
        if len(left) > len(right):
            left, right = right, left
        return sum(value * right.get(feature, 0.0) for feature, value in left.items())

    @staticmethod
    def _match_boost(query: str, chunk: dict[str, Any]) -> float:
        query = _normalize(query)
        candidates = [chunk.get("question", ""), *chunk.get("aliases", [])]
        boost = 0.0
        for candidate in candidates:
            candidate = _normalize(str(candidate))
            if query == candidate:
                boost = max(boost, 0.45)
            elif len(query) >= 2 and (query in candidate or candidate in query):
                boost = max(boost, 0.18)

        keyword_hits = sum(
            1 for keyword in chunk.get("keywords", []) if _normalize(str(keyword)) in query
        )
        return boost + min(keyword_hits * 0.035, 0.14)

    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        query = query.strip()
        if not query:
            raise ValueError("query must not be blank")

        top_k = max(1, min(top_k, 10, len(self.chunks)))
        query_vector = self._vectorize(_features(query))
        scored = []
        for index, (chunk, document_vector) in enumerate(
            zip(self.chunks, self._document_vectors)
        ):
            score = self._cosine(query_vector, document_vector)
            score += self._match_boost(query, chunk)
            scored.append((score, index, chunk))

        scored.sort(key=lambda item: (-item[0], item[1]))
        return [
            SearchResult(rank=rank, score=score, chunk=chunk)
            for rank, (score, _, chunk) in enumerate(scored[:top_k], start=1)
        ]

    def answer(self, query: str, top_k: int = 5) -> dict[str, Any]:
        results = self.search(query, top_k=top_k)
        relevant = [result for result in results if result.score >= 0.08]
        if not relevant:
            return {
                "answer": "目前FAQ沒有足夠的已確認資訊可以回答這個問題。",
                "mode": "extractive",
                "citations": [],
                "retrieved": [result.as_dict() for result in results],
            }

        question_parts = [part for part in re.split(r"[？?]+", query) if part.strip()]
        intent_limit = 2 if len(question_parts) >= 2 else 1
        if any(marker in query for marker in ("和", "與", "以及", "還有", "同時", "或者")):
            intent_limit = max(intent_limit, 2)
        intent_limit = min(intent_limit, 3)

        selected: list[SearchResult] = []
        seen_answers: set[str] = set()
        seen_parents: set[str] = set()

        def add_result(result: SearchResult) -> bool:
            answer = result.chunk["answer"].strip()
            parent_id = result.chunk["parent_id"]
            if answer in seen_answers or parent_id in seen_parents:
                return False
            seen_answers.add(answer)
            seen_parents.add(parent_id)
            selected.append(result)
            return True

        # Multi-intent queries should retrieve each clause independently before
        # global ranking. Otherwise one strong topic can occupy all top slots
        # and hide the second requested source.
        clauses = [
            part.strip(" ，,。！？!?")
            for part in re.split(r"(?:以及|還有|同時|或者|與|和)", query)
            if part.strip(" ，,。！？!?")
        ]
        # Shared interrogative tails semantically apply to every coordinated
        # clause: "A 和 B 是什麼？" means "A 是什麼？" + "B 是什麼？".
        shared_tail = ""
        tail_match = re.search(r"(是什麼|是甚麼|做什麼|有什麼|怎麼運作|怎麼使用|如何運作|如何使用)[？?]?$", query)
        if tail_match:
            shared_tail = tail_match.group(1)

        if intent_limit > 1 and len(clauses) > 1:
            for clause in clauses[:intent_limit]:
                subquery = clause
                if shared_tail and shared_tail not in subquery:
                    subquery = f"{subquery}{shared_tail}"
                clause_results = self.search(subquery, top_k=top_k)
                clause_relevant = [result for result in clause_results if result.score >= 0.08]
                if clause_relevant:
                    add_result(clause_relevant[0])
                if len(selected) == intent_limit:
                    break

        # Fill remaining slots from the full-query ranking while preserving
        # distinct source parents/answers.
        if len(selected) < intent_limit:
            for result in relevant:
                add_result(result)
                if len(selected) == intent_limit:
                    break

        answer = "\n\n".join(
            f"{result.chunk['answer'].strip()} [{result.chunk['id']}]"
            for result in selected
        )
        return {
            "answer": answer,
            "mode": "extractive",
            "citations": [result.chunk["id"] for result in selected],
            "retrieved": [result.as_dict() for result in results],
        }
