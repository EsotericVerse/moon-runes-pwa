from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from paths import registry_json, search_json


_SPACE_RE = re.compile(r"\s+")
_TOKEN_RE = re.compile(r"[a-z0-9]+|[\u3400-\u9fff]")


def _load_search_governance() -> tuple[tuple[tuple[str, ...], ...], re.Pattern[str], tuple[tuple[tuple[str, ...], str, float], ...]]:
    path = registry_json("LOC_SEARCH_GOVERNANCE.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    concepts = tuple(
        tuple(str(term) for term in item.get("terms", []) if str(term).strip())
        for item in payload.get("concept_bridge", [])
        if item.get("terms")
    )
    out_of_domain = re.compile(str(payload.get("out_of_domain_regex") or r"(?!x)x"))
    intent_boosts = tuple(
        (
            tuple(str(term) for term in item.get("query_terms", []) if str(term).strip()),
            str(item.get("category_contains") or ""),
            float(item.get("weight") or 0.0),
        )
        for item in payload.get("intent_boosts", [])
    )
    if not concepts:
        raise ValueError("LOC_SEARCH_GOVERNANCE concept_bridge must not be empty")
    return concepts, out_of_domain, intent_boosts


_CONCEPTS, _OUT_OF_DOMAIN_RE, _INTENT_BOOSTS = _load_search_governance()


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").lower()
    return _SPACE_RE.sub(" ", value).strip()


def _expand_query(query: str) -> str:
    normalized = _normalize(query)
    additions = []
    for group in _CONCEPTS:
        if any(term in normalized for term in group):
            additions.extend(group)
    return " ".join([normalized, *dict.fromkeys(additions)])


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


def _values(value: Any) -> set[str]:
    if isinstance(value, list):
        return {_normalize(str(item)) for item in value if str(item).strip()}
    return {_normalize(str(value))} if str(value or "").strip() else set()


@dataclass(frozen=True)
class LOC3Result:
    rank: int
    score: float
    work: dict[str, Any]
    matched_terms: list[str]

    def as_dict(self) -> dict[str, Any]:
        work = self.work
        versions = work.get("versions", [])
        historical_loc_ids = []
        for raw in [work.get("primary_loc"), *(work.get("related_locs") or [])]:
            value = str(raw or "").strip()
            if re.fullmatch(r"LOC[1-8]", value, re.I) and value.upper() not in historical_loc_ids:
                historical_loc_ids.append(value.upper())
        result = {
            "rank": self.rank,
            "score": round(self.score, 6),
            "system_id": work.get("system_id"),
            "feature_ids": list(work.get("feature_ids") or ["music", "text"]),
            "work_id": work["work_id"],
            "title": work["title"],
            "created_date": work.get("created_date"),
            "period": work.get("period"),
            "era_id": work.get("era_id") or work.get("era"),
            "era": work.get("era"),
            "era_name": work.get("era_name"),
            "playlists": work.get("playlists", []),
            "style": work.get("style"),
            "summary": work.get("summary"),
            "category": work.get("category"),
            "lyric_type": work.get("lyric_type") or work.get("category"),
            "start_state": work.get("start_state"),
            "turn_method": work.get("turn_method"),
            "final_state": work.get("final_state"),
            "emotion_function": work.get("emotion_function"),
            "ending_structure": work.get("ending_structure"),
            "hope_extension": work.get("hope_extension"),
            "tags": work.get("tags", []),
            "reasoning_tags": work.get("reasoning_tags", []),
            "semantic_keywords": work.get("semantic_keywords", work.get("tags", [])),
            "discourse_mode": work.get("discourse_mode"),
            "emotion_applicability": work.get("emotion_applicability"),
            "semantic_completion": work.get("semantic_completion"),
            "content_origin": work.get("content_origin", "normal_song"),
            "origin_label": (
                "符文歌曲" if work.get("content_origin") == "rune_song"
                else "敘事歌曲" if work.get("content_origin") == "narrative_song"
                else "一般歌曲"
            ),
            "matched_terms": self.matched_terms,
            "recommended_version": versions[0] if versions else None,
            "alternate_versions": versions[1:],
            "version_count": len(versions),
        }
        scope_id = str(work.get("scope_id") or "").strip()
        if scope_id and not re.fullmatch(r"LOC[1-8]", scope_id, re.I):
            result["scope_id"] = scope_id
        if historical_loc_ids:
            result["historical_provenance"] = {"loc_ids": historical_loc_ids}
        return result


