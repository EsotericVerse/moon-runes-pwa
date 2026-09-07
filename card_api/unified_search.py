from __future__ import annotations

import gzip
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from loc4_chapter_analysis import build_moon_speaker_chapter_analysis


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
        self.registry_root = repo_root / "data" / "json" / "registries"
        self.system = self._load_json("LOC_LANGUAGE_SYSTEM_REGISTRY.json")
        self.eras = self._load_json("LOC_ERA_REGISTRY.json")
        self.content_types = self._load_json("LOC_CONTENT_TYPE_REGISTRY.json")
        self.relationships = self._load_json("LOC_CROSS_RELATIONSHIP_REGISTRY.json")
        self.graph_schema = self._load_json("LOC_GRAPH_SCHEMA.json")
        self.loc2_events = self._load_json("LOC2_EVENT_REGISTRY.json")
        self.loc4 = self._load_json("LOC4_WRITING_REGISTRY.json")
        self.loc4_analysis = self._load_json("LOC4_TEXT_ANALYSIS_REGISTRY.json")
        self.loc4_corpus_manifest = self._load_repo_json("data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json")
        self.loc4_corpus = self._load_loc4_corpus_shards()
        try:
            self.loc4_moon_speaker_analysis = build_moon_speaker_chapter_analysis(repo_root)
        except Exception:
            self.loc4_moon_speaker_analysis = {"chapters": [], "chapter_count": 0}
        self.loc6 = self._load_json("LOC6_GOVERNANCE_REGISTRY.json")
        self.loc4_threads = self._load_json("LOC4_THREADS_KM_INDEX.json")
        self.loc6_period_keywords = self._load_json("LOC6_PERIOD_KEYWORD_ANALYSIS.json")
        self.loc3_period_keywords = self._load_json("LOC3_PERIOD_KEYWORD_ANALYSIS.json")
        self.loc4_thread_articles = {}
        self.loc4_thread_manifest = self._load_repo_json("data/json/generated/loc4/threads/LOC4_THREADS_DOCUMENT_MANIFEST.json")
        self.loc4_thread_full = self._load_loc4_thread_shards()
        self.knowledge_assets = self._load_json("LOC_KNOWLEDGE_ASSET_REGISTRY.json")
        self.media = self._load_json("LOC_MEDIA_REGISTRY.json")
        self.lots = self._load_repo_json("data/json/core/lots.json")
        self.loc8_relation_schema = self._load_json("LOC8_RELATION_SCHEMA.json")
        self.loc8_events = self._load_json("LOC8_EVENT_SNAPSHOT.json")
        self.loc8_daily_runes = self._load_json("LOC8_DAILY_RUNE_SNAPSHOT.json")
        self.rune_literature = self._load_json("RUNE_LITERATURE_REGISTRY.json")
        self.rune_songs = self._load_json("LOC3_RUNE_SONG_REGISTRY.json")
        self.ow3gs_readings = self._load_json("LOC1_OW3GS_READING_REGISTRY.json")

    def _load_json(self, name: str) -> dict[str, Any]:
        path = self.registry_root / name
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

    def _load_loc4_thread_shards(self) -> dict[str, Any]:
        manifest = getattr(self, "loc4_thread_manifest", {}) or {}
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

    def _loc4_article_documents(self) -> list[dict[str, Any]]:
        full_docs = (getattr(self, "loc4_thread_full", {}) or {}).get("documents", [])
        if full_docs:
            return full_docs
        return self.loc4_thread_articles.get("documents", []) or self.loc4_threads.get("documents", [])

    def _load_loc4_corpus_shards(self) -> dict[str, Any]:
        manifest = getattr(self, "loc4_corpus_manifest", {}) or {}
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


    @staticmethod
    def _allowed(content_type: str, wanted: str) -> bool:
        return not wanted or wanted == "all" or content_type == wanted

    def _default_display_policy(self, content_type: str) -> str:
        for item in (self.content_types.get("types", []) if isinstance(self.content_types, dict) else []):
            if str(item.get("id") or "") == str(content_type or ""):
                value = str(item.get("default_display_policy") or "").strip()
                if value in {"snippet", "full", "metadata_only"}:
                    return value
        cfg = self.content_types.get("display_policy", {}) if isinstance(self.content_types, dict) else {}
        value = str(cfg.get("default_when_unspecified") or "snippet").strip()
        return value if value in {"snippet", "full", "metadata_only"} else "snippet"

    @staticmethod
    def _query_snippet(text: Any, query: str, radius: int = 90) -> str:
        raw = re.sub(r"\s+", " ", str(text or "")).strip()
        if not raw:
            return ""
        q = re.sub(r"\s+", "", str(query or "")).strip()
        compact = re.sub(r"\s+", "", raw)
        pos = compact.lower().find(q.lower()) if q else -1

        # Map the compact-string position back approximately to the original
        # whitespace-preserving string. For CJK corpora this is normally exact
        # enough and avoids tokenization dependencies.
        if pos >= 0:
            nonspace_seen = 0
            center = 0
            for i, ch in enumerate(raw):
                if not ch.isspace():
                    if nonspace_seen >= pos:
                        center = i
                        break
                    nonspace_seen += 1
        else:
            center = 0

        start = max(0, center - radius)
        end = min(len(raw), center + max(radius, len(q) + radius))
        snippet = raw[start:end].strip()
        if start > 0:
            snippet = "…" + snippet
        if end < len(raw):
            snippet += "…"
        return snippet

    def _public_display_result(self, item: dict[str, Any], query: str) -> dict[str, Any]:
        row = dict(item)
        payload = dict(row.get("payload") or {})

        explicit = str(row.get("display_policy") or payload.get("display_policy") or "").strip()
        if explicit not in {"snippet", "full", "metadata_only"}:
            explicit = ""

        # Threads corpus records default to snippet even when they are routed
        # through the shorter governance_fragment result type.
        is_threads = any(
            str(ref.get("source_type") or "").lower() == "threads"
            for ref in (row.get("source_refs") or [])
            if isinstance(ref, dict)
        )
        policy = explicit or ("snippet" if is_threads else self._default_display_policy(str(row.get("content_type") or "")))

        row["display_policy"] = policy

        if policy == "full":
            return row

        full_fields = ("lyrics", "text", "full_text", "transcript", "body", "content")
        source_text = ""
        for key in full_fields:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                source_text = value
                break

        for key in full_fields:
            payload.pop(key, None)

        # Nested copies occasionally appear in imported/search result payloads.
        for nested_key in ("source", "document", "work", "record"):
            nested = payload.get(nested_key)
            if isinstance(nested, dict):
                clean = dict(nested)
                for key in full_fields:
                    clean.pop(key, None)
                payload[nested_key] = clean

        if policy == "metadata_only":
            row["summary"] = ""
            row["snippet"] = ""
        else:
            snippet = self._query_snippet(source_text or row.get("summary"), query)
            row["summary"] = snippet
            row["snippet"] = snippet

        row["payload"] = payload
        return row

    def _apply_public_display_policies(
        self,
        groups: dict[str, list[dict[str, Any]]],
        query: str,
    ) -> dict[str, list[dict[str, Any]]]:
        return {
            key: [self._public_display_result(item, query) for item in items]
            for key, items in groups.items()
        }

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
            "source_refs": [{"source_type": "spreadsheet", "source_id": "LunaRune64.xlsx#Lots", "note": "via data/json/core/lots.json"}],
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

    def _loc2_scenario_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "scenario_event", "knowledge", "game_document", "game_rule"}:
            return []
        scored: list[tuple[float, dict[str, Any]]] = []
        for row in self.loc2_events.get("records", []) or []:
            score = _text_score(query, [
                row.get("event_id"),
                row.get("title"),
                row.get("event_group"),
                row.get("requirement_signature"),
                row.get("description"),
                row.get("content_type"),
            ])
            if score <= 0:
                continue
            scored.append((score, row))

        scored.sort(key=lambda item: (-item[0], str(item[1].get("event_id") or "")))
        return [{
            "result_id": row.get("event_id"),
            "system_id": "lo3rwang",
            "primary_loc": "LOC2",
            "related_locs": row.get("related_locs", ["LOC1", "LOC4", "LOC6", "LOC7", "LOC8"]),
            "content_type": "scenario_event",
            "group": "scenarios",
            "title": row.get("title") or row.get("event_id"),
            "summary": row.get("description") or "",
            "score": round(score, 6),
            "source_refs": [{
                "source_type": "registry",
                "source_id": "LOC2_EVENT_REGISTRY.json",
                "note": row.get("status") or self.loc2_events.get("status") or "working",
            }],
            "payload": {
                **row,
                "scenario_corpus_stage": (self.loc2_events.get("corpus_summary") or {}).get("stage"),
                "scenario_semantic_role": (self.loc2_events.get("corpus_summary") or {}).get("semantic_role"),
                "grammar_note": self.loc2_events.get("grammar_note") or {},
            },
        } for score, row in scored[:top_k]]

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

    def _entity_results(self, query: str, wanted: str) -> list[dict[str, Any]]:
        """Deterministic entity-first entries for named LOC methods."""
        if wanted not in {"", "all", "knowledge", "faq"}:
            return []
        q = _compact(query)
        aliases = {"ow3gs", "11張抽牌", "十一張抽牌", "11卡", "十一卡"}
        if not any(alias in q for alias in aliases):
            return []
        return [{
            "result_id": "ENTITY-OW3GS",
            "system_id": "lo3rwang",
            "primary_loc": "LOC1",
            "related_locs": ["LOC3", "LOC7", "LOC8"],
            "content_type": "knowledge_entity",
            "group": "entities",
            "title": "OW3gs",
            "summary": "LOC1 的 11 張抽取結構：1–6 為 Context Field（因的描述層），7–11 為 Core Fate Sentence（果的判定層）。",
            "score": 1.0,
            "source_refs": [
                {"source_type": "document", "source_id": "命運句語法圖鑑_MoonSyntax_V2.1", "note": "OW3gs 十一卡語法"},
                {"source_type": "registry", "source_id": "LOC3_RUNE_SONG_REGISTRY.json", "note": "符文歌曲生成方法與關聯"}
            ],
            "payload": {
                "entity_type": "method",
                "aliases": ["11 張抽牌", "十一卡", "7–11 法則"],
                "definition": "OW3gs 是月之符文的 11 張抽取結構，也是作者規則層的重要方法之一。",
                "structure": [
                    {"range": "1–6", "label": "Context Field／因的描述層", "description": "聚合背景、既有條件、資源、阻力、外部擾動與尚未成形因素。"},
                    {"range": "7–11", "label": "Core Fate Sentence／果的判定層", "description": "依序為因、現、向、境、心，形成主要核心判定。"}
                ],
                "reading_order": [
                    "先讀第 7–11 張，建立核心五卡命運句。",
                    "再掃描第 1–6 張的重複群組、方向、張力與顯著主題。",
                    "只把與核心有明確語義關係的場域訊息帶回，不把 11 張等權線性串接。",
                    "最後才加入真實月相作低權重時間修飾。"
                ],
                "rune_song_note": "符文歌曲是以實際抽牌結果形成語意／解讀後再轉化成歌曲；OW3gs 是其中的 11 張生成方法。"
            },
        }]

    def _ow3gs_reading_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "rune_record", "knowledge", "faq"}:
            return []
        q = _compact(query)
        rune_names = {
            _compact(rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or ""):
            (rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or "")
            for rune in self.runes
        }
        rune_query = rune_names.get(q)
        is_ow3gs = "ow3gs" in q or q in {"11張抽牌", "十一張抽牌", "11卡", "十一卡"}
        if not is_ow3gs and not rune_query:
            return []

        output = []
        for idx, record in enumerate(self.ow3gs_readings.get("records", []) or [], start=1):
            cards = record.get("cards", []) or []
            if rune_query and not any(card.get("rune") == rune_query for card in cards):
                continue
            card_text = "、".join(
                f"{card.get('rune', '')}{card.get('direction', '')}" for card in cards if card.get("rune")
            )
            output.append({
                "result_id": record.get("id") or f"OW3GS-READING-{idx}",
                "system_id": "lo3rwang",
                "primary_loc": "LOC1",
                "related_locs": ["LOC7", "LOC8"],
                "content_type": "rune_reading",
                "group": "readings",
                "title": record.get("title") or f"OW3gs 解牌案例 {idx}",
                "summary": record.get("conclusion") or card_text,
                "score": 1.0 if is_ow3gs else 0.94,
                "source_refs": [{
                    "source_type": "registry",
                    "source_id": "LOC1_OW3GS_READING_REGISTRY.json",
                    "note": "Base66 formal OW3gs reading corpus",
                }],
                "payload": {
                    "spread_type": record.get("spread_type") or "OW3gs 11-card",
                    "cards": cards,
                    "record_status": record.get("status") or "formal_base66",
                    "context_text": record.get("context_text"),
                    "core_text": record.get("core_text"),
                    "conclusion": record.get("conclusion"),
                    "verification": record.get("verification"),
                    "interpretation_status": "完整 Base66 OW3gs 解牌案例",
                },
            })
        return output[:max(top_k, 8) if is_ow3gs else top_k]

    def _rune_song_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "lyrics_work", "suno_song", "rune_record", "knowledge"}:
            return []
        q = _compact(query)
        rune_names = {
            _compact(rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or ""):
            (rune.get("名稱") or rune.get("符文名稱") or rune.get("name") or "")
            for rune in self.runes
        }
        rune_query = rune_names.get(q)
        is_ow3gs = "ow3gs" in q or q in {"11張抽牌", "十一張抽牌", "11卡", "十一卡"}
        if not rune_query and not is_ow3gs:
            return []

        work_by_id = {
            str(work.get("work_id") or ""): work
            for work in (getattr(self.loc3_searcher, "works", []) if self.loc3_searcher else [])
        }

        records: list[tuple[dict[str, Any], str, str]] = []

        for record in self.rune_songs.get("ow3gs_records", []) or []:
            runes = record.get("runes", []) or []
            if is_ow3gs or (rune_query and rune_query in runes):
                records.append((record, "符文歌曲", "OW3gs"))

        if rune_query:
            for record in self.rune_songs.get("confirmed_records", []) or []:
                runes = record.get("runes", []) or []
                if rune_query in runes:
                    label = "特別製作符文歌" if record.get("special_construction") else "符文歌曲"
                    method_name = "special_rune_song" if record.get("special_construction") else "rune_song"
                    records.append((record, label, method_name))
        elif is_ow3gs:
            for record in self.rune_songs.get("confirmed_records", []) or []:
                if record.get("special_construction"):
                    continue
                records.append((record, "符文歌曲", record.get("generation_method") or "rune_song"))

        output = []
        seen = set()
        for record, type_label, method_name in records:
            work_id = str(record.get("work_id") or "")
            dedupe_key = work_id or f"{record.get('title')}:{method_name}"
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            work = work_by_id.get(work_id, {})
            versions = work.get("versions", []) or []
            recommended = versions[0] if versions else {}
            runes = record.get("runes", []) or []
            output.append({
                "result_id": f"RUNE-SONG-{work_id or len(output)+1}",
                "system_id": "lo3rwang",
                "primary_loc": "LOC3",
                "related_locs": ["LOC1", "LOC7"],
                "content_type": "rune_song",
                "group": "rune_songs",
                "title": record.get("title") or work.get("title") or work_id,
                "summary": f"{type_label} · {len(runes)} 個 distinct 符文",
                "score": 1.0,
                "period": record.get("period") or work.get("period"),
                "source_refs": [{
                    "source_type": "registry",
                    "source_id": "LOC3_RUNE_SONG_REGISTRY.json",
                    "note": record.get("mapping_status") or record.get("confidence"),
                }],
                "payload": {
                    "work_id": work_id,
                    "generation_method": method_name,
                    "song_type_label": type_label,
                    "relation_status": "confirmed",
                    "rune_song_flag": True,
                    "rune_count": len(runes),
                    "runes": runes,
                    "created_date": record.get("created_date"),
                    "era_name": record.get("era_name") or work.get("era_name"),
                    "recommended_version": recommended,
                    "mapping_status": record.get("mapping_status") or record.get("status"),
                    "provenance_status": record.get("provenance_status"),
                },
            })

        output.sort(key=lambda item: (
            str(item.get("period") or ""),
            str(item.get("title") or ""),
        ))
        return output[:max(top_k, 12) if is_ow3gs else top_k]

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
        if wanted not in {"", "all", "text_work", "article", "text_record"}:
            return []

        scored: list[tuple[float, str, dict[str, Any]]] = []

        # Work-level catalogue results.
        for work in self.loc4.get("works", []):
            score = _text_score(query, [
                work.get("title"),
                work.get("summary"),
                " ".join(work.get("tags", [])),
                work.get("content_type"),
            ])
            if score >= 0.34:
                scored.append((score, "work", work))

        # Work-level LOC4 semantic analysis.
        for analysis in (getattr(self, "loc4_analysis", {}) or {}).get("analyses", []):
            score = _text_score(query, [
                analysis.get("title"),
                analysis.get("work_id"),
                analysis.get("analysis_status"),
                analysis.get("narrative_mode"),
                " ".join(analysis.get("named_keywords", [])),
                " ".join(analysis.get("themes", [])),
                " ".join(analysis.get("relationship_model", [])),
                analysis.get("start_state"),
                " ".join(analysis.get("turn_structure", [])),
                analysis.get("final_state"),
                " ".join(analysis.get("imagery", [])),
                " ".join(analysis.get("semantic_keywords", [])),
                " ".join(analysis.get("governance_signals", [])),
                analysis.get("period_relation"),
            ])
            if score >= 0.34:
                scored.append((score * 0.997, "analysis", analysis))

        # Chapter-level MoonSpeaker semantic/structure analysis.
        for chapter in (getattr(self, "loc4_moon_speaker_analysis", {}) or {}).get("chapters", []):
            score = _text_score(query, [
                chapter.get("title"),
                chapter.get("semantic_summary"),
                " ".join(str(x.get("label") or "") for x in chapter.get("themes", [])),
                " ".join(str(x.get("name") or "") for x in chapter.get("key_entities", [])),
                " ".join(chapter.get("title_signals", [])),
                chapter.get("part_name"),
            ])
            if score >= 0.34:
                scored.append((score * 0.992, "chapter", chapter))

        # Document-level authored full-text corpus.
        for doc in (getattr(self, "loc4_corpus", {}) or {}).get("documents", []):
            score = _text_score(query, [
                doc.get("title"),
                doc.get("section"),
                doc.get("text"),
                doc.get("retrieval_text"),
            ])
            if score >= 0.34:
                scored.append((score * 0.985, "document", doc))

        scored.sort(key=lambda row: (-row[0], str(row[2].get("id") or row[2].get("work_id") or "")))
        results = []
        seen: set[str] = set()
        for score, kind, item in scored:
            rid = str(item.get("id") or item.get("work_id") or "")
            if not rid or rid in seen:
                continue
            seen.add(rid)
            if kind == "work":
                results.append({
                    "result_id": item.get("work_id"),
                    "system_id": item.get("system_id") or "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": item.get("related_locs", []),
                    "content_type": "text_work",
                    "group": "textworks",
                    "title": item.get("title"),
                    "summary": item.get("summary"),
                    "score": round(score, 6),
                    "era_id": item.get("era_id"),
                    "period": item.get("period"),
                    "source_refs": item.get("source_refs", []),
                    "payload": item,
                })
            elif kind == "analysis":
                themes = item.get("themes", [])
                semantic_keywords = item.get("semantic_keywords", [])
                governance_signals = item.get("governance_signals", [])
                work = next(
                    (w for w in self.loc4.get("works", []) if w.get("work_id") == item.get("work_id")),
                    {}
                )
                source_refs = list(work.get("source_refs", []))
                first_chapter = next(
                    (ref for ref in source_refs if ref.get("role") == "first_chapter_or_prologue"),
                    None
                )
                music_refs = [
                    ref for ref in source_refs
                    if ref.get("source_type") == "suno_share"
                    or ref.get("role") in {
                        "theme_song", "related_song", "featured_song", "same_title_song",
                        "op", "proposal_song", "character_theme"
                    }
                ]
                summary_parts = []
                if themes:
                    summary_parts.append("主題：" + "、".join(themes[:8]))
                if item.get("start_state"):
                    summary_parts.append("起始：" + str(item.get("start_state")))
                if item.get("final_state"):
                    summary_parts.append("結果：" + str(item.get("final_state")))
                results.append({
                    "result_id": item.get("analysis_id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": item.get("related_locs", ["LOC6", "LOC7", "LOC8"]),
                    "content_type": "work_analysis",
                    "group": "textworks",
                    "title": f"作品解析｜{item.get('title')}",
                    "summary": "｜".join(summary_parts) or "LOC4 作品語意解析",
                    "score": round(score, 6),
                    "era_id": item.get("era_id"),
                    "period": item.get("period"),
                    "source_refs": [
                        {
                            "source_type": "loc4_text_analysis_registry",
                            "source_id": item.get("analysis_id"),
                            "note": "structured LOC4 work-level semantic analysis"
                        },
                        *source_refs,
                    ],
                    "payload": {
                        **item,
                        "work_catalog": {
                            "work_id": work.get("work_id"),
                            "title": work.get("title"),
                            "summary": work.get("summary"),
                            "chapter_count": work.get("chapter_count"),
                            "created_date": work.get("created_date"),
                            "period": work.get("period"),
                            "period_name": work.get("period_name"),
                            "era_id": work.get("era_id"),
                            "tags": work.get("tags", []),
                            "first_chapter_or_prologue": first_chapter,
                            "music_refs": music_refs,
                            "music_map": work.get("music_map"),
                            "relationship_refs": work.get("relationship_refs", []),
                        },
                        "analysis_view": {
                            "themes": themes,
                            "semantic_keywords": semantic_keywords,
                            "governance_signals": governance_signals,
                            "relationship_model": item.get("relationship_model", []),
                            "turn_structure": item.get("turn_structure", []),
                        },
                    },
                })
            elif kind == "chapter":
                themes = item.get("themes", [])
                results.append({
                    "result_id": item.get("chapter_id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": ["LOC1", "LOC6", "LOC7", "LOC8"],
                    "content_type": "text_work",
                    "group": "textworks",
                    "title": f"月語者｜{item.get('part_name')}｜{item.get('chapter_label')}｜{item.get('title')}",
                    "summary": item.get("semantic_summary") or "",
                    "score": round(score, 6),
                    "source_refs": [{
                        "source_type": "loc4_chapter_analysis",
                        "source_id": item.get("chapter_id"),
                        "note": "full-chapter deterministic semantic evidence"
                    }],
                    "payload": {
                        **item,
                        "matched_theme_labels": [row.get("label") for row in themes],
                    },
                })
            else:
                text = str(item.get("text") or "")
                results.append({
                    "result_id": item.get("id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": item.get("related_locs", ["LOC6", "LOC7", "LOC8"]),
                    "content_type": "text_work",
                    "group": "textworks",
                    "title": f"{item.get('title')}｜{item.get('section') or '正文'}｜片段 {item.get('segment')}",
                    "summary": text,
                    "score": round(score, 6),
                    "source_refs": [{
                        "source_type": item.get("source_type") or "author_library_text",
                        "source_id": item.get("source_file"),
                        "note": "author-owned LOC4 source corpus"
                    }],
                    "payload": item,
                })
            if len(results) >= top_k:
                break
        return results

    def _rune_literature_results(self, query: str, top_k: int, wanted: str) -> list[dict[str, Any]]:
        if wanted not in {"", "all", "text_record", "text_work", "rune_literature"}:
            return []
        scored = []
        for rune in self.rune_literature.get("runes", []):
            rune_name = rune.get("rune_name") or ""
            rune_number = rune.get("rune_number")
            for entry in rune.get("entries", []) or []:
                text = entry.get("text") or ""
                score = _text_score(query, [
                    rune_name,
                    rune_number,
                    entry.get("title"),
                    text,
                    entry.get("form"),
                    entry.get("source_platform"),
                    " ".join(entry.get("tags", []) or []),
                    entry.get("relation_note"),
                ])
                if score < 0.34:
                    continue
                scored.append((score, rune, entry))
        scored.sort(key=lambda row: (
            -row[0],
            str(row[2].get("date") or ""),
            str(row[2].get("entry_id") or ""),
        ))
        results = []
        for score, rune, entry in scored[:top_k]:
            payload = dict(entry)
            payload.update({
                "rune_id": rune.get("rune_id"),
                "rune_number": rune.get("rune_number"),
                "rune_name": rune.get("rune_name"),
                "rune_group": rune.get("group"),
            })
            results.append({
                "result_id": entry.get("entry_id"),
                "system_id": "lo3rwang",
                "primary_loc": "LOC4",
                "related_locs": ["LOC1", "LOC6", "LOC7", "LOC8"],
                "content_type": "rune_literature",
                "group": "textworks",
                "title": entry.get("title") or f"{rune.get('rune_name')}之文學｜{entry.get('form') or 'text'}",
                "summary": entry.get("text") or "",
                "score": round(score, 6),
                "source_refs": [{
                    "source_type": entry.get("source_platform") or "loc",
                    "source_id": entry.get("source_ref") or entry.get("entry_id"),
                    "note": "rune literature corpus",
                }],
                "payload": payload,
            })
        return results

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

    def _loc4_article_results(self, query: str, top_k: int, wanted: str, filters: dict[str, str] | None = None) -> list[dict[str, Any]]:
        filters = filters or {}
        if wanted not in {"", "all", "governance_article", "text_record"}:
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

        # Search the full LOC4-owned Threads main-post corpus when shards are available.
        # Falls back to the smaller article tranche only when full shards are absent.
        article_docs = self._loc4_article_documents()
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
                    "group": "loc4_articles",
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
                    "km_source": "LOC4_THREADS_FULL_CORPUS",
                    "evidence_role": "primary",
                }
                out.append({
                    "result_id": item.get("id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC4",
                    "related_locs": ["LOC6", "LOC7", "LOC8"],
                    "content_type": "text_record",
                    "group": "loc4_articles",
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

        # Raw Threads source text is LOC4-owned and is searched through
        # _loc4_article_results(). LOC6 governance results intentionally contain
        # derived governance/style records only.

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
            for asset in self.knowledge_assets.get("assets", []):
                if asset.get("primary_loc") != "LOC6" or asset.get("content_type") != "governance_article":
                    continue
                items.append({
                    "result_id": asset.get("asset_id"),
                    "system_id": "lo3rwang",
                    "primary_loc": "LOC6",
                    "related_locs": asset.get("related_locs", ["LOC4", "LOC7", "LOC8"]),
                    "content_type": "governance_article",
                    "group": "governance",
                    "title": asset.get("title"),
                    "summary": asset.get("public_summary") or asset.get("notes") or asset.get("role") or "",
                    "source_refs": [{"source_type": asset.get("source_type"), "source_id": asset.get("path"), "note": asset.get("authority_level")}],
                    "payload": asset,
                })

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
        if item.get("primary_loc") or "registry" in haystack or "spreadsheet" in haystack or "knowledge" in haystack:
            return "loc"
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


    @staticmethod
    def _graph_evidence_weight(evidence_kind: str) -> float:
        weights = {
            "authority_registry": 1.00,
            "explicit_registry_relation": 1.00,
            "deterministic_structural_evidence": 0.98,
            "record_metadata": 0.95,
            "registry_structure": 0.90,
            "loc8_event_snapshot": 0.86,
            "loc8_daily_rune_snapshot": 0.86,
            "result_metadata": 0.80,
            "semantic_inference": 0.55,
        }
        return weights.get(str(evidence_kind or "").strip(), 0.70)

    @staticmethod
    def _graph_status_weight(evidence_status: str) -> float:
        weights = {
            "canonical": 1.00,
            "confirmed": 1.00,
            "recorded": 1.00,
            "deterministic": 1.00,
            "exact": 1.00,
            "registry": 0.96,
            "estimated": 0.82,
            "provisional": 0.68,
            "candidate": 0.60,
            "inferred": 0.55,
            "unknown": 0.50,
        }
        return weights.get(str(evidence_status or "").strip().lower(), 0.75)

    @staticmethod
    def _graph_relation_weight(relation_type: str) -> float:
        weights = {
            "owned_by_loc": 1.00,
            "belongs_to_era": 1.00,
            "temporal_before": 0.98,
            "temporal_after": 0.98,
            "source_of": 0.96,
            "derived_from": 0.94,
            "expanded_to": 0.92,
            "represented_by": 0.92,
            "adapted_to": 0.90,
            "analyzed_by": 0.88,
            "references": 0.86,
            "has_lot": 0.86,
            "related_to": 0.78,
        }
        return weights.get(str(relation_type or "").strip(), 0.75)

    @classmethod
    def _graph_edge_quality(
        cls,
        relation_type: str,
        evidence_kind: str,
        evidence_status: str = "recorded",
    ) -> float:
        score = (
            cls._graph_evidence_weight(evidence_kind)
            * cls._graph_status_weight(evidence_status)
            * cls._graph_relation_weight(relation_type)
        )
        return round(max(0.0, min(1.0, score)), 4)

    @staticmethod
    def _graph_quality_band(score: float) -> str:
        if score >= 0.90:
            return "high"
        if score >= 0.72:
            return "medium"
        return "low"

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
            quality = self._graph_edge_quality(relation_type, evidence_kind, evidence_status)
            edges[eid] = {
                "edge_id": eid,
                "source": sid,
                "target": tid,
                "relation_type": relation_type,
                "summary": summary,
                "evidence_kind": evidence_kind,
                "evidence_status": evidence_status,
                "edge_quality": quality,
                "quality_band": self._graph_quality_band(quality),
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

        # Canonical graph edges already carry quality. Search-time transient
        # metadata edges are scored by the same governance policy.
        for edge in edges:
            if "edge_quality" not in edge:
                quality = self._graph_edge_quality(
                    str(edge.get("relation_type") or ""),
                    str(edge.get("evidence_kind") or ""),
                    str(edge.get("evidence_status") or "recorded"),
                )
                edge["edge_quality"] = quality
                edge["quality_band"] = self._graph_quality_band(quality)

        # Seed selection is precision-first. When the query has a strong
        # canonical/exact hit, do not let every low-relevance retrieval result
        # become a graph seed; that causes unrelated LOC/ERA over-traversal.
        q = _compact(query)
        strong_seed_ids: set[str] = set()
        exclusive_seed_ids: set[str] = set()

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
            object_type = str(node.get("object_type") or "")
            strong = False
            exclusive = False
            if q:
                if _compact(node.get("id") or "") == q or period == q or label == q:
                    strong = True
                elif node_type in {"life_event", "era", "rune", "work"} and len(q) >= 2:
                    strong = label.startswith(q) or (len(q) >= 3 and q in label)

                # Only named/historical entities monopolize the seed set.
                # Generic governance concepts (e.g. 自我治理) must still keep
                # cross-LOC retrieval seeds so LOC6/LOC7 evidence survives.
                if strong:
                    if node_type == "era" and period == q:
                        exclusive = True
                    elif node_type == "life_event" and object_type in {"system", "work"}:
                        exclusive = True
                    elif node_type == "rune" and label == q:
                        exclusive = True

            if strong:
                strong_seed_ids.add(node_id)
            if exclusive:
                exclusive_seed_ids.add(node_id)

        if exclusive_seed_ids:
            seed_ids.update(exclusive_seed_ids)
            # Exact retrieval aliases that name the same entity remain useful.
            for rid, item in result_by_id.items():
                if q and any(q == alias for alias in self._result_graph_aliases(item)):
                    seed_ids.add(rid)
        else:
            # Concept queries retain retrieval breadth, plus any canonical hits.
            seed_ids.update(result_by_id.keys())
            seed_ids.update(strong_seed_ids)

        adjacency: dict[str, list[dict[str, Any]]] = {}
        directional_relations = {"owned_by_loc", "belongs_to_era"}
        for edge in edges:
            source, target = str(edge.get("source") or ""), str(edge.get("target") or "")
            if not source or not target:
                continue
            adjacency.setdefault(source, []).append(edge)
            # Ownership and ERA membership are structural projections, not
            # reverse discovery channels. Treating them as bidirectional turns
            # LOC/ERA nodes into hubs that leak unrelated records into results.
            if str(edge.get("relation_type") or "") not in directional_relations:
                adjacency.setdefault(target, []).append(edge)

        visited = set(seed_ids)
        frontier = set(seed_ids)
        selected_edge_ids: set[str] = set()
        levels: dict[str, int] = {sid: 0 for sid in seed_ids}
        node_path_scores: dict[str, float] = {sid: 1.0 for sid in seed_ids}
        edge_traversal_scores: dict[str, float] = {}
        min_traversal_score = float((self.graph_schema.get("quality_policy") or {}).get("min_traversal_score") or 0.25)
        hop_decay = float((self.graph_schema.get("quality_policy") or {}).get("hop_decay") or 0.88)

        for level in range(1, max(1, min(depth, 3)) + 1):
            nxt: set[str] = set()
            ordered_frontier = sorted(frontier, key=lambda nid: (-node_path_scores.get(nid, 0.0), nid))
            for nid in ordered_frontier:
                candidate_edges = sorted(
                    adjacency.get(nid, []),
                    key=lambda edge: (-float(edge.get("edge_quality") or 0.0), str(edge.get("edge_id") or "")),
                )
                for edge in candidate_edges:
                    eid = str(edge.get("edge_id") or "")
                    other = str(edge.get("target") if str(edge.get("source")) == nid else edge.get("source"))
                    if not eid or not other:
                        continue
                    parent_score = node_path_scores.get(nid, 1.0)
                    traversal_score = round(
                        parent_score * float(edge.get("edge_quality") or 0.0) * (hop_decay ** max(0, level - 1)),
                        4,
                    )
                    if traversal_score < min_traversal_score:
                        continue
                    edge_traversal_scores[eid] = max(edge_traversal_scores.get(eid, 0.0), traversal_score)
                    selected_edge_ids.add(eid)
                    if traversal_score > node_path_scores.get(other, 0.0):
                        node_path_scores[other] = traversal_score
                    if other not in visited:
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

        selected_edges = []
        for edge in edges:
            eid = str(edge.get("edge_id") or "")
            if eid not in selected_edge_ids:
                continue
            row = dict(edge)
            row["traversal_score"] = edge_traversal_scores.get(eid, 0.0)
            selected_edges.append(row)
        selected_edges.sort(key=lambda edge: (-float(edge.get("traversal_score") or 0.0), str(edge.get("edge_id") or "")))
        selected_edges = selected_edges[:limit]
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
                "evidence_status": edge.get("evidence_status"),
                "edge_quality": edge.get("edge_quality"),
                "quality_band": edge.get("quality_band"),
                "traversal_score": edge.get("traversal_score"),
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
            "quality": {
                "min_traversal_score": min_traversal_score,
                "hop_decay": hop_decay,
                "high_quality_edges": sum(1 for edge in selected_edges if edge.get("quality_band") == "high"),
                "medium_quality_edges": sum(1 for edge in selected_edges if edge.get("quality_band") == "medium"),
                "low_quality_edges": sum(1 for edge in selected_edges if edge.get("quality_band") == "low"),
                "mean_edge_quality": round(
                    sum(float(edge.get("edge_quality") or 0.0) for edge in selected_edges) / len(selected_edges),
                    4,
                ) if selected_edges else 0.0,
            },
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
        """Expose graph metadata or one bounded governed neighborhood.

        Public callers must never receive the whole canonical graph as a bulk
        export merely by omitting node_id. The uncentered response is metadata
        only; actual graph data requires a bounded center node.
        """
        graph = self._canonical_graph()
        if not node_id:
            node_types: dict[str, int] = {}
            edge_types: dict[str, int] = {}
            for node in graph.get("nodes", []) or []:
                key = str(node.get("type") or "unknown")
                node_types[key] = node_types.get(key, 0) + 1
            for edge in graph.get("edges", []) or []:
                key = str(edge.get("type") or edge.get("relation_type") or "unknown")
                edge_types[key] = edge_types.get(key, 0) + 1
            return {
                "mode": "graph_metadata",
                "nodes": [],
                "edges": [],
                "node_count": graph.get("node_count", 0),
                "edge_count": graph.get("edge_count", 0),
                "node_types": node_types,
                "edge_types": edge_types,
                "bulk_export": False,
                "requires_node_id": True,
                "public_access_policy": "bounded_neighborhood_only",
            }

        nodes = {str(node.get("id")): node for node in graph.get("nodes", [])}
        edges = graph.get("edges", [])
        if node_id not in nodes:
            return {
                "mode": "graph_neighborhood",
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
            "mode": "graph_neighborhood",
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
        quality = graph.get("quality") or {}
        mean_edge_quality = float(quality.get("mean_edge_quality") or 0.0)
        high_quality_edges = int(quality.get("high_quality_edges") or 0)

        if strong_groups >= 2 and graph_edges >= 2 and mean_edge_quality >= 0.80:
            level = "high"
        elif (evidence_groups >= 2 or graph_edges >= 1) and mean_edge_quality >= 0.60:
            level = "medium"
        else:
            level = "limited"
        return {
            "level": level,
            "evidence_group_count": evidence_groups,
            "strong_group_count": strong_groups,
            "graph_edge_count": graph_edges,
            "mean_edge_quality": mean_edge_quality,
            "high_quality_edge_count": high_quality_edges,
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
            "loc4_articles": 2,
            "works": 1,
            "textworks": 1,
            "media": 1,
            "runes": 1,
            "oracle": 1,
            "entities": 8,
            "scenarios": 6,
            "readings": 4,
            "rune_songs": 3,
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
            "loc4_articles": "Threads／LOC6 文章",
            "works": "歌曲／歌詞",
            "textworks": "文字作品",
            "media": "多媒體",
            "runes": "月符",
            "oracle": "籤詩",
            "entities": "核心詞條",
            "scenarios": "LOC2 情境事件",
            "readings": "OW3gs 解牌／抽牌紀錄",
            "rune_songs": "符文歌曲",
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
                "quality": graph.get("quality", {}),
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
        graph_quality_bands: dict[str, int] = {}
        for edge in graph.get("edges", []) or []:
            kind = str(edge.get("evidence_kind") or "unspecified")
            status = str(edge.get("evidence_status") or "unspecified")
            band = str(edge.get("quality_band") or "unspecified")
            graph_evidence[kind] = graph_evidence.get(kind, 0) + 1
            graph_status[status] = graph_status.get(status, 0) + 1
            graph_quality_bands[band] = graph_quality_bands.get(band, 0) + 1

        return {
            "source_ref_count": len(refs),
            "source_refs": refs[:100],
            "result_sources": result_sources[:50],
            "graph_evidence_kinds": graph_evidence,
            "graph_evidence_status": graph_status,
            "graph_quality_bands": graph_quality_bands,
            "graph_quality": graph.get("quality", {}),
            "graph_policy": "semantic similarity selects seeds; governed edge quality controls traversal priority and minimum path score",
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
            scenarios = self._loc2_scenario_results(query, top_k, effective_wanted)
            music, linked_media = self._music_keyword_results(oracle_terms, top_k, effective_wanted, filters)
            textworks, direct_media, documents, eras = self._keyword_cross_results(oracle_terms, top_k, effective_wanted)
            rune_literature = self._rune_literature_results(query, top_k, effective_wanted)
            textworks = [*textworks, *rune_literature][:top_k]
            media_by_id = {}
            for item in [*direct_media, *linked_media]:
                media_by_id[item.get("result_id")] = item
            media = list(media_by_id.values())[:top_k]
            relationships = []
            governance = self._governance_results(query, top_k, effective_wanted)
            loc4_articles = self._loc4_article_results(query, top_k, effective_wanted, filters)
            runes = self._rune_results(oracle[0]["payload"].get("rune_name", ""), top_k, effective_wanted)
        else:
            faq = self._faq_results(query, top_k, wanted)
            scenarios = self._loc2_scenario_results(query, top_k, wanted)
            documents = self._knowledge_asset_results(query, top_k, wanted)
            music, linked_media = self._music_results(query, top_k, wanted, filters)
            textworks = self._loc4_results(query, top_k, wanted)
            rune_literature = self._rune_literature_results(query, top_k, wanted)
            textworks = [*textworks, *rune_literature][:top_k]
            direct_media = self._media_registry_results(query, top_k, wanted)
            media_by_id = {}
            for item in [*direct_media, *linked_media]:
                media_by_id[item.get("result_id")] = item
            media = list(media_by_id.values())[:top_k]
            relationships = self._relationship_results(query, top_k, wanted)
            governance = self._governance_results(query, top_k, wanted)
            loc4_articles = self._loc4_article_results(query, top_k, wanted, filters)
            runes = self._rune_results(query, top_k, wanted)
            eras = self._era_results(query, top_k, wanted)

        entities = self._entity_results(query, wanted)
        readings = self._ow3gs_reading_results(query, top_k, wanted)
        rune_songs = self._rune_song_results(query, top_k, wanted)

        groups = {
            "entities": entities,
            "scenarios": scenarios,
            "oracle": oracle,
            "readings": readings,
            "runes": runes,
            "rune_songs": rune_songs,
            "works": music,
            "textworks": textworks,
            "relationships": relationships,
            "governance": governance,
            "loc4_articles": loc4_articles,
            "media": media,
            "knowledge": [*documents, *faq],
            "timeline": eras,
        }
        groups = self._apply_common_filters(groups, filters)
        graph = self._graph_enrichment(query, groups)
        synthesis = self._synthesize_search(query, groups, graph)
        provenance = self._provenance_summary(groups, graph)

        # Search/index/Graph may use authorized full text internally, but the
        # public response boundary must obey content display governance.
        groups = self._apply_public_display_policies(groups, query)

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
                "LOC2": f"scenario-event-search-live; {len(self.loc2_events.get('records', []) or [])} scenario events",
                "LOC3": "live",
                "LOC4": f"creative-works+life-writing-live; {len((getattr(self, 'loc4_corpus', {}) or {}).get('documents', []))} authored corpus segments; {len((getattr(self, 'loc4_moon_speaker_analysis', {}) or {}).get('chapters', []))} MoonSpeaker chapter analyses",
                "LOC5": "direct-media-registry-search-live",
                "LOC6": "governance/style-derived-search-live",
                "LOC4_threads_indexed": len(self._loc4_article_documents()),
                "LOC7": "live",
                "LOC8": "era+context-graph-live",
            },
        }
