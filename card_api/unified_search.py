from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any


def _normalize(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).lower().strip()


def _compact(value: Any) -> str:
    return re.sub(r"\s+", "", _normalize(value))


def _text_score(query: str, parts: list[Any]) -> float:
    q = _compact(query)
    if not q:
        return 0.0
    haystack = _compact(" ".join(str(part or "") for part in parts))
    if not haystack:
        return 0.0
    if q in haystack:
        return 1.0
    # Conservative CJK/short-query recall. Avoid emitting unrelated records.
    chars = [ch for ch in dict.fromkeys(q) if ch.strip()]
    if not chars:
        return 0.0
    overlap = sum(1 for ch in chars if ch in haystack) / len(chars)
    return overlap * 0.55 if overlap >= 0.6 else 0.0


class UnifiedSearchEngine:
    """Cross-LOC orchestration layer.

    This engine does not merge canonical data stores. It queries each authority
    and returns a shared result envelope so one UI can display heterogeneous
    LOC records without changing their ownership.
    """

    def __init__(
        self,
        faq_searcher: Any,
        loc3_searcher: Any,
        runes: list[dict[str, Any]],
        repo_root: Path,
    ):
        self.faq_searcher = faq_searcher
        self.loc3_searcher = loc3_searcher
        self.runes = runes or []
        self.repo_root = repo_root
        self.shared_root = repo_root / "data" / "shared"
        self.system = self._load_json("LOC_LANGUAGE_SYSTEM_REGISTRY.json")
        self.eras = self._load_json("LOC_ERA_REGISTRY.json")
        self.content_types = self._load_json("LOC_CONTENT_TYPE_REGISTRY.json")
        self.relationships = self._load_json("LOC_CROSS_RELATIONSHIP_REGISTRY.json")
        self.loc4 = self._load_json("LOC4_WRITING_REGISTRY.json")
        self.knowledge_assets = self._load_json("LOC_KNOWLEDGE_ASSET_REGISTRY.json")
        self.media = self._load_json("LOC_MEDIA_REGISTRY.json")
        self.lots = self._load_json("lots.json")

    def _load_json(self, name: str) -> dict[str, Any]:
        path = self.shared_root / name
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    @staticmethod
    def _allowed(content_type: str, wanted: str) -> bool:
        return not wanted or wanted == "all" or content_type == wanted

    def _oracle_result(self, query: str) -> tuple[list[dict[str, Any]], str]:
        """Parse natural-language single-rune queries such as 愛情 + 心半正 and return Lots first."""
        q = _normalize(query)
        category_aliases = {
            "愛情": ["愛情", "感情", "戀愛", "曖昧", "伴侶"],
            "事業": ["事業", "工作", "職涯", "職場", "創業"],
            "關係": ["關係", "人際", "友情", "親情", "社交"],
            "健康": ["健康", "身體", "身心", "壓力", "休息"],
        }
        category = next((name for name, aliases in category_aliases.items() if any(alias in q for alias in aliases)), None)

        direction = None
        for label, aliases in [
            ("半正位", ["半正位", "半正"]),
            ("半逆位", ["半逆位", "半逆"]),
            ("正位", ["正位"]),
            ("逆位", ["逆位"]),
        ]:
            if any(alias in q for alias in aliases):
                direction = label
                break

        rune = None
        for item in sorted(self.runes, key=lambda row: len(str(row.get("名稱") or row.get("符文名稱") or "")), reverse=True):
            name = str(item.get("名稱") or item.get("符文名稱") or "")
            if name and name in q:
                rune = item
                break

        if not (category and direction and rune):
            return [], query

        name = rune.get("名稱") or rune.get("符文名稱")
        lots_item = next((item for item in self.lots.get("items", []) if item.get("名稱") == name), None)
        poem = (((lots_item or {}).get("方向") or {}).get(direction) or {}).get(category)
        if not poem:
            return [], query

        direction_field = {
            "正位": "正向表示",
            "半正位": "半正向表示",
            "半逆位": "半逆向表示",
            "逆位": "逆向表示",
        }.get(direction)
        direction_text = rune.get(direction_field) if direction_field else None

        raw_terms = [
            name,
            category,
            direction,
            poem,
            rune.get("顯化形式"),
            rune.get("關鍵詞"),
            direction_text,
            self.lots.get("categories", {}).get(category),
        ]
        extension_terms = []
        for value in raw_terms:
            if not value:
                continue
            for term in re.split(r"[・、，,；;／/\s]+", str(value)):
                term = term.strip()
                if term and term not in extension_terms:
                    extension_terms.append(term)

        result = {
            "result_id": f"LOT-{lots_item.get('編號')}-{direction}-{category}",
            "system_id": "lo3rwang",
            "primary_loc": "LOC1",
            "related_locs": ["LOC3", "LOC4", "LOC5", "LOC6", "LOC7", "LOC8"],
            "content_type": "lot_result",
            "group": "oracle",
            "title": f"{name} · {direction} · {category}",
            "summary": poem,
            "score": 1.0,
            "source_refs": [{"source_type": "spreadsheet", "source_id": "LunaRune64.xlsx#Lots", "note": "via data/shared/lots.json"}],
            "payload": {
                "rune_number": lots_item.get("編號"),
                "rune_name": name,
                "direction": direction,
                "question_category": category,
                "lot": poem,
                "direction_text": direction_text,
                "rune_moon": rune.get("月相") or rune.get("符文月相"),
                "manifestation": rune.get("顯化形式"),
                "keywords": rune.get("關鍵詞"),
                "extension_terms": extension_terms[:16],
                "display_order": ["lot", "direction_text", "extension_terms"],
            },
        }

        expansion_query = " ".join(extension_terms[:10])
        return [result], expansion_query or query

    def _knowledge_asset_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "knowledge", "knowledge_document"}:
            return []
        scored = []
        for asset in self.knowledge_assets.get("assets", []):
            if not asset.get("searchable"):
                continue
            rel_path = asset.get("path")
            content = ""
            if rel_path:
                path = self.repo_root / rel_path
                if path.exists() and path.suffix.lower() in {".md", ".txt"}:
                    try:
                        content = path.read_text(encoding="utf-8")
                    except Exception:
                        content = ""
            score = _text_score(query, [
                asset.get("title"),
                asset.get("role"),
                " ".join(asset.get("keywords", [])),
                asset.get("notes"),
                content,
            ])
            if score < 0.34:
                continue
            scored.append((score, asset))
        scored.sort(key=lambda row: (-row[0], str(row[1].get("asset_id", ""))))
        return [{
            "result_id": asset.get("asset_id"),
            "system_id": "lo3rwang",
            "primary_loc": asset.get("primary_loc") or "LOC7",
            "related_locs": asset.get("related_locs", []),
            "content_type": "knowledge_document",
            "group": "knowledge",
            "title": asset.get("title"),
            "summary": asset.get("notes") or asset.get("role") or "",
            "score": round(score, 6),
            "source_refs": [{"source_type": asset.get("source_type"), "source_id": asset.get("path"), "note": asset.get("authority_level")}],
            "payload": asset,
        } for score, asset in scored[:top_k]]

    def _faq_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if not self.faq_searcher or wanted not in {"", "all", "faq", "knowledge"}:
            return []
        results = []
        for item in self.faq_searcher.search(query, top_k=min(top_k, 8)):
            row = item.as_dict()
            results.append({
                "result_id": row.get("id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC7",
                "related_locs": ["LOC6", "LOC8"],
                "content_type": "faq",
                "group": "knowledge",
                "title": row.get("question") or row.get("intent"),
                "summary": row.get("answer"),
                "score": row.get("score", 0),
                "source_refs": row.get("source_refs", []),
                "payload": row,
            })
        return results

    def _music_results(
        self,
        query: str,
        top_k: int,
        wanted: str,
        filters: dict[str, str],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        if not self.loc3_searcher:
            return [], []
        wants_music = wanted in {"", "all", "lyrics_work", "suno_song"}
        wants_media = wanted in {"", "all", "multimedia", "reel", "video"}
        if wanted not in {"", "all", "lyrics_work", "suno_song", "multimedia", "reel", "video"}:
            return [], []

        works = self.loc3_searcher.search(query, top_k=min(top_k, 10), filters=filters)
        music: list[dict[str, Any]] = []
        media: list[dict[str, Any]] = []
        for item in works:
            row = item.as_dict()
            if wants_music:
                music.append({
                    "result_id": row.get("work_id"),
                    "system_id": row.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC3",
                    "related_locs": row.get("related_locs", ["LOC5", "LOC6", "LOC7", "LOC8"]),
                    "content_type": "suno_song" if wanted == "suno_song" else "lyrics_work",
                    "group": "works",
                    "title": row.get("title"),
                    "summary": row.get("summary"),
                    "score": row.get("score", 0),
                    "era_id": row.get("era_id"),
                    "period": row.get("period"),
                    "source_refs": [],
                    "payload": row,
                })

            version = row.get("recommended_version") or {}
            media_id = version.get("media_id")
            media_url = version.get("ig_preview_url")
            if wants_media and media_id and media_url:
                media.append({
                    "result_id": media_id,
                    "system_id": row.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC5",
                    "related_locs": ["LOC3", "LOC6", "LOC7", "LOC8"],
                    "content_type": "reel",
                    "group": "media",
                    "title": f"{row.get('title', '')} · Reel",
                    "summary": row.get("summary"),
                    "score": max(float(row.get("score", 0)) - 0.002, 0),
                    "era_id": row.get("era_id"),
                    "period": row.get("period"),
                    "source_refs": version.get("media_source_refs", []),
                    "payload": {
                        "media_id": media_id,
                        "media_type": version.get("media_type"),
                        "url": media_url,
                        "linked_work_id": row.get("work_id"),
                        "linked_song_id": version.get("song_id"),
                    },
                })
        return music, media

    def _loc4_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "text_work", "article"}:
            return []
        scored = []
        for work in self.loc4.get("works", []):
            score = _text_score(query, [
                work.get("title"),
                work.get("summary"),
                " ".join(work.get("tags", [])),
                work.get("content_type"),
            ])
            if score < 0.34:
                continue
            scored.append((score, work))
        scored.sort(key=lambda row: (-row[0], str(row[1].get("work_id", ""))))
        return [{
            "result_id": work.get("work_id"),
            "system_id": work.get("system_id") or "lo3rwang",
            "primary_loc": "LOC4",
            "related_locs": work.get("related_locs", []),
            "content_type": "text_work",
            "group": "textworks",
            "title": work.get("title"),
            "summary": work.get("summary"),
            "score": round(score, 6),
            "era_id": work.get("era_id"),
            "source_refs": work.get("source_refs", []),
            "payload": work,
        } for score, work in scored[:top_k]]

    def _media_registry_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "multimedia", "reel", "video"}:
            return []
        scored = []
        for item in self.media.get("items", []):
            semantic = item.get("semantic_descriptor") or {}
            score = _text_score(query, [
                item.get("title"),
                item.get("purpose"),
                semantic.get("visual_summary"),
                " ".join(semantic.get("scene_keywords", [])),
                " ".join(semantic.get("visual_motifs", [])),
                " ".join(semantic.get("manual_tags", [])),
                " ".join(semantic.get("generated_tags", [])),
            ])
            if score < 0.34:
                continue
            scored.append((score, item))
        scored.sort(key=lambda row: (-row[0], str(row[1].get("media_id", ""))))
        return [{
            "result_id": item.get("media_id"),
            "system_id": item.get("system_id") or "lo3rwang",
            "primary_loc": "LOC5",
            "related_locs": item.get("related_locs", []),
            "content_type": "multimedia",
            "group": "media",
            "title": item.get("title"),
            "summary": (item.get("semantic_descriptor") or {}).get("visual_summary") or item.get("purpose") or "",
            "score": round(score, 6),
            "source_refs": item.get("source_refs", []),
            "payload": item,
        } for score, item in scored[:top_k]]

    def _relationship_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "relationship", "article", "text_work", "reel", "video", "multimedia", "lyrics_work", "suno_song"}:
            return []
        q = _normalize(query)
        loc4_by_id = {item.get("work_id"): item for item in self.loc4.get("works", [])}
        output = []
        for rel in self.relationships.get("relationships", []):
            aliases = [rel.get("canonical_key", ""), *rel.get("aliases", [])]
            if not any(_normalize(alias) and _normalize(alias) in q for alias in aliases):
                continue

            targets = []
            for target in rel.get("targets", []):
                item = dict(target)
                if target.get("primary_loc") == "LOC4":
                    work = loc4_by_id.get(target.get("work_ref"), {})
                    item["summary"] = work.get("summary")
                    item["tags"] = work.get("tags", [])
                targets.append(item)

            output.append({
                "result_id": rel.get("relationship_id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC7",
                "related_locs": ["LOC3", "LOC4", "LOC5", "LOC6"],
                "content_type": "relationship",
                "group": "relationships",
                "title": rel.get("canonical_key"),
                "summary": rel.get("relation_summary"),
                "score": 1.0,
                "source_refs": [],
                "payload": {
                    "source": rel.get("source"),
                    "targets": targets,
                    "keywords": rel.get("keywords", []),
                    "direction": rel.get("direction"),
                    "relation_type": rel.get("relation_type"),
                    "loc6_interpretation": rel.get("loc6_interpretation"),
                },
            })
        return output[:top_k]

    def _rune_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if not self._allowed("rune_record", wanted):
            return []
        scored = []
        for index, rune in enumerate(self.runes, start=1):
            name = rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or ""
            number = rune.get("編號") or index
            score = _text_score(query, [
                name,
                rune.get("關鍵詞"),
                rune.get("顯化形式"),
                rune.get("反向關鍵詞"),
                rune.get("反向含義"),
                rune.get("定義"),
                rune.get("核心定義"),
            ])
            if score < 0.34:
                continue
            scored.append((score, number, name, rune))
        scored.sort(key=lambda row: (-row[0], str(row[1])))
        return [{
            "result_id": f"RUNE-{number}",
            "system_id": "lo3rwang",
            "primary_loc": "LOC1",
            "related_locs": ["LOC2", "LOC7", "LOC8"],
            "content_type": "rune_record",
            "group": "runes",
            "title": f"{number} · {name}",
            "summary": rune.get("核心定義") or rune.get("定義") or rune.get("顯化形式") or rune.get("關鍵詞") or "",
            "score": round(score, 6),
            "source_refs": [{"source_type": "spreadsheet", "source_id": "LunaRune64.xlsx", "note": None}],
            "payload": rune,
        } for score, number, name, rune in scored[:top_k]]

    def _era_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if not self._allowed("era", wanted):
            return []
        scored = []
        for era in self.eras.get("eras", []):
            score = _text_score(query, [
                era.get("period"),
                era.get("name"),
                era.get("display_label"),
                era.get("description"),
                era.get("state_before"),
                era.get("state_after"),
            ])
            if score < 0.34:
                continue
            scored.append((score, era))
        scored.sort(key=lambda row: (-row[0], row[1].get("order", 999)))
        return [{
            "result_id": era.get("era_id"),
            "system_id": self.eras.get("language_system_id") or "lo3rwang",
            "primary_loc": "LOC8",
            "related_locs": ["LOC3", "LOC4", "LOC5", "LOC6", "LOC7"],
            "content_type": "era",
            "group": "timeline",
            "title": era.get("display_label") or era.get("name"),
            "summary": era.get("description") or era.get("state_after"),
            "score": round(score, 6),
            "era_id": era.get("era_id"),
            "period": era.get("period"),
            "source_refs": [{"source_type": "event", "source_id": era.get("source_event_id"), "note": None}],
            "payload": era,
        } for score, era in scored[:top_k]]

    def search(
        self,
        query: str,
        top_k: int = 6,
        content_type: str = "",
        filters: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        filters = filters or {}
        wanted = (content_type or "").strip().lower()

        oracle, expanded_query = self._oracle_result(query)
        retrieval_query = expanded_query if oracle else query
        faq = self._faq_results(retrieval_query, top_k, wanted)
        documents = self._knowledge_asset_results(retrieval_query, top_k, wanted)
        music, linked_media = self._music_results(retrieval_query, top_k, wanted, filters)
        textworks = self._loc4_results(retrieval_query, top_k, wanted)
        direct_media = self._media_registry_results(retrieval_query, top_k, wanted)
        media_by_id = {}
        for item in [*direct_media, *linked_media]:
            media_by_id[item.get("result_id")] = item
        media = list(media_by_id.values())[:top_k]
        relationships = self._relationship_results(retrieval_query, top_k, wanted)
        runes = self._rune_results(retrieval_query, top_k, wanted)
        eras = self._era_results(retrieval_query, top_k, wanted)

        groups = {
            "oracle": oracle,
            "runes": runes,
            "works": music,
            "textworks": textworks,
            "relationships": relationships,
            "media": media,
            "knowledge": [*documents, *faq],
            "timeline": eras,
        }
        return {
            "system_id": "lo3rwang",
            "query": query,
            "content_type": wanted or "all",
            "groups": groups,
            "counts": {key: len(value) for key, value in groups.items()},
            "total_count": sum(len(value) for value in groups.values()),
            "coverage": {
                "LOC1": "live",
                "LOC2": "knowledge-view-only",
                "LOC3": "live",
                "LOC4": "direct-work-search-live",
                "LOC5": "direct-media-registry-search-live",
                "LOC6": "relationship-interpretation-live",
                "LOC7": "live",
                "LOC8": "live-era",
            },
        }
