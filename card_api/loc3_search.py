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
_TOKEN_RE = re.compile(r"[a-z0-9]+|[\u3400-\u9fff]")

# Small, author-governed concept bridge. It improves natural-language recall
# without introducing another language or changing the lyric-work ranking unit.
_CONCEPTS = (
    ("界線", "底線", "邊界", "拒絕", "止損", "離開", "斷捨離", "不再消耗", "保護自己"),
    ("自由", "選擇", "航向", "起飛", "前進", "展翅", "自我治理", "為自己負責"),
    ("放下", "釋懷", "告別", "離去", "結束", "鬆手", "不再等待"),
    ("孤獨", "寂寞", "一個人", "獨自", "無人理解", "陪伴"),
    ("背叛", "欺騙", "辜負", "月蝕", "失信", "傷害"),
    ("死亡", "離世", "永別", "日蝕", "失去至愛", "追思", "紀念"),
    ("幸福", "甜蜜", "溫柔", "相守", "日常", "安心", "被愛"),
    ("希望", "微光", "月光", "黎明", "重新開始", "還能前行", "未來"),
    ("憂鬱", "低潮", "無力", "疲憊", "窒息", "撐不住", "黑暗"),
    ("自我價值", "配得感", "相信自己", "肯定自己", "不再否定", "主權"),
    ("祝福", "生日", "朋友", "紀念日", "願望", "陪你長大"),
    ("現實", "壓力", "責任", "工作", "生存", "治理", "承擔"),
)

_OUT_OF_DOMAIN_RE = re.compile(
    r"(?:天氣|氣溫|幾度|降雨機率|颱風|地震|股票|匯率|新聞|路況|台北.*下雨|明天.*下雨)"
)


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
        return {
            "rank": self.rank,
            "score": round(self.score, 6),
            "system_id": work.get("system_id"),
            "primary_loc": work.get("primary_loc", "LOC3"),
            "related_locs": work.get("related_locs", []),
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
            "start_state": work.get("start_state"),
            "turn_method": work.get("turn_method"),
            "final_state": work.get("final_state"),
            "emotion_function": work.get("emotion_function"),
            "ending_structure": work.get("ending_structure"),
            "hope_extension": work.get("hope_extension"),
            "tags": work.get("tags", []),
            "matched_terms": self.matched_terms,
            "recommended_version": versions[0] if versions else None,
            "alternate_versions": versions[1:],
            "version_count": len(versions),
        }


class LOC3SearchEngine:
    """Dependency-free Traditional Chinese hybrid vector search for LOC3."""

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

        # Media is owned by LOC5 and referenced by LOC3.
        # Prefer the shared registry; keep the legacy LOC3 overlay as a compatibility fallback.
        shared_media_path = dataset_path.parents[2] / "data" / "shared" / "LOC_MEDIA_REGISTRY.json"
        legacy_media_path = dataset_path.parent / "LOC3_MEDIA_LINKS_v0.1.json"
        if shared_media_path.exists():
            media = json.loads(shared_media_path.read_text(encoding="utf-8"))
            by_song_id = {item.get("linked_song_id"): item for item in media.get("items", []) if item.get("linked_song_id")}
            for work in works:
                for version in work.get("versions", []):
                    item = by_song_id.get(version.get("song_id"))
                    if item:
                        version["media_id"] = item.get("media_id")
                        version["ig_preview_url"] = item.get("url", "")
                        version["media_type"] = item.get("media_type")
                        version["media_source_refs"] = item.get("source_refs", [])
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
        self.works = works
        self._features = [_features(str(work.get("retrieval_text", ""))) for work in works]
        document_frequency: Counter[str] = Counter()
        for features in self._features:
            document_frequency.update(features.keys())
        count = len(works)
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
        ]))
        terms = []
        for group in _CONCEPTS:
            if any(term in _normalize(query) for term in group):
                terms.extend(term for term in group if term in haystack)
        return list(dict.fromkeys(terms))[:5]

    @staticmethod
    def _intent_boost(query: str, work: dict[str, Any]) -> float:
        query = _normalize(query)
        category = _normalize(str(work.get("category", "")))
        boosts = (
            (("幸福", "甜蜜", "安穩", "相守"), "幸福甜美", 0.055),
            (("生日", "祝福", "紀念"), "祝福紀念", 0.06),
            (("治理", "主權", "底線", "界線", "拒絕"), "治理宣言", 0.045),
        )
        return max(
            (weight for terms, label, weight in boosts if any(term in query for term in terms) and label in category),
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

    def facets(self) -> dict[str, list[dict[str, Any]]]:
        fields = {"periods": "period", "eras": "era_name", "playlists": "playlists", "categories": "category", "styles": "style"}
        output = {}
        for name, field in fields.items():
            counts: Counter[str] = Counter()
            for work in self.works:
                counts.update(_values(work.get(field)))
            output[name] = [{"value": value, "count": count} for value, count in counts.most_common() if value]
        return output
