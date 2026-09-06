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
        self.loc4 = self._load_json("LOC4_WRITING_REGISTRY.json")
        self.loc6 = self._load_json("LOC6_GOVERNANCE_REGISTRY.json")
        self.loc6_threads = self._load_json("LOC6_THREADS_KM_INDEX.json")
        self.loc6_thread_articles = self._load_repo_json("data/generated/loc6/LOC6_THREADS_ARTICLE_INDEX_v0.2.json")
        self.loc6_thread_manifest = self._load_repo_json("data/generated/loc6/threads/LOC6_THREADS_DOCUMENT_MANIFEST.json")
        self.loc6_thread_full = self._load_loc6_thread_shards()
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
                    "summary": item.get("notes") or item.get("role") or "",
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
                items.append({
                    "result_id": doc.get("id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": ["LOC7", "LOC8"],
                    "content_type": "governance_article",
                    "group": "loc6_articles",
                    "title": (
                        f"Threads｜{doc.get('date') or 'undated'}｜{doc.get('era') or 'ERA'}｜"
                        + ((re.split(r"[。！？!?\n]", str(doc.get("text") or ""), maxsplit=1)[0].strip()[:34] + "…")
                           if len(re.split(r"[。！？!?\n]", str(doc.get("text") or ""), maxsplit=1)[0].strip()) > 34
                           else re.split(r"[。！？!?\n]", str(doc.get("text") or ""), maxsplit=1)[0].strip())
                    ),
                    "summary": doc.get("text") or "",
                    "period": doc.get("era"),
                    "era_id": f"ERA-{doc.get('era')}" if doc.get("era") else None,
                    "source_refs": [{"source_type": "threads", "source_id": doc.get("source_id"), "note": "primary main-post evidence"}],
                    "payload": {**doc, "km_source": "LOC6_THREADS_FULL_CORPUS", "evidence_role": "primary"},
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
        return {
            "system_id": "lo3rwang",
            "query": query,
            "content_type": wanted or "all",
            "retrieval_mode": "oracle_keyword" if oracle else "standard",
            "oracle_mode": oracle_mode,
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
                "LOC8": "live-era",
            },
        }
