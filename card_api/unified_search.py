from __future__ import annotations

import gzip
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


def _normalize(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).lower().strip()


def _compact(value: Any) -> str:
    return re.sub(r"\s+", "", _normalize(value))


def _keyword_score(terms: list[str], parts: list[Any]) -> tuple[float, list[str]]:
    haystack = _normalize(" ".join(str(part or "") for part in parts))
    matched = []
    for term in terms:
        t = _normalize(term)
        if t and t in haystack and term not in matched:
            matched.append(term)
    if not matched:
        return 0.0, []
    return min(1.0, len(matched) / max(3, min(len(terms), 8))), matched


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
        self.graph_schema = self._load_json("LOC_GRAPH_SCHEMA.json")
        self.loc4 = self._load_json("LOC4_WRITING_REGISTRY.json")
        self.loc6 = self._load_json("LOC6_GOVERNANCE_REGISTRY.json")
        self.loc6_threads = self._load_json("LOC6_THREADS_KM_INDEX.json")
        self.loc6_period_keywords = self._load_json("LOC6_PERIOD_KEYWORD_ANALYSIS.json")
        self.loc3_period_keywords = self._load_json("LOC3_PERIOD_KEYWORD_ANALYSIS.json")
        self.loc6_thread_articles = self._load_repo_json("data/generated/loc6/LOC6_THREADS_ARTICLE_INDEX_v0.2.json")
        self.loc6_thread_manifest = self._load_repo_json("data/generated/loc6/threads/LOC6_THREADS_DOCUMENT_MANIFEST.json")
        self.loc6_thread_full = self._load_loc6_thread_shards()
        self.knowledge_assets = self._load_json("LOC_KNOWLEDGE_ASSET_REGISTRY.json")
        self.media = self._load_json("LOC_MEDIA_REGISTRY.json")
        self.lots = self._load_json("lots.json")
        self.loc8_relation_schema = self._load_json("LOC8_RELATION_SCHEMA.json")
        self.loc8_events = self._load_json("LOC8_EVENT_SNAPSHOT.json")
        self.loc8_daily_runes = self._load_json("LOC8_DAILY_RUNE_SNAPSHOT.json")

    def _load_json(self, name: str) -> dict[str, Any]:
        path = self.shared_root / name
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _load_repo_json(self, rel_path: str) -> dict[str, Any]:
        path = self.repo_root / rel_path
        if not path.exists():
            return {}
        try:
            if path.suffix.lower() == ".gz":
                with gzip.open(path, "rt", encoding="utf-8") as fh:
                    return json.load(fh)
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _load_loc6_thread_shards(self) -> dict[str, Any]:
        manifest = getattr(self, "loc6_thread_manifest", {}) or {}
        documents: list[dict[str, Any]] = []
        for shard in manifest.get("shards", []):
            path = shard.get("path")
            if not path:
                continue
            part = self._load_repo_json(path)
            documents.extend(part.get("documents", []))
        return {
            "documents": documents,
            "document_count": len(documents),
            "manifest": manifest,
        }

    def _loc6_article_documents(self) -> list[dict[str, Any]]:
        full_docs = (getattr(self, "loc6_thread_full", {}) or {}).get("documents", [])
        if full_docs:
            return full_docs
        return self.loc6_thread_articles.get("documents", []) or self.loc6_threads.get("documents", [])

    @staticmethod
    def _allowed(content_type: str, wanted: str) -> bool:
        return not wanted or wanted == "all" or content_type == wanted

    def _oracle_result(self, query: str) -> tuple[list[dict[str, Any]], list[str]]:
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
            return [], []

        name = rune.get("名稱") or rune.get("符文名稱")
        lots_item = next((item for item in self.lots.get("items", []) if item.get("名稱") == name), None)
        advice_by_category = (((lots_item or {}).get("方向") or {}).get(direction) or {})
        poem = advice_by_category.get(category)
        if not poem:
            return [], []

        direction_field = {
            "正位": "正向表示",
            "半正位": "半正向表示",
            "半逆位": "半逆向表示",
            "逆位": "逆向表示",
        }.get(direction)
        direction_text = rune.get(direction_field) if direction_field else None

        raw_terms = [
            name,
            direction,
            category,
            *advice_by_category.keys(),
            *advice_by_category.values(),
            rune.get("顯化形式"),
            rune.get("關鍵詞"),
            direction_text,
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
                "all_advice": advice_by_category,
                "direction_text": direction_text,
                "rune_moon": rune.get("月相") or rune.get("符文月相"),
                "manifestation": rune.get("顯化形式"),
                "keywords": rune.get("關鍵詞"),
                "extension_terms": extension_terms[:16],
                "display_order": ["lot", "all_advice", "direction_text", "extension_terms"],
            },
        }

        return [result], extension_terms[:20]

    def _knowledge_asset_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "knowledge", "knowledge_document", "knowledge_image"}:
            return []
        scored = []
        for asset in self.knowledge_assets.get("assets", []):
            if not asset.get("searchable"):
                continue
            if wanted == "knowledge_image" and asset.get("content_type") != "knowledge_image":
                continue
            rel_path = asset.get("path")
            content = ""
            if rel_path:
                path = self.repo_root / rel_path
                if path.exists() and path.suffix.lower() in {".md", ".txt", ".json", ".js"}:
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
            "content_type": asset.get("content_type") or "knowledge_document",
            "group": "knowledge",
            "title": asset.get("title"),
            "summary": asset.get("public_summary") or asset.get("notes") or asset.get("role") or "",
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

    def _music_keyword_results(
        self,
        terms: list[str],
        top_k: int,
        wanted: str,
        filters: dict[str, str],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        if not self.loc3_searcher or wanted not in {"", "all", "lyrics_work", "suno_song", "multimedia", "reel", "video"}:
            return [], []
        wants_music = wanted in {"", "all", "lyrics_work", "suno_song"}
        wants_media = wanted in {"", "all", "multimedia", "reel", "video"}
        scored = []
        for work in getattr(self.loc3_searcher, "works", []):
            if filters.get("period") and work.get("period") != filters["period"]:
                continue
            if filters.get("category") and (work.get("lyric_type") or work.get("category")) != filters["category"]:
                continue
            if filters.get("playlist") and work.get("playlist") != filters["playlist"]:
                continue
            score, matched = _keyword_score(terms, [
                work.get("title"),
                work.get("lyrics"),
                work.get("summary"),
                " ".join(work.get("tags", [])),
                " ".join(work.get("semantic_keywords", [])),
                " ".join(work.get("reasoning_tags", [])),
                " ".join(work.get("key_propositions", [])),
            ])
            if score <= 0:
                continue
            scored.append((score, matched, work))
        scored.sort(key=lambda row: (-row[0], str(row[2].get("work_id", ""))))

        music, media = [], []
        for score, matched, work in scored[:top_k]:
            versions = work.get("versions", [])
            recommended = versions[0] if versions else {}
            payload = dict(work)
            payload["matched_terms"] = matched
            payload["recommended_version"] = recommended
            payload["alternate_versions"] = versions[1:]
            payload["keyword_match_only"] = True
            if wants_music:
                music.append({
                    "result_id": work.get("work_id"),
                    "system_id": work.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC3",
                    "related_locs": work.get("related_locs", ["LOC5", "LOC6", "LOC7", "LOC8"]),
                    "content_type": "suno_song" if wanted == "suno_song" else "lyrics_work",
                    "group": "works",
                    "title": work.get("title"),
                    "summary": work.get("summary"),
                    "score": round(score, 6),
                    "era_id": work.get("era_id"),
                    "period": work.get("period"),
                    "source_refs": [],
                    "payload": payload,
                })
            media_id = recommended.get("media_id")
            media_url = recommended.get("ig_preview_url")
            if wants_media and media_id and media_url:
                media.append({
                    "result_id": media_id,
                    "system_id": work.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC5",
                    "related_locs": ["LOC3"],
                    "content_type": "multimedia",
                    "group": "media",
                    "title": f"{work.get('title', '')} · Reel",
                    "summary": work.get("summary"),
                    "score": round(score, 6),
                    "source_refs": recommended.get("media_source_refs", []),
                    "payload": {"url": media_url, "matched_terms": matched, "linked_work_id": work.get("work_id")},
                })
        return music, media

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

    def _keyword_cross_results(self, terms: list[str], top_k: int, wanted: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        textworks, media_results, knowledge, eras = [], [], [], []

        if wanted in {"", "all", "text_work", "article"}:
            scored = []
            for work in self.loc4.get("works", []):
                score, matched = _keyword_score(terms, [work.get("title"), work.get("summary"), " ".join(work.get("tags", []))])
                if score > 0:
                    scored.append((score, matched, work))
            for score, matched, work in sorted(scored, key=lambda r: (-r[0], str(r[2].get("work_id",""))))[:top_k]:
                payload = dict(work); payload["matched_terms"] = matched; payload["keyword_match_only"] = True
                textworks.append({"result_id":work.get("work_id"),"system_id":work.get("system_id") or "lo3rwang","primary_loc":"LOC4","related_locs":work.get("related_locs",[]),"content_type":"text_work","group":"textworks","title":work.get("title"),"summary":work.get("summary"),"score":round(score,6),"source_refs":work.get("source_refs",[]),"payload":payload})

        if wanted in {"", "all", "multimedia", "reel", "video"}:
            scored = []
            for item in self.media.get("items", []):
                semantic = item.get("semantic_descriptor") or {}
                score, matched = _keyword_score(terms, [item.get("title"),item.get("purpose"),semantic.get("visual_summary")," ".join(semantic.get("scene_keywords",[]))," ".join(semantic.get("manual_tags",[]))])
                if score > 0:
                    scored.append((score, matched, item))
            for score, matched, item in sorted(scored, key=lambda r: (-r[0], str(r[2].get("media_id",""))))[:top_k]:
                payload=dict(item);payload["matched_terms"]=matched;payload["keyword_match_only"]=True
                media_results.append({"result_id":item.get("media_id"),"system_id":item.get("system_id") or "lo3rwang","primary_loc":"LOC5","related_locs":item.get("related_locs",[]),"content_type":"multimedia","group":"media","title":item.get("title"),"summary":(item.get("semantic_descriptor") or {}).get("visual_summary") or item.get("purpose") or "","score":round(score,6),"source_refs":item.get("source_refs",[]),"payload":payload})

        if wanted in {"", "all", "knowledge", "knowledge_document", "knowledge_image"}:
            scored = []
            for asset in self.knowledge_assets.get("assets", []):
                if not asset.get("searchable"): continue
                content=""
                rel_path=asset.get("path")
                if rel_path:
                    p=self.repo_root/rel_path
                    if p.exists() and p.suffix.lower() in {".md",".txt"}:
                        try: content=p.read_text(encoding="utf-8")
                        except Exception: content=""
                score, matched = _keyword_score(terms,[asset.get("title"),asset.get("role")," ".join(asset.get("keywords",[])),asset.get("notes"),content])
                if score > 0: scored.append((score,matched,asset))
            for score, matched, asset in sorted(scored,key=lambda r:(-r[0],str(r[2].get("asset_id",""))))[:top_k]:
                payload=dict(asset);payload["matched_terms"]=matched;payload["keyword_match_only"]=True
                knowledge.append({"result_id":asset.get("asset_id"),"system_id":"lo3rwang","primary_loc":asset.get("primary_loc") or "LOC7","related_locs":asset.get("related_locs",[]),"content_type":asset.get("content_type") or "knowledge_document","group":"knowledge","title":asset.get("title"),"summary":asset.get("notes") or asset.get("role") or "","score":round(score,6),"source_refs":[{"source_type":asset.get("source_type"),"source_id":asset.get("path"),"note":asset.get("authority_level")}],"payload":payload})

        if wanted in {"", "all", "era"}:
            scored=[]
            for era in self.eras.get("eras",[]):
                score, matched=_keyword_score(terms,[era.get("period"),era.get("name"),era.get("display_label"),era.get("description"),era.get("state_before"),era.get("state_after")])
                if score>0: scored.append((score,matched,era))
            for score,matched,era in sorted(scored,key=lambda r:(-r[0],r[2].get("order",999)))[:top_k]:
                payload=dict(era);payload["matched_terms"]=matched;payload["keyword_match_only"]=True
                eras.append({"result_id":era.get("era_id"),"system_id":self.eras.get("language_system_id") or "lo3rwang","primary_loc":"LOC8","related_locs":["LOC3","LOC4","LOC5","LOC6","LOC7"],"content_type":"era","group":"timeline","title":era.get("display_label") or era.get("name"),"summary":era.get("description") or era.get("state_after"),"score":round(score,6),"era_id":era.get("era_id"),"period":era.get("period"),"source_refs":[],"payload":payload})
        return textworks, media_results, knowledge, eras

    def _loc6_article_results(self, query: str, top_k: int, wanted: str, filters: dict[str, str] | None = None) -> list[dict[str, Any]]:
        filters = filters or {}
        if wanted not in {"", "all", "governance_article"}:
            return []

        scored: list[tuple[float, dict[str, Any], str]] = []
        query_terms = [
            term for term in re.split(r"[\s、，,；;：:／/｜|]+", _normalize(query))
            if term
        ]

        # Maintained LOC6 article assets.
        for asset in self.knowledge_assets.get("assets", []):
            if asset.get("primary_loc") != "LOC6" or asset.get("content_type") != "governance_article":
                continue
            if not asset.get("searchable"):
                continue
            content = ""
            rel_path = asset.get("path")
            if rel_path:
                p = self.repo_root / rel_path
                if p.exists() and p.suffix.lower() in {".md", ".txt"}:
                    try:
                        content = p.read_text(encoding="utf-8")
                    except Exception:
                        content = ""
            score = _text_score(query, [
                asset.get("title"),
                asset.get("role"),
                " ".join(asset.get("keywords", [])),
                asset.get("notes"),
                content,
            ])
            if score >= 0.34:
                row = dict(asset)
                row["_content"] = content
                scored.append((score, row, "asset"))

        # Search the full LOC6 Threads main-post corpus when shards are available.
        # Falls back to the smaller article tranche only when full shards are absent.
        article_docs = self._loc6_article_documents()
        for doc in article_docs:
            if filters.get("period") and doc.get("era") != filters["period"]:
                continue
            text = str(doc.get("text") or "")
            if doc.get("source_role") != "main_post" or len(text) < 120:
                continue
            score = _text_score(query, [
                text,
                " ".join(doc.get("matched_terms", [])),
                doc.get("era"),
            ])
            if score >= 0.34:
                scored.append((score * 0.96, doc, "threads"))

        scored.sort(key=lambda row: (-row[0], str(row[1].get("date") or row[1].get("asset_id") or "")))
        out = []
        for score, item, source_kind in scored[:top_k]:
            if source_kind == "asset":
                out.append({
                    "result_id": item.get("asset_id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": item.get("related_locs", ["LOC7", "LOC8"]),
                    "content_type": "governance_article",
                    "group": "loc6_articles",
                    "title": item.get("title"),
                    "summary": item.get("public_summary") or item.get("notes") or item.get("role") or "",
                    "score": round(score, 6),
                    "source_refs": [{"source_type": item.get("source_type"), "source_id": item.get("path"), "note": item.get("authority_level")}],
                    "payload": item,
                })
            else:
                text = str(item.get("text") or "")
                headline = re.split(r"[。！？!?\n]", text, maxsplit=1)[0].strip()
                if len(headline) > 34:
                    headline = headline[:34] + "…"
                matched_terms = list(dict.fromkeys([
                    *item.get("matched_terms", []),
                    *[term for term in query_terms if term in _normalize(text)],
                ]))[:12]
                payload = {
                    **item,
                    "matched_terms": matched_terms,
                    "km_source": "LOC6_THREADS_FULL_CORPUS",
                    "evidence_role": "primary",
                }
                out.append({
                    "result_id": item.get("id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": ["LOC7", "LOC8"],
                    "content_type": "governance_article",
                    "group": "loc6_articles",
                    "title": f"Threads｜{item.get('date') or 'undated'}｜{item.get('era') or 'ERA'}" + (f"｜{headline}" if headline else ""),
                    "summary": text,
                    "score": round(score, 6),
                    "era_id": f"ERA-{item.get('era')}" if item.get("era") else None,
                    "period": item.get("era"),
                    "source_refs": [{"source_type": "threads", "source_id": item.get("source_id"), "note": "primary main-post evidence"}],
                    "payload": payload,
                })
        return out

    def _governance_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "governance_fragment"}:
            return []

        results: list[dict[str, Any]] = []

        # Governed LOC6 fragments.
        scored = []
        for fragment in self.loc6.get("fragments", []):
            score = _text_score(query, [
                fragment.get("topic"),
                fragment.get("statement"),
                fragment.get("interpretation"),
                fragment.get("governance_principle"),
                " ".join(fragment.get("style_features", [])),
                fragment.get("analysis_type"),
            ])
            if score < 0.34:
                continue
            scored.append((score, fragment))
        scored.sort(key=lambda row: (-row[0], str(row[1].get("fragment_id", ""))))
        for score, fragment in scored[:top_k]:
            results.append({
                "result_id": fragment.get("fragment_id"),
                "system_id": fragment.get("system_id") or "lo3rwang",
                "primary_loc": "LOC6",
                "related_locs": fragment.get("related_locs", ["LOC3", "LOC4", "LOC7", "LOC8"]),
                "content_type": "governance_fragment",
                "group": "governance",
                "title": fragment.get("statement") or fragment.get("topic") or fragment.get("fragment_id"),
                "summary": fragment.get("interpretation") or fragment.get("governance_principle") or "",
                "score": round(score, 6),
                "era_id": fragment.get("era_id"),
                "source_refs": fragment.get("source_refs", []),
                "payload": fragment,
            })

        # Threads evidence tranche. Main posts are primary evidence; replies are
        # searchable supplemental evidence and receive a small ranking penalty.
        thread_scored = []
        for doc in self.loc6_threads.get("documents", []):
            score = _text_score(query, [
                doc.get("text"),
                " ".join(doc.get("matched_terms", [])),
                doc.get("era"),
                doc.get("source_role"),
            ])
            if score < 0.34:
                continue
            if doc.get("source_role") == "reply":
                score *= 0.88
            thread_scored.append((score, doc))
        thread_scored.sort(key=lambda row: (-row[0], str(row[1].get("date", "")), str(row[1].get("id", ""))))

        for score, doc in thread_scored[:top_k]:
            role = doc.get("source_role") or "main_post"
            results.append({
                "result_id": doc.get("id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC6",
                "related_locs": ["LOC7", "LOC8"],
                "content_type": "governance_fragment",
                "group": "governance",
                "title": f"Threads · {doc.get('date') or 'undated'} · {doc.get('era') or 'ERA'}",
                "summary": doc.get("text") or "",
                "score": round(score, 6),
                "era_id": f"ERA-{doc.get('era')}" if doc.get("era") else None,
                "period": doc.get("era"),
                "source_refs": [{
                    "source_type": "threads",
                    "source_id": doc.get("source_id"),
                    "note": "primary main post" if role == "main_post" else "supplemental reply evidence",
                }],
                "payload": {
                    **doc,
                    "km_source": "LOC6_THREADS_KM_INDEX",
                    "evidence_role": "primary" if role == "main_post" else "supplemental",
                },
            })

        # Keyword statistics are also searchable KM evidence. They expose the
        # P0-P8 document-frequency distribution without claiming semantic Canon.
        q = _compact(query)
        for stat in self.loc6_threads.get("term_stats", []):
            term = str(stat.get("term") or "")
            if not term or (_compact(term) not in q and q not in _compact(term)):
                continue
            results.append({
                "result_id": f"THR-TERM-{term}",
                "system_id": "lo3rwang",
                "primary_loc": "LOC6",
                "related_locs": ["LOC7", "LOC8"],
                "content_type": "governance_fragment",
                "group": "governance",
                "title": f"Threads 關鍵字 · {term}",
                "summary": f"主貼文 DF {stat.get('main_df', 0)}；Reply DF {stat.get('reply_df', 0)}。可用 ERA distribution 觀察時間變化。",
                "score": 1.0,
                "source_refs": [{
                    "source_type": "threads",
                    "source_id": self.loc6_threads.get("source"),
                    "note": "corpus-derived document frequency; not Canon",
                }],
                "payload": {
                    **stat,
                    "km_source": "LOC6_THREADS_KM_INDEX",
                    "evidence_role": "statistical",
                },
            })

        results.sort(key=lambda item: (-float(item.get("score") or 0), str(item.get("result_id") or "")))
        return results[:top_k]

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

    def browse(
        self,
        content_type: str,
        offset: int = 0,
        limit: int = 24,
        filters: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Browse corpus records without requiring a semantic query.

        This is a catalog/list view, not a ranking view. It preserves full text
        when the current authority source already contains it.
        """
        filters = filters or {}
        wanted = (content_type or "").strip().lower()
        offset = max(0, int(offset or 0))
        limit = max(1, min(int(limit or 24), 100))
        items: list[dict[str, Any]] = []

        if wanted == "lyrics_work":
            for work in getattr(self.loc3_searcher, "works", []) if self.loc3_searcher else []:
                if filters.get("period") and work.get("period") != filters["period"]:
                    continue
                payload = dict(work)
                versions = work.get("versions", [])
                payload["recommended_version"] = versions[0] if versions else {}
                payload["alternate_versions"] = versions[1:] if len(versions) > 1 else []
                items.append({
                    "result_id": work.get("work_id"),
                    "system_id": work.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC3",
                    "related_locs": work.get("related_locs", ["LOC5", "LOC6", "LOC7", "LOC8"]),
                    "content_type": "lyrics_work",
                    "group": "works",
                    "title": work.get("title"),
                    "summary": work.get("summary"),
                    "period": work.get("period"),
                    "era_id": work.get("era_id"),
                    "source_refs": work.get("source_refs", []),
                    "payload": payload,
                })

        elif wanted == "text_work":
            for work in self.loc4.get("works", []):
                if filters.get("period") and work.get("period") != filters["period"]:
                    continue
                items.append({
                    "result_id": work.get("work_id"),
                    "system_id": work.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": work.get("related_locs", []),
                    "content_type": "text_work",
                    "group": "textworks",
                    "title": work.get("title"),
                    "summary": work.get("summary"),
                    "period": work.get("period"),
                    "era_id": work.get("era_id"),
                    "source_refs": work.get("source_refs", []),
                    "payload": work,
                })

        elif wanted == "governance_article":
            for doc in self._loc6_article_documents():
                if doc.get("source_role") != "main_post":
                    continue
                if filters.get("period") and doc.get("era") != filters["period"]:
                    continue
                full_text = str(doc.get("text") or "")
                preview = full_text[:360] + ("…" if len(full_text) > 360 else "")
                public_payload = {k: v for k, v in doc.items() if k != "text"}
                public_payload.update({
                    "km_source": "LOC6_THREADS_FULL_CORPUS",
                    "evidence_role": "primary",
                    "full_text_available": True,
                    "public_browse_mode": "preview_only",
                    "char_count": doc.get("char_count") or len(full_text),
                })
                items.append({
                    "result_id": doc.get("id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": ["LOC7", "LOC8"],
                    "content_type": "governance_article",
                    "group": "loc6_articles",
                    "title": (
                        f"Threads｜{doc.get('date') or 'undated'}｜{doc.get('era') or 'ERA'}｜"
                        + ((re.split(r"[。！？!?\n]", full_text, maxsplit=1)[0].strip()[:34] + "…")
                           if len(re.split(r"[。！？!?\n]", full_text, maxsplit=1)[0].strip()) > 34
                           else re.split(r"[。！？!?\n]", full_text, maxsplit=1)[0].strip())
                    ),
                    "summary": preview,
                    "period": doc.get("era"),
                    "era_id": f"ERA-{doc.get('era')}" if doc.get("era") else None,
                    "source_refs": [{"source_type": "threads", "source_id": doc.get("source_id"), "note": "primary main-post evidence"}],
                    "payload": public_payload,
                })
            items.sort(key=lambda r: (str((r.get("payload") or {}).get("date") or ""), str(r.get("result_id") or "")), reverse=True)

        elif wanted == "governance_fragment":
            for fragment in self.loc6.get("fragments", []):
                if filters.get("period") and fragment.get("period") != filters["period"] and fragment.get("era") != filters["period"]:
                    continue
                items.append({
                    "result_id": fragment.get("fragment_id"),
                    "system_id": fragment.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": fragment.get("related_locs", ["LOC3", "LOC4", "LOC7", "LOC8"]),
                    "content_type": "governance_fragment",
                    "group": "governance",
                    "title": fragment.get("statement") or fragment.get("topic") or fragment.get("fragment_id"),
                    "summary": fragment.get("interpretation") or fragment.get("governance_principle") or "",
                    "era_id": fragment.get("era_id"),
                    "source_refs": fragment.get("source_refs", []),
                    "payload": fragment,
                })

        else:
            raise ValueError("browse目前支援 lyrics_work、text_work、governance_article、governance_fragment")

        total = len(items)
        page = items[offset:offset + limit]
        return {
            "system_id": "lo3rwang",
            "content_type": wanted,
            "mode": "browse",
            "offset": offset,
            "limit": limit,
            "total_count": total,
            "has_more": offset + limit < total,
            "items": page,
        }


    @staticmethod
    def _result_source_platform(item: dict[str, Any]) -> str:
        payload = item.get("payload") or {}
        refs = item.get("source_refs") or []
        ref_text = []
        for ref in refs:
            if isinstance(ref, dict):
                ref_text.append(str(ref.get("source_type") or "") + " " + str(ref.get("source_id") or ""))
            elif ref:
                ref_text.append(str(ref))
        haystack = " ".join([
            str(item.get("primary_loc") or ""),
            str(item.get("content_type") or ""),
            str(payload.get("source_platform") or ""),
            str(payload.get("km_source") or ""),
            str(payload.get("url") or ""),
            str(payload.get("ig_preview_url") or ""),
            " ".join(ref_text),
        ]).lower()
        if "threads" in haystack:
            return "threads"
        if "facebook" in haystack or "fb.com" in haystack:
            return "facebook"
        if "instagram" in haystack or "instagram_reel" in haystack or "ig_preview" in haystack:
            return "instagram"
        if item.get("primary_loc") == "LOC3" or "suno" in haystack:
            return "suno"
        return ""

    @staticmethod
    def _result_date(item: dict[str, Any]) -> str:
        payload = item.get("payload") or {}
        for key in ("date", "created_date", "creation_date", "published_date", "created_at"):
            value = payload.get(key) or item.get(key)
            if value:
                return str(value)[:10]
        return ""

    def _apply_common_filters(self, groups: dict[str, list[dict[str, Any]]], filters: dict[str, str]) -> dict[str, list[dict[str, Any]]]:
        source = str(filters.get("source") or "").strip().lower()
        start_date = str(filters.get("start_date") or "").strip()
        end_date = str(filters.get("end_date") or "").strip()
        if not source and not start_date and not end_date:
            return groups

        filtered: dict[str, list[dict[str, Any]]] = {}
        for group, items in groups.items():
            keep = []
            for item in items:
                if source and self._result_source_platform(item) != source:
                    continue
                if start_date or end_date:
                    date = self._result_date(item)
                    if not date:
                        continue
                    if start_date and date < start_date:
                        continue
                    if end_date and date > end_date:
                        continue
                keep.append(item)
            filtered[group] = keep
        return filtered


    def _canonical_graph(self) -> dict[str, Any]:
        """Build the governed cross-LOC graph from authoritative registries.

        The graph is a reference layer. It does not copy or replace canonical
        records; it only stores stable node references and evidence-backed edges.
        """
        nodes: dict[str, dict[str, Any]] = {}
        edges: dict[str, dict[str, Any]] = {}

        def add_node(node_id: Any, label: Any, node_type: str, primary_loc: str = "", **extra: Any) -> None:
            nid = str(node_id or "").strip()
            if not nid:
                return
            current = nodes.get(nid, {})
            nodes[nid] = {
                **current,
                "id": nid,
                "label": str(label or current.get("label") or nid),
                "node_type": node_type or current.get("node_type") or "record",
                "primary_loc": primary_loc or current.get("primary_loc") or "",
                **{k: v for k, v in extra.items() if v not in (None, "", [], {})},
            }

        def add_edge(
            edge_id: Any,
            source: Any,
            target: Any,
            relation_type: str,
            evidence_kind: str,
            summary: str = "",
            evidence_status: str = "recorded",
            **extra: Any,
        ) -> None:
            sid, tid = str(source or "").strip(), str(target or "").strip()
            eid = str(edge_id or "").strip()
            if not eid or not sid or not tid:
                return
            edges[eid] = {
                "edge_id": eid,
                "source": sid,
                "target": tid,
                "relation_type": relation_type,
                "summary": summary,
                "evidence_kind": evidence_kind,
                "evidence_status": evidence_status,
                **{k: v for k, v in extra.items() if v not in (None, "", [], {})},
            }

        # LOC domains are stable graph anchors.
        for n in range(1, 9):
            loc = f"LOC{n}"
            add_node(loc, loc, "loc_domain", loc)

        # Canonical rune nodes provide a stable LOC1 anchor for LOC8 daily-rune
        # observations and other cross-LOC references.
        for index, rune in enumerate(self.runes, start=1):
            number = rune.get("編號") or index
            name = rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or f"Rune {number}"
            rune_id = f"RUNE-{number}"
            add_node(
                rune_id,
                f"{number} · {name}",
                "rune",
                "LOC1",
                rune_number=number,
                rune_name=name,
            )
            add_edge(
                f"EDGE-{rune_id}-OWNED-LOC1",
                rune_id,
                "LOC1",
                "owned_by_loc",
                "authority_registry",
                f"{rune_id} is governed by LOC1.",
            )

        # ERA is the governed temporal backbone.
        eras = sorted(self.eras.get("eras", []), key=lambda x: float(x.get("order") or 0))
        for era in eras:
            era_id = era.get("era_id")
            add_node(
                era_id,
                era.get("display_label") or era.get("name") or era_id,
                "era",
                "LOC8",
                period=era.get("period"),
                start_date=era.get("start_date"),
                end_date=era.get("end_date"),
            )
            add_edge(
                f"EDGE-{era_id}-OWNED",
                era_id,
                "LOC8",
                "owned_by_loc",
                "authority_registry",
                "ERA temporal authority is LOC8.",
            )
        for left, right in zip(eras, eras[1:]):
            add_edge(
                f"EDGE-{left.get('era_id')}-{right.get('era_id')}-TEMPORAL",
                left.get("era_id"),
                right.get("era_id"),
                "temporal_before",
                "deterministic_structural_evidence",
                f"{left.get('period')} precedes {right.get('period')} on the governed ERA axis.",
            )

        # LOC8 event snapshot is an explicitly non-authoritative public fallback,
        # so it may participate in retrieval/provenance without replacing the
        # live Google Sheet. Only records already committed to the repository
        # are exposed through the public Search graph.
        era_by_period = {
            str(era.get("period") or ""): str(era.get("era_id") or "")
            for era in eras
            if era.get("period") and era.get("era_id")
        }
        era_by_label = {
            _compact(era.get("display_label") or era.get("name") or ""): str(era.get("era_id") or "")
            for era in eras
            if era.get("era_id")
        }

        for event in self.loc8_events.get("events", []):
            eid = event.get("id")
            if not eid:
                continue
            add_node(
                eid,
                event.get("title") or eid,
                "life_event",
                "LOC8",
                date=event.get("date"),
                event_type=event.get("event_type"),
                object_type=event.get("object_type"),
                object_id=event.get("object_id"),
                confidence=event.get("confidence"),
                snapshot_role=self.loc8_events.get("role"),
            )
            add_edge(
                f"EDGE-{eid}-OWNED-LOC8",
                eid,
                "LOC8",
                "owned_by_loc",
                "loc8_event_snapshot",
                "LOC8 event snapshot record.",
                event.get("confidence") or "recorded",
                source_ref=event.get("source"),
            )
            event_era = str(event.get("era_id") or "").strip()
            if not event_era:
                raw_era = str(event.get("era") or "").strip()
                period_match = re.search(r"\b(P\d+(?:\.\d+)?)\b", raw_era, re.I)
                if period_match:
                    event_era = era_by_period.get(period_match.group(1).upper(), "")
                if not event_era:
                    event_era = era_by_label.get(_compact(raw_era), "")
            if event_era:
                add_edge(
                    f"EDGE-{eid}-ERA-{event_era}",
                    eid,
                    event_era,
                    "belongs_to_era",
                    "loc8_event_snapshot",
                    f"{eid} is recorded in {event_era}.",
                    event.get("confidence") or "recorded",
                )

        # Daily Rune is a LOC8 observation of a LOC1 rune in time. This is the
        # smallest concrete cross-LOC temporal bridge in the current system.
        for draw in self.loc8_daily_runes.get("daily_draws", []):
            did = draw.get("id")
            if not did:
                continue
            add_node(
                did,
                f"{draw.get('date') or ''} · {draw.get('rune') or ''}{draw.get('direction') or ''}",
                "daily_rune_draw",
                "LOC8",
                date=draw.get("date"),
                draw_kind=draw.get("draw_kind"),
                confidence=draw.get("confidence"),
                snapshot_role=self.loc8_daily_runes.get("role"),
            )
            add_edge(
                f"EDGE-{did}-OWNED-LOC8",
                did,
                "LOC8",
                "owned_by_loc",
                "loc8_daily_rune_snapshot",
                "LOC8 daily-rune observation.",
                draw.get("confidence") or "recorded",
                source_ref=draw.get("source"),
            )
            rune_number = str(draw.get("rune_id") or "").strip()
            if rune_number:
                add_edge(
                    f"EDGE-{did}-RUNE-{rune_number}",
                    did,
                    f"RUNE-{rune_number}",
                    "references",
                    "loc8_daily_rune_snapshot",
                    f"{did} records a draw of rune {draw.get('rune') or rune_number}.",
                    draw.get("confidence") or "recorded",
                )
            draw_era = str(draw.get("era_id") or "").strip()
            if draw_era:
                add_edge(
                    f"EDGE-{did}-ERA-{draw_era}",
                    did,
                    draw_era,
                    "belongs_to_era",
                    "loc8_daily_rune_snapshot",
                    f"{did} is recorded in {draw_era}.",
                    draw.get("confidence") or "recorded",
                )

        # Searchable KM assets form governed analysis/document nodes.
        for asset in self.knowledge_assets.get("assets", []):
            aid = asset.get("asset_id")
            if not aid:
                continue
            primary = asset.get("primary_loc") or "LOC7"
            add_node(
                aid,
                asset.get("title") or aid,
                "knowledge_asset",
                primary,
                content_type=asset.get("content_type"),
                role=asset.get("role"),
            )
            add_edge(
                f"EDGE-{aid}-OWNED-{primary}",
                aid,
                primary,
                "owned_by_loc",
                "registry_structure",
                f"{aid} is governed by {primary}.",
            )
            for related in asset.get("related_locs", []) or []:
                if related and related != primary:
                    add_edge(
                        f"EDGE-{aid}-RELATED-{related}",
                        aid,
                        related,
                        "related_to",
                        "registry_structure",
                        f"{aid} declares {related} as a related LOC.",
                    )

        # LOC3 works: work ownership and ERA placement are recorded metadata.
        for work in getattr(self.loc3_searcher, "works", []) if self.loc3_searcher else []:
            wid = work.get("work_id")
            if not wid:
                continue
            add_node(
                wid,
                work.get("title") or wid,
                "music_work",
                "LOC3",
                period=work.get("period"),
                era_id=work.get("era_id"),
            )
            add_edge(
                f"EDGE-{wid}-OWNED-LOC3",
                wid,
                "LOC3",
                "owned_by_loc",
                "record_metadata",
                f"{wid} is a LOC3 work.",
            )
            era_id = work.get("era_id")
            if era_id:
                add_edge(
                    f"EDGE-{wid}-ERA-{era_id}",
                    wid,
                    era_id,
                    "belongs_to_era",
                    "record_metadata",
                    f"{wid} is assigned to {work.get('period') or era_id}.",
                )

        # LOC4 works: writing catalog already carries canonical work/ERA fields.
        for work in self.loc4.get("works", []):
            wid = work.get("work_id")
            if not wid:
                continue
            add_node(
                wid,
                work.get("title") or wid,
                "writing_work",
                "LOC4",
                period=work.get("period"),
                era_id=work.get("era_id"),
            )
            add_edge(
                f"EDGE-{wid}-OWNED-LOC4",
                wid,
                "LOC4",
                "owned_by_loc",
                "record_metadata",
                f"{wid} is a LOC4 work.",
            )
            if work.get("era_id"):
                add_edge(
                    f"EDGE-{wid}-ERA-{work.get('era_id')}",
                    wid,
                    work.get("era_id"),
                    "belongs_to_era",
                    "record_metadata",
                    f"{wid} is assigned to {work.get('period') or work.get('era_id')}.",
                )

        # LOC5 media: registry gives stable media IDs, period inheritance and
        # optional linked work/song references.
        for media in self.media.get("items", []):
            mid = media.get("media_id")
            if not mid:
                continue
            add_node(
                mid,
                media.get("title") or mid,
                "media",
                "LOC5",
                period=media.get("period"),
                era_id=media.get("era_id"),
                platform=media.get("platform"),
            )
            add_edge(
                f"EDGE-{mid}-OWNED-LOC5",
                mid,
                "LOC5",
                "owned_by_loc",
                "record_metadata",
                f"{mid} is a LOC5 media record.",
            )
            if media.get("era_id"):
                add_edge(
                    f"EDGE-{mid}-ERA-{media.get('era_id')}",
                    mid,
                    media.get("era_id"),
                    "belongs_to_era",
                    "record_metadata",
                    f"{mid} inherits {media.get('period') or media.get('era_id')}.",
                )
            linked_work = media.get("linked_work_id") or (media.get("temporal_inheritance") or {}).get("source_work_id")
            if linked_work:
                add_edge(
                    f"EDGE-{mid}-WORK-{linked_work}",
                    linked_work,
                    mid,
                    "represented_by",
                    "record_metadata",
                    "LOC5 media represents or adapts the linked work.",
                )

        # LOC6 governance fragments are first-class analysis/governance nodes.
        for fragment in self.loc6.get("fragments", []):
            fid = fragment.get("fragment_id")
            if not fid:
                continue
            label = fragment.get("statement") or fragment.get("topic") or fid
            add_node(
                fid,
                label,
                "governance_fragment",
                "LOC6",
                analysis_type=fragment.get("analysis_type"),
                era_id=fragment.get("era_id"),
            )
            add_edge(
                f"EDGE-{fid}-OWNED-LOC6",
                fid,
                "LOC6",
                "owned_by_loc",
                "record_metadata",
                f"{fid} is governed by LOC6.",
            )
            if fragment.get("era_id"):
                add_edge(
                    f"EDGE-{fid}-ERA-{fragment.get('era_id')}",
                    fid,
                    fragment.get("era_id"),
                    "belongs_to_era",
                    "record_metadata",
                    "Governance fragment carries an explicit ERA assignment.",
                )

        # Explicit author-confirmed cross-work relationships.
        for rel in self.relationships.get("relationships", []):
            source = rel.get("source") or {}
            source_id = source.get("work_ref") or rel.get("relationship_id")
            add_node(
                source_id,
                source.get("title") or rel.get("canonical_key") or source_id,
                source.get("content_type") or "work",
                source.get("primary_loc") or "",
            )
            for target in rel.get("targets", []) or []:
                target_id = target.get("work_ref")
                if not target_id:
                    continue
                add_node(
                    target_id,
                    target.get("title") or target_id,
                    target.get("content_type") or "work",
                    target.get("primary_loc") or "",
                )
                add_edge(
                    f"EDGE-{rel.get('relationship_id')}-{source_id}-{target_id}",
                    source_id,
                    target_id,
                    rel.get("relation_type") or "related_to",
                    "explicit_registry_relation",
                    rel.get("relation_summary") or target.get("relation_label") or "",
                    rel.get("evidence_status") or "registry",
                    relationship_id=rel.get("relationship_id"),
                    direction=rel.get("direction"),
                )

        return {
            "schema_version": self.graph_schema.get("schema_version") or "0.2",
            "nodes": list(nodes.values()),
            "edges": list(edges.values()),
            "node_count": len(nodes),
            "edge_count": len(edges),
        }

    @staticmethod
    def _result_graph_aliases(item: dict[str, Any]) -> set[str]:
        aliases: set[str] = set()
        for value in [
            item.get("result_id"),
            item.get("title"),
            item.get("era_id"),
            item.get("period"),
        ]:
            if value:
                aliases.add(_compact(value))
        payload = item.get("payload") or {}
        for key in ("work_id", "media_id", "asset_id", "source_id", "canonical_key", "era_id", "period"):
            value = payload.get(key)
            if value:
                aliases.add(_compact(value))
        return {x for x in aliases if x}

    def _graph_enrichment(
        self,
        query: str,
        groups: dict[str, list[dict[str, Any]]],
        depth: int = 2,
        limit: int = 40,
    ) -> dict[str, Any]:
        """Seed the canonical graph from retrieval results, then traverse it.

        Retrieval similarity chooses seeds only. Every traversed edge must
        already be registry-backed or deterministic structural evidence.
        """
        base = self._canonical_graph()
        nodes = {str(node.get("id")): dict(node) for node in base.get("nodes", []) if node.get("id")}
        edges = [dict(edge) for edge in base.get("edges", [])]

        result_by_id: dict[str, dict[str, Any]] = {}
        alias_to_result_ids: dict[str, set[str]] = {}
        seed_ids: set[str] = set()
        matched_periods: set[str] = set()

        # Add current retrieval results as transient graph nodes with only
        # deterministic ownership / ERA / media-work edges.
        for group, items in groups.items():
            for item in items:
                rid = str(item.get("result_id") or "").strip()
                if not rid:
                    continue
                result_by_id[rid] = item
                aliases = self._result_graph_aliases(item)
                for alias in aliases:
                    alias_to_result_ids.setdefault(alias, set()).add(rid)

                nodes.setdefault(rid, {
                    "id": rid,
                    "label": item.get("title") or rid,
                    "node_type": item.get("content_type") or "search_result",
                    "primary_loc": item.get("primary_loc") or "",
                    "result_group": group,
                    "transient": True,
                })

                loc = str(item.get("primary_loc") or "").strip()
                if loc:
                    edges.append({
                        "edge_id": f"SEARCH-{rid}-OWNED-{loc}",
                        "source": rid,
                        "target": loc,
                        "relation_type": "owned_by_loc",
                        "summary": f"Search result belongs to {loc}.",
                        "evidence_kind": "result_metadata",
                        "evidence_status": "recorded",
                    })

                era_id = str(item.get("era_id") or (item.get("payload") or {}).get("era_id") or "").strip()
                period = str(item.get("period") or (item.get("payload") or {}).get("period") or "").strip()
                if not era_id and period:
                    era = next((x for x in self.eras.get("eras", []) if str(x.get("period")) == period), None)
                    era_id = str((era or {}).get("era_id") or "")
                if era_id:
                    matched_periods.add(period or era_id.replace("ERA-", ""))
                    edges.append({
                        "edge_id": f"SEARCH-{rid}-ERA-{era_id}",
                        "source": rid,
                        "target": era_id,
                        "relation_type": "belongs_to_era",
                        "summary": f"Search result is recorded in {period or era_id}.",
                        "evidence_kind": "result_metadata",
                        "evidence_status": "recorded",
                    })

                payload = item.get("payload") or {}
                linked_work = str(payload.get("linked_work_id") or "").strip()
                if linked_work:
                    edges.append({
                        "edge_id": f"SEARCH-{rid}-REPRESENTS-{linked_work}",
                        "source": rid,
                        "target": linked_work,
                        "relation_type": "represented_by" if item.get("primary_loc") != "LOC5" else "adapted_to",
                        "summary": "Media/work linkage supplied by registry metadata.",
                        "evidence_kind": "result_metadata",
                        "evidence_status": "recorded",
                    })

        # Seed selection is precision-first. When the query has a strong
        # canonical/exact hit, do not let every low-relevance retrieval result
        # become a graph seed; that causes unrelated LOC/ERA over-traversal.
        q = _compact(query)
        strong_seed_ids: set[str] = set()

        for rid, item in result_by_id.items():
            aliases = self._result_graph_aliases(item)
            title = _compact(item.get("title") or "")
            if q and (
                q in aliases
                or title == q
                or (len(q) >= 3 and title.startswith(q))
            ):
                strong_seed_ids.add(rid)

        for node_id, node in nodes.items():
            label = _compact(node.get("label") or "")
            period = _compact(node.get("period") or "")
            node_type = str(node.get("node_type") or "")
            strong = False
            if q:
                if _compact(node.get("id") or "") == q or period == q or label == q:
                    strong = True
                elif node_type in {"life_event", "era", "rune", "work"} and len(q) >= 2:
                    strong = label.startswith(q) or (len(q) >= 3 and q in label)
            if strong:
                strong_seed_ids.add(node_id)

        if strong_seed_ids:
            seed_ids.update(strong_seed_ids)
        else:
            # Broad semantic/concept queries may not have a canonical exact hit.
            # In that case, fall back to retrieval results as seeds.
            seed_ids.update(result_by_id.keys())

        # Preserve direct query aliases even in broad mode.
        for rid, item in result_by_id.items():
            if q and any(q == alias for alias in self._result_graph_aliases(item)):
                seed_ids.add(rid)

        adjacency: dict[str, list[dict[str, Any]]] = {}
        for edge in edges:
            source, target = str(edge.get("source") or ""), str(edge.get("target") or "")
            if not source or not target:
                continue
            adjacency.setdefault(source, []).append(edge)
            adjacency.setdefault(target, []).append(edge)

        visited = set(seed_ids)
        frontier = set(seed_ids)
        selected_edge_ids: set[str] = set()
        levels: dict[str, int] = {sid: 0 for sid in seed_ids}

        for level in range(1, max(1, min(depth, 3)) + 1):
            nxt: set[str] = set()
            for nid in frontier:
                for edge in adjacency.get(nid, []):
                    eid = str(edge.get("edge_id") or "")
                    if eid:
                        selected_edge_ids.add(eid)
                    other = str(edge.get("target") if str(edge.get("source")) == nid else edge.get("source"))
                    if other and other not in visited:
                        visited.add(other)
                        levels[other] = level
                        nxt.add(other)
                    if len(selected_edge_ids) >= limit:
                        break
                if len(selected_edge_ids) >= limit:
                    break
            frontier = nxt
            if not frontier or len(selected_edge_ids) >= limit:
                break

        selected_edges = [edge for edge in edges if str(edge.get("edge_id") or "") in selected_edge_ids][:limit]
        selected_node_ids = set(seed_ids)
        for edge in selected_edges:
            selected_node_ids.add(str(edge.get("source") or ""))
            selected_node_ids.add(str(edge.get("target") or ""))
        selected_nodes = [nodes[nid] for nid in selected_node_ids if nid in nodes]

        paths = []
        for edge in selected_edges:
            source = nodes.get(str(edge.get("source")), {"id": edge.get("source")})
            target = nodes.get(str(edge.get("target")), {"id": edge.get("target")})
            paths.append({
                "from": {
                    "id": source.get("id"),
                    "label": source.get("label"),
                    "primary_loc": source.get("primary_loc"),
                    "node_type": source.get("node_type"),
                },
                "relation": edge.get("relation_type"),
                "to": {
                    "id": target.get("id"),
                    "label": target.get("label"),
                    "primary_loc": target.get("primary_loc"),
                    "node_type": target.get("node_type"),
                },
                "summary": edge.get("summary") or "",
                "evidence_kind": edge.get("evidence_kind"),
            })

        # Convert traversed graph nodes back into a useful aggregation layer.
        connected_result_ids = [
            nid for nid in selected_node_ids
            if nid in result_by_id and nid not in seed_ids
        ]
        connected_results = [{
            "result_id": rid,
            "title": result_by_id[rid].get("title"),
            "primary_loc": result_by_id[rid].get("primary_loc"),
            "group": result_by_id[rid].get("group"),
        } for rid in connected_result_ids]

        era_nodes = [node for node in selected_nodes if node.get("node_type") == "era"]
        era_nodes.sort(key=lambda node: next(
            (float(x.get("order") or 0) for x in self.eras.get("eras", []) if x.get("era_id") == node.get("id")),
            999.0,
        ))

        loc_nodes = sorted({
            str(node.get("id"))
            for node in selected_nodes
            if node.get("node_type") == "loc_domain"
        })

        return {
            "mode": "canonical_graph_rag",
            "canonical_edges_only": True,
            "depth": max(levels.values()) if levels else 0,
            "seed_result_ids": sorted(seed_ids)[:50],
            "nodes": selected_nodes,
            "edges": selected_edges,
            "paths": paths,
            "node_count": len(selected_nodes),
            "edge_count": len(selected_edges),
            "connected_result_ids": connected_result_ids,
            "connected_results": connected_results,
            "era_path": [{
                "era_id": node.get("id"),
                "period": node.get("period"),
                "label": node.get("label"),
            } for node in era_nodes],
            "loc_path": loc_nodes,
            "graph_registry_counts": {
                "nodes": base.get("node_count", 0),
                "edges": base.get("edge_count", 0),
            },
        }

    def graph_snapshot(self, node_id: str = "", depth: int = 2) -> dict[str, Any]:
        """Expose the governed graph for diagnostics and external graph clients."""
        graph = self._canonical_graph()
        if not node_id:
            return {
                "mode": "canonical_graph",
                "nodes": graph.get("nodes", []),
                "edges": graph.get("edges", []),
                "node_count": graph.get("node_count", 0),
                "edge_count": graph.get("edge_count", 0),
            }

        nodes = {str(node.get("id")): node for node in graph.get("nodes", [])}
        edges = graph.get("edges", [])
        if node_id not in nodes:
            return {
                "mode": "canonical_graph",
                "center": node_id,
                "nodes": [],
                "edges": [],
                "node_count": 0,
                "edge_count": 0,
            }

        adjacency: dict[str, list[dict[str, Any]]] = {}
        for edge in edges:
            adjacency.setdefault(str(edge.get("source")), []).append(edge)
            adjacency.setdefault(str(edge.get("target")), []).append(edge)

        visited = {node_id}
        frontier = {node_id}
        edge_ids: set[str] = set()
        for _ in range(max(1, min(int(depth or 2), 3))):
            nxt: set[str] = set()
            for nid in frontier:
                for edge in adjacency.get(nid, []):
                    edge_ids.add(str(edge.get("edge_id")))
                    other = str(edge.get("target") if str(edge.get("source")) == nid else edge.get("source"))
                    if other and other not in visited:
                        visited.add(other)
                        nxt.add(other)
            frontier = nxt
            if not frontier:
                break

        selected_edges = [edge for edge in edges if str(edge.get("edge_id")) in edge_ids]
        return {
            "mode": "canonical_graph",
            "center": node_id,
            "depth": depth,
            "nodes": [nodes[nid] for nid in visited if nid in nodes],
            "edges": selected_edges,
            "node_count": len(visited),
            "edge_count": len(selected_edges),
        }

    @staticmethod
    def _collect_topic_terms(query: str, groups: dict[str, list[dict[str, Any]]], limit: int = 10) -> list[dict[str, Any]]:
        """Aggregate maintained tags/keywords from retrieved evidence.

        These are descriptive retrieval terms, not new Canon definitions.
        """
        q = _compact(query)
        counts: dict[str, int] = {}
        source_groups: dict[str, set[str]] = {}
        stop = {
            "loc1","loc2","loc3","loc4","loc5","loc6","loc7","loc8",
            "current","released","archived","recorded","threads","instagram","suno"
        }

        def add(term: Any, group: str) -> None:
            value = str(term or "").strip()
            key = _normalize(value)
            if not value or len(value) > 40 or key in stop:
                return
            if q and _compact(value) == q:
                weight = 3
            else:
                weight = 1
            counts[value] = counts.get(value, 0) + weight
            source_groups.setdefault(value, set()).add(group)

        for group, items in groups.items():
            for item in items:
                payload = item.get("payload") or {}
                for field in ("tags", "keywords", "semantic_keywords", "reasoning_tags", "key_propositions"):
                    value = payload.get(field)
                    if isinstance(value, list):
                        for term in value:
                            add(term, group)
                    elif isinstance(value, str):
                        for term in re.split(r"[、，,；;／/|]+", value):
                            add(term, group)
                for value in (
                    payload.get("topic"),
                    payload.get("governance_principle"),
                    payload.get("analysis_type"),
                    item.get("title"),
                ):
                    if value and len(str(value)) <= 24:
                        add(value, group)

        rows = [
            {"term": term, "weight": weight, "groups": sorted(source_groups.get(term, set()))}
            for term, weight in counts.items()
        ]
        rows.sort(key=lambda row: (-row["weight"], row["term"]))
        return rows[:limit]

    def _topic_period_trend(self, query: str, graph: dict[str, Any]) -> dict[str, Any]:
        """Read query-topic prevalence across maintained period keyword analyses."""
        q = _compact(query)
        if not q:
            return {"matches": [], "summary": ""}

        era_order = {
            str(era.get("period") or ""): float(era.get("order") or 0)
            for era in self.eras.get("eras", [])
        }
        matches: list[dict[str, Any]] = []

        for item in self.loc6_period_keywords.get("periods", []):
            period = str(item.get("period") or "")
            for kw in item.get("keywords", []) or []:
                term = str(kw.get("term") or "")
                compact = _compact(term)
                if q in compact or compact in q:
                    matches.append({
                        "period": period,
                        "source": "LOC6",
                        "term": term,
                        "percent": float(kw.get("percent") or 0),
                        "count": int(kw.get("document_count") or 0),
                        "sample_count": int(item.get("document_count") or 0),
                    })

        # LOC3 normalized semantic families are supplemental.
        for item in self.loc3_period_keywords.get("periods", []):
            period = str(item.get("period") or "")
            pools = []
            for field in ("normalized_semantic_families", "normalized_top_keywords", "named_keywords"):
                pools.extend(item.get(field, []) or [])
            for kw in pools:
                term = str(kw.get("term") or "")
                compact = _compact(term)
                if q in compact or compact in q:
                    matches.append({
                        "period": period,
                        "source": "LOC3",
                        "term": term,
                        "percent": float(kw.get("percent") or 0),
                        "count": int(kw.get("count") or 0),
                        "sample_count": int(item.get("work_count") or 0),
                    })

        matches.sort(key=lambda row: (era_order.get(row["period"], 999), row["source"]))
        if not matches:
            era_path = [
                str(x.get("period") or "")
                for x in graph.get("era_path", [])
                if x.get("period")
            ]
            return {
                "matches": [],
                "summary": ("Graph 命中的時期為 " + " → ".join(era_path)) if era_path else "",
                "basis": "graph_era_path",
            }

        by_source: dict[str, list[dict[str, Any]]] = {}
        for row in matches:
            by_source.setdefault(row["source"], []).append(row)

        parts = []
        for source, rows in sorted(by_source.items()):
            series = " → ".join(f"{row['period']} {row['percent']:g}%" for row in rows)
            parts.append(f"{source}：{series}")

        return {
            "matches": matches,
            "summary": "；".join(parts),
            "basis": "maintained_period_keyword_analysis",
        }

    @staticmethod
    def _synthesis_confidence(groups: dict[str, list[dict[str, Any]]], graph: dict[str, Any]) -> dict[str, Any]:
        strong_groups = sum(1 for key in ("knowledge", "governance", "relationships", "timeline") if groups.get(key))
        evidence_groups = sum(1 for items in groups.values() if items)
        graph_edges = int(graph.get("edge_count") or 0)
        if strong_groups >= 2 and graph_edges >= 2:
            level = "high"
        elif evidence_groups >= 2 or graph_edges >= 1:
            level = "medium"
        else:
            level = "limited"
        return {
            "level": level,
            "evidence_group_count": evidence_groups,
            "strong_group_count": strong_groups,
            "graph_edge_count": graph_edges,
        }

    def _synthesize_search(
        self,
        query: str,
        groups: dict[str, list[dict[str, Any]]],
        graph: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Create a deterministic overview from maintained analysis + retrieved evidence."""
        nonempty = {key: items for key, items in groups.items() if items}
        if not nonempty:
            return None

        priority = {
            "knowledge": 6,
            "governance": 5,
            "relationships": 4,
            "timeline": 3,
            "loc6_articles": 2,
            "works": 1,
            "textworks": 1,
            "media": 1,
            "runes": 1,
            "oracle": 1,
        }
        candidates: list[tuple[int, float, str, dict[str, Any]]] = []
        for group, items in nonempty.items():
            for item in items:
                candidates.append((
                    priority.get(group, 0),
                    float(item.get("score") or 0.0),
                    group,
                    item,
                ))
        candidates.sort(key=lambda row: (-row[0], -row[1], str(row[3].get("result_id") or "")))
        lead_group = candidates[0][2]
        lead = candidates[0][3]

        loc_counts: dict[str, int] = {}
        periods: list[str] = []
        sources: set[str] = set()
        for group, items in nonempty.items():
            for item in items:
                loc = str(item.get("primary_loc") or "").strip()
                if loc:
                    loc_counts[loc] = loc_counts.get(loc, 0) + 1
                period = str(item.get("period") or (item.get("payload") or {}).get("period") or "").strip()
                if period and period not in periods:
                    periods.append(period)
                src = self._result_source_platform(item)
                if src:
                    sources.add(src)

        evidence_labels = {
            "knowledge": "知識／分析",
            "governance": "治理／政德風",
            "relationships": "跨 LOC 關聯",
            "timeline": "時期",
            "loc6_articles": "Threads／LOC6 文章",
            "works": "歌曲／歌詞",
            "textworks": "文字作品",
            "media": "多媒體",
            "runes": "月符",
            "oracle": "籤詩",
        }
        evidence = [
            {"group": key, "label": evidence_labels.get(key, key), "count": len(items)}
            for key, items in nonempty.items()
        ]
        evidence.sort(key=lambda row: (-row["count"], row["label"]))

        supporting = []
        seen: set[str] = set()
        for _, _, group, item in candidates:
            rid = str(item.get("result_id") or "")
            if not rid or rid in seen:
                continue
            seen.add(rid)
            supporting.append({
                "result_id": rid,
                "group": group,
                "title": item.get("title"),
                "primary_loc": item.get("primary_loc"),
                "score": item.get("score"),
            })
            if len(supporting) >= 6:
                break

        lead_summary = str(lead.get("summary") or "").strip()
        if not lead_summary:
            lead_summary = f"「{query}」目前命中 {len(nonempty)} 類 LOC 資料，可從知識、作品、治理、時間與關聯證據交叉閱讀。"

        era_path = [str(x.get("period") or x.get("label") or "") for x in graph.get("era_path", []) if x]
        loc_path = [str(x) for x in graph.get("loc_path", []) if x]
        graph_parts = []
        if era_path:
            graph_parts.append("時期：" + " → ".join(era_path))
        if loc_path:
            graph_parts.append("跨 LOC：" + "、".join(loc_path))
        relation_paths = [
            p for p in graph.get("paths", [])
            if p.get("relation") not in {"owned_by_loc", "belongs_to_era", "temporal_before"}
        ]
        if relation_paths:
            graph_parts.append(
                "關聯：" + "；".join(
                    f"{(p.get('from') or {}).get('label') or (p.get('from') or {}).get('id')} "
                    f"→ {p.get('relation')} → "
                    f"{(p.get('to') or {}).get('label') or (p.get('to') or {}).get('id')}"
                    for p in relation_paths[:3]
                )
            )
        graph_summary = "｜".join(graph_parts) if graph_parts else "目前沒有足夠的 Canonical Graph 關聯可形成額外彙整。"

        topic_terms = self._collect_topic_terms(query, groups)
        period_trend = self._topic_period_trend(query, graph)
        confidence = self._synthesis_confidence(groups, graph)

        loc_names = [loc for loc, _count in sorted(loc_counts.items(), key=lambda row: (-row[1], row[0]))]
        evidence_names = [row["label"] for row in evidence[:4]]
        introduction_parts = [
            lead_summary,
            (f"目前資料主要跨越 {'、'.join(loc_names[:5])}。" if loc_names else ""),
            (f"可用證據包含 {'、'.join(evidence_names)}。" if evidence_names else ""),
        ]
        introduction = " ".join(part for part in introduction_parts if part).strip()

        findings: list[str] = []
        if topic_terms:
            findings.append("核心相關詞：" + "、".join(row["term"] for row in topic_terms[:6]))
        if period_trend.get("summary"):
            findings.append("時期變化：" + period_trend["summary"])
        if loc_path:
            findings.append("跨 LOC 範圍：" + "、".join(loc_path))
        if relation_paths:
            findings.append(
                "已確認關聯：" + "；".join(
                    f"{(p.get('from') or {}).get('label') or (p.get('from') or {}).get('id')} "
                    f"→ {p.get('relation')} → "
                    f"{(p.get('to') or {}).get('label') or (p.get('to') or {}).get('id')}"
                    for p in relation_paths[:3]
                )
            )
        if not findings:
            findings.append("目前以直接搜尋命中為主，尚不足以形成更強的跨資料結論。")

        analysis_summary = " ".join(findings)

        return {
            "analysis_type": "search_synthesis",
            "query": query,
            "title": f"{query}｜綜合結果",
            "summary": lead_summary,
            "introduction": introduction,
            "analysis_summary": analysis_summary,
            "key_findings": findings,
            "topic_terms": topic_terms,
            "period_trend": period_trend,
            "confidence": confidence,
            "lead_result_id": lead.get("result_id"),
            "lead_group": lead_group,
            "lead_title": lead.get("title"),
            "loc_coverage": [
                {"loc": loc, "count": count}
                for loc, count in sorted(loc_counts.items(), key=lambda row: (-row[1], row[0]))
            ],
            "evidence": evidence,
            "periods": periods[:12],
            "sources": sorted(sources),
            "supporting_results": supporting,
            "graph_summary": graph_summary,
            "graph": {
                "mode": graph.get("mode"),
                "node_count": graph.get("node_count", 0),
                "edge_count": graph.get("edge_count", 0),
                "paths": graph.get("paths", [])[:10],
                "era_path": graph.get("era_path", []),
                "loc_path": graph.get("loc_path", []),
                "connected_results": graph.get("connected_results", [])[:10],
                "registry_counts": graph.get("graph_registry_counts", {}),
            },
            "governance_note": "綜合結果先由 Search 取回證據，再以 Canonical Graph 聚合 LOC、ERA、作品與分析節點。語意相似只負責選 seed；Graph edge 僅採 Registry、權威欄位或可確定的結構關係。",
        }


    @staticmethod
    def _provenance_summary(
        groups: dict[str, list[dict[str, Any]]],
        graph: dict[str, Any],
    ) -> dict[str, Any]:
        """Return one compact provenance envelope for Search consumers."""
        refs: list[dict[str, Any]] = []
        seen_refs: set[tuple[str, str, str]] = set()
        result_sources: list[dict[str, Any]] = []

        for group, items in groups.items():
            for item in items:
                rid = str(item.get("result_id") or "")
                item_refs = item.get("source_refs") or []
                normalized_refs = []
                for ref in item_refs:
                    if isinstance(ref, str):
                        row = {"source_type": "reference", "source_id": ref, "note": ""}
                    elif isinstance(ref, dict):
                        row = {
                            "source_type": str(ref.get("source_type") or ""),
                            "source_id": str(ref.get("source_id") or ""),
                            "note": str(ref.get("note") or ""),
                        }
                    else:
                        continue
                    key = (row["source_type"], row["source_id"], row["note"])
                    if key not in seen_refs:
                        seen_refs.add(key)
                        refs.append(row)
                    normalized_refs.append(row)

                if normalized_refs:
                    result_sources.append({
                        "result_id": rid,
                        "group": group,
                        "primary_loc": item.get("primary_loc"),
                        "sources": normalized_refs,
                    })

        graph_evidence: dict[str, int] = {}
        graph_status: dict[str, int] = {}
        for edge in graph.get("edges", []) or []:
            kind = str(edge.get("evidence_kind") or "unspecified")
            status = str(edge.get("evidence_status") or "unspecified")
            graph_evidence[kind] = graph_evidence.get(kind, 0) + 1
            graph_status[status] = graph_status.get(status, 0) + 1

        return {
            "source_ref_count": len(refs),
            "source_refs": refs[:100],
            "result_sources": result_sources[:50],
            "graph_evidence_kinds": graph_evidence,
            "graph_evidence_status": graph_status,
            "graph_policy": "semantic similarity selects seeds; only recorded/deterministic governed edges are traversed",
            "loc8_live_relation_policy": "private Google Sheet Relation rows are not exposed by public Search; only repository-governed public snapshots/registries may enter the canonical graph",
        }


    def search(
        self,
        query: str,
        top_k: int = 6,
        content_type: str = "",
        filters: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        filters = filters or {}
        wanted = (content_type or "").strip().lower()

        oracle, oracle_terms = self._oracle_result(query)
        oracle_mode = wanted == "oracle"
        effective_wanted = "" if oracle_mode else wanted
        if oracle:
            faq = []
            music, linked_media = self._music_keyword_results(oracle_terms, top_k, effective_wanted, filters)
            textworks, direct_media, documents, eras = self._keyword_cross_results(oracle_terms, top_k, effective_wanted)
            media_by_id = {}
            for item in [*direct_media, *linked_media]:
                media_by_id[item.get("result_id")] = item
            media = list(media_by_id.values())[:top_k]
            relationships = []
            governance = self._governance_results(query, top_k, effective_wanted)
            loc6_articles = self._loc6_article_results(query, top_k, effective_wanted, filters)
            runes = self._rune_results(oracle[0]["payload"].get("rune_name", ""), top_k, effective_wanted)
        else:
            faq = self._faq_results(query, top_k, wanted)
            documents = self._knowledge_asset_results(query, top_k, wanted)
            music, linked_media = self._music_results(query, top_k, wanted, filters)
            textworks = self._loc4_results(query, top_k, wanted)
            direct_media = self._media_registry_results(query, top_k, wanted)
            media_by_id = {}
            for item in [*direct_media, *linked_media]:
                media_by_id[item.get("result_id")] = item
            media = list(media_by_id.values())[:top_k]
            relationships = self._relationship_results(query, top_k, wanted)
            governance = self._governance_results(query, top_k, wanted)
            loc6_articles = self._loc6_article_results(query, top_k, wanted, filters)
            runes = self._rune_results(query, top_k, wanted)
            eras = self._era_results(query, top_k, wanted)

        groups = {
            "oracle": oracle,
            "runes": runes,
            "works": music,
            "textworks": textworks,
            "relationships": relationships,
            "governance": governance,
            "loc6_articles": loc6_articles,
            "media": media,
            "knowledge": [*documents, *faq],
            "timeline": eras,
        }
        groups = self._apply_common_filters(groups, filters)
        graph = self._graph_enrichment(query, groups)
        synthesis = self._synthesize_search(query, groups, graph)
        provenance = self._provenance_summary(groups, graph)
        return {
            "system_id": "lo3rwang",
            "query": query,
            "content_type": wanted or "all",
            "retrieval_mode": "oracle_keyword_graph_enriched" if oracle else "graph_enriched",
            "oracle_mode": oracle_mode,
            "synthesis": synthesis,
            "graph": graph,
            "provenance": provenance,
            "groups": groups,
            "counts": {key: len(value) for key, value in groups.items()},
            "total_count": sum(len(value) for value in groups.values()),
            "coverage": {
                "LOC1": "live",
                "LOC2": "knowledge-view-only",
                "LOC3": "live",
                "LOC4": "direct-work-search-live",
                "LOC5": "direct-media-registry-search-live",
                "LOC6": "governance+threads-km-search-live",
                "LOC6_threads_indexed": len(self._loc6_article_documents()),
                "LOC7": "live",
                "LOC8": "era+context-graph-live",
            },
        }