class LOC3SearchEngine:
    """Dependency-free Traditional Chinese hybrid vector search for the music corpus."""

    def __init__(self, dataset_path: Path):
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        works = payload.get("works")
        if not works and payload.get("shards"):
            works = []
            for shard_name in payload["shards"]:
                shard_path = dataset_path.parent / str(shard_name)
                shard = json.loads(shard_path.read_text(encoding="utf-8"))
                works.extend(shard.get("works", []))
        if not isinstance(works, list) or not works:
            raise ValueError("LOC3 dataset must contain a non-empty works array")

        # Prefer the shared media registry; keep the historical numbered overlay
        # only as a compatibility fallback while source data is being migrated.
        shared_media_path = registry_json("LOC_MEDIA_REGISTRY.json")
        legacy_media_path = search_json("loc3", "LOC3_MEDIA_LINKS_v0.1.json")
        if shared_media_path.exists():
            media = json.loads(shared_media_path.read_text(encoding="utf-8"))
            by_song_id = {}
            for item in media.get("items", []):
                song_id = item.get("linked_song_id")
                if not song_id:
                    continue
                by_song_id.setdefault(song_id, []).append(item)

            for song_id, items in by_song_id.items():
                items.sort(
                    key=lambda item: (
                        str(item.get("media_created_date") or item.get("source_created_date") or ""),
                        str(item.get("media_id") or ""),
                    ),
                    reverse=True,
                )

            for work in works:
                for version in work.get("versions", []):
                    items = by_song_id.get(version.get("song_id"), [])
                    if items:
                        primary = items[0]
                        version["media_id"] = primary.get("media_id")
                        version["media_ids"] = [item.get("media_id") for item in items if item.get("media_id")]
                        version["ig_preview_url"] = primary.get("url", "")
                        version["ig_preview_urls"] = [item.get("url") for item in items if item.get("url")]
                        version["media_type"] = primary.get("media_type")
                        version["media_source_refs"] = [
                            ref
                            for item in items
                            for ref in item.get("source_refs", [])
                        ]
        elif legacy_media_path.exists():
            media = json.loads(legacy_media_path.read_text(encoding="utf-8"))
            by_song_id = {item["song_id"]: item for item in media.get("items", [])}
            for work in works:
                for version in work.get("versions", []):
                    item = by_song_id.get(version.get("song_id"))
                    if item:
                        version["ig_preview_url"] = item.get("ig_preview_url", "")
                        version["suno_share_url"] = item.get("suno_share_url", "")
        ids = [work.get("work_id") for work in works]
        hashes = [work.get("lyrics_hash") for work in works]
        if len(ids) != len(set(ids)) or len(hashes) != len(set(hashes)):
            raise ValueError("LOC3 work IDs and lyric hashes must be unique")

        self.dataset = payload.get("dataset", {})
        relationship_path = registry_json("LOC_CROSS_RELATIONSHIP_REGISTRY.json")
        if relationship_path.exists():
            try:
                self.relationships = json.loads(relationship_path.read_text(encoding="utf-8")).get("relationships", [])
            except Exception:
                self.relationships = []
        else:
            self.relationships = []
        self.works = works
        # Feature counters are only an initialization buffer. Keeping them after
        # vectors are built duplicates the LOC3 search representation in RAM.
        features_by_work = [_features(str(work.get("retrieval_text", ""))) for work in works]
        document_frequency: Counter[str] = Counter()
        for features in features_by_work:
            document_frequency.update(features.keys())
        count = len(works)
        self._idf = {
            feature: math.log((count + 1) / (frequency + 1)) + 1
            for feature, frequency in document_frequency.items()
        }
        self._vectors = [self._vectorize(features) for features in features_by_work]
        del features_by_work
        del document_frequency

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

    @staticmethod
    def _matches_filters(work: dict[str, Any], filters: dict[str, str]) -> bool:
        mapping = {
            "period": "period", "era": "era", "playlist": "playlists",
            "category": "category", "style": "style",
        }
        for request_key, work_key in mapping.items():
            expected = _normalize(filters.get(request_key, ""))
            if expected and expected not in _values(work.get(work_key)):
                return False
        return True

    @staticmethod
    def _matched_terms(query: str, work: dict[str, Any]) -> list[str]:
        haystack = _normalize(" ".join([
            str(work.get("summary", "")), str(work.get("category", "")),
            str(work.get("start_state", "")), str(work.get("turn_method", "")),
            str(work.get("final_state", "")), " ".join(work.get("tags", [])),
            " ".join(work.get("reasoning_tags", [])),
        ]))
        normalized_query = _normalize(query)
        terms = []
        for group in _CONCEPTS:
            if any(term in normalized_query for term in group):
                terms.extend(term for term in group if term in haystack)
        # Direct keyword/proposition matches are especially important for rational songs.
        for term in work.get("semantic_keywords", work.get("tags", [])):
            normalized_term = _normalize(str(term))
            if normalized_term and (normalized_term in normalized_query or normalized_query in normalized_term):
                terms.append(str(term))
        return list(dict.fromkeys(terms))[:8]

    @staticmethod
    def _intent_boost(query: str, work: dict[str, Any]) -> float:
        query = _normalize(query)
        category = _normalize(str(work.get("category", "")))
        return max(
            (
                weight
                for terms, label, weight in _INTENT_BOOSTS
                if any(term in query for term in terms) and _normalize(label) in category
            ),
            default=0.0,
        )

    def search(self, query: str, top_k: int = 8, filters: dict[str, str] | None = None) -> list[LOC3Result]:
        query = query.strip()
        if not query:
            raise ValueError("query must not be blank")
        if _OUT_OF_DOMAIN_RE.search(_normalize(query)):
            return []
        filters = filters or {}
        query_vector = self._vectorize(_features(_expand_query(query)))
        scored = []
        for index, (work, vector) in enumerate(zip(self.works, self._vectors)):
            if not self._matches_filters(work, filters):
                continue
            score = self._cosine(query_vector, vector)
            matched = self._matched_terms(query, work)
            score += min(len(matched) * 0.012, 0.048)
            score += self._intent_boost(query, work)
            # Curated cross-work relevance (e.g. LOC4 theme/character songs) is a small
            # bounded recommendation prior; it never replaces semantic similarity.
            score += min(float(work.get("recommendation_bonus") or 0.0), 60.0) / 2000.0
            scored.append((score, index, work, matched))
        scored.sort(key=lambda item: (-item[0], item[1]))
        limit = max(1, min(top_k, 12))
        if not scored or scored[0][0] < 0.035:
            return []
        return [
            LOC3Result(rank=rank, score=score, work=work, matched_terms=matched)
            for rank, (score, _, work, matched) in enumerate(scored[:limit], start=1)
            if score >= 0.018
        ]

    def related_bundle(self, query: str) -> list[dict[str, Any]]:
        normalized = _normalize(query)
        bundles = []
        for rel in self.relationships:
            aliases = [rel.get("canonical_key", ""), *rel.get("aliases", [])]
            if not any(_normalize(alias) and _normalize(alias) in normalized for alias in aliases):
                continue
            bundles.append({
                "relationship_id": rel.get("relationship_id"),
                "canonical_key": rel.get("canonical_key"),
                "source": rel.get("source"),
                "targets": rel.get("targets", []),
                "relation_type": rel.get("relation_type"),
                "direction": rel.get("direction"),
                "relation_summary": rel.get("relation_summary"),
                "keywords": rel.get("keywords", []),
                "loc6_interpretation": rel.get("loc6_interpretation"),
            })
        return bundles

    def facets(self) -> dict[str, list[dict[str, Any]]]:
        fields = {"periods": "period", "eras": "era_name", "playlists": "playlists", "categories": "category", "styles": "style"}
        output = {}
        for name, field in fields.items():
            counts: Counter[str] = Counter()
            for work in self.works:
                counts.update(_values(work.get(field)))
            output[name] = [{"value": value, "count": count} for value, count in counts.most_common() if value]
        return output
