from __future__ import annotations

import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Any


class LOCGraph:
    """Derived graph over governed LOC Scope/Feature registries.

    Nodes/edges are references. This graph never replaces canonical ownership.
    Only explicit registry evidence or deterministic structural evidence is used.
    Historical LOC1–8 lineage may remain as provenance, never as Current ownership.
    """

    def __init__(self, repo_root: Path, runes: list[dict[str, Any]] | None = None, loc3_searcher: Any = None):
        self.repo_root = repo_root
        self.registry_root = repo_root / "data" / "json" / "registries"
        self.core_root = repo_root / "data" / "json" / "core"
        self.runes = runes or []
        self.loc3_searcher = loc3_searcher
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: list[dict[str, Any]] = []
        self._out: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._in: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._build()

    def _load_registry(self, name: str) -> dict[str, Any]:
        p = self.registry_root / name
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _load_core(self, name: str) -> dict[str, Any]:
        p = self.core_root / name
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _node(self, node_id: str, node_type: str, title: str, scope_id: str, **extra: Any) -> None:
        if not node_id:
            return
        current = self.nodes.get(node_id, {})
        payload = {
            "node_id": node_id,
            "node_type": node_type,
            "title": title or node_id,
            "scope_id": scope_id,
            **extra,
        }
        self.nodes[node_id] = {**current, **{k: v for k, v in payload.items() if v not in (None, "", [])}}

    def _edge(self, source: str, target: str, relation: str, evidence: str, **extra: Any) -> None:
        if not source or not target or source == target:
            return
        edge_id = f"{source}::{relation}::{target}"
        if any(e.get("edge_id") == edge_id for e in self.edges):
            return
        edge = {
            "edge_id": edge_id,
            "source": source,
            "target": target,
            "relation": relation,
            "evidence": evidence,
            **extra,
        }
        self.edges.append(edge)
        self._out[source].append(edge)
        self._in[target].append(edge)

    @staticmethod
    def _rune_name(row: dict[str, Any]) -> str:
        return str(row.get("名稱") or row.get("符文名稱") or row.get("name") or "")

    def _build(self) -> None:
        # Current Scope nodes. Features may consume these records without owning them.
        self._node("scope:loc", "scope", "LOC", "loc")
        self._node("scope:lunarunes", "scope", "LunaRunes / 月之符文", "lunarunes")
        self._node("scope:lo3rwang", "scope", "lo3rwang", "lo3rwang")

        # LunaRunes runes + Lots.
        lots = self._load_core("lots.json")
        lots_by_name = {x.get("名稱"): x for x in lots.get("items", [])}
        for idx, rune in enumerate(self.runes, start=1):
            num = rune.get("編號") or idx
            name = self._rune_name(rune)
            rid = f"RUNE-{num}"
            self._node(rid, "rune", f"{num} · {name}", "lunarunes", rune_name=name)
            self._edge(rid, "scope:lunarunes", "belongs_to_scope", "LunaRunes Current authority")
            lot = lots_by_name.get(name) or {}
            for direction, domain_map in (lot.get("方向") or {}).items():
                for domain, text in (domain_map or {}).items():
                    lid = f"LOT-{num}-{direction}-{domain}"
                    self._node(lid, "lot", f"{name} · {direction} · {domain}", "lunarunes", summary=text)
                    self._edge(rid, lid, "has_lot", "data/json/core/lots.json")

        # Context scenario events.
        events = self._load_registry("CONTEXT_EVENT_REGISTRY.json")
        for item in events.get("events", []) or events.get("records", []):
            eid_raw = item.get("event_id") or item.get("id")
            if not eid_raw:
                continue
            eid = str(eid_raw)
            self._node(eid, "scenario_event", item.get("title") or eid, str(item.get("scope_id") or "loc"), summary=item.get("description"))
            self._edge(eid, "scope:loc", "available_to_feature", "CONTEXT_EVENT_REGISTRY")

        # Music works in lo3rwang Scope.
        for work in getattr(self.loc3_searcher, "works", []) or []:
            wid = str(work.get("work_id") or "")
            if not wid:
                continue
            self._node(wid, "music_work", work.get("title") or wid, "lo3rwang", era_id=work.get("era_id"), period=work.get("period"))
            self._edge(wid, "scope:lo3rwang", "belongs_to_scope", "Music indexed corpus")
            era_id = work.get("era_id")
            if era_id:
                self._edge(wid, era_id, "belongs_to_era", "Music work era metadata")
            draw_result = work.get("draw_result") or []
            if isinstance(draw_result, list):
                for card in draw_result:
                    if not isinstance(card, dict):
                        continue
                    rname = card.get("rune")
                    for idx, rune in enumerate(self.runes, start=1):
                        if self._rune_name(rune) == rname:
                            self._edge(f"RUNE-{rune.get('編號') or idx}", wid, "source_of", "preserved draw_result provenance")
                            break

        # Writing works in their governed source Scope; current personal corpus defaults to lo3rwang.
        writing = self._load_registry("WRITING_REGISTRY.json")
        for work in writing.get("works", []):
            wid = str(work.get("work_id") or work.get("id") or "")
            if not wid:
                continue
            scope_id = str(work.get("scope_id") or "lo3rwang")
            self._node(wid, "writing_work", work.get("title") or wid, scope_id, era_id=work.get("era_id"), summary=work.get("summary"))
            if scope_id == "lo3rwang":
                self._edge(wid, "scope:lo3rwang", "belongs_to_scope", "WRITING_REGISTRY")
            if work.get("era_id"):
                self._edge(wid, work.get("era_id"), "belongs_to_era", "Writing work era metadata")

        # Media registry; ownership comes from record Scope, not historical distribution number.
        media = self._load_registry("LOC_MEDIA_REGISTRY.json")
        for item in media.get("items", []):
            mid = str(item.get("media_id") or item.get("id") or "")
            if not mid:
                continue
            scope_id = str(item.get("scope_id") or "lo3rwang")
            self._node(mid, "media", item.get("title") or mid, scope_id)
            if scope_id == "lo3rwang":
                self._edge(mid, "scope:lo3rwang", "belongs_to_scope", "LOC_MEDIA_REGISTRY")
            for key in ("linked_work_id", "work_id", "linked_song_id"):
                target = item.get(key)
                if target:
                    self._edge(str(target), mid, "represented_by", f"LOC_MEDIA_REGISTRY.{key}")

        # lo3rwang governance fragments.
        gov = self._load_registry("LO3RWANG_GOVERNANCE_REGISTRY.json")
        for item in gov.get("fragments", []) or gov.get("records", []):
            gid = str(item.get("fragment_id") or item.get("id") or "")
            if not gid:
                continue
            self._node(gid, "governance_fragment", item.get("title") or item.get("text") or gid, "lo3rwang")
            self._edge(gid, "scope:lo3rwang", "belongs_to_scope", "LO3RWANG_GOVERNANCE_REGISTRY")

        # Knowledge assets keep their explicit Scope where available.
        knowledge = self._load_registry("LOC_KNOWLEDGE_ASSET_REGISTRY.json")
        for asset in knowledge.get("assets", []):
            aid = str(asset.get("asset_id") or "")
            if not aid:
                continue
            scope_id = str(asset.get("scope_id") or "loc")
            node_type = "image" if asset.get("content_type") == "knowledge_image" else "knowledge_asset"
            self._node(aid, node_type, asset.get("title") or aid, scope_id, path=asset.get("path"), role=asset.get("role"))

        # ERA records are governed by their own Scope.
        era_doc = self._load_registry("LOC_ERA_REGISTRY.json")
        eras = sorted(era_doc.get("eras", []), key=lambda x: x.get("order", 999))
        prev_by_scope: dict[str, str] = {}
        for era in eras:
            eid = str(era.get("era_id") or "")
            if not eid:
                continue
            scope_id = str(era.get("scope_id") or "loc")
            self._node(eid, "era", era.get("display_label") or era.get("name") or eid, scope_id,
                       start_date=era.get("start_date"), end_date=era.get("end_date"))
            prev = prev_by_scope.get(scope_id)
            if prev:
                self._edge(prev, eid, "temporal_before", "ERA order")
                self._edge(eid, prev, "temporal_after", "ERA order")
            prev_by_scope[scope_id] = eid

        # Explicit cross-Scope relationships.
        rels = self._load_registry("LOC_CROSS_RELATIONSHIP_REGISTRY.json")
        for rel in rels.get("relationships", []):
            src = rel.get("source") or {}
            sid = str(src.get("work_ref") or src.get("id") or "")
            if sid and sid not in self.nodes:
                source_scope = str(src.get("scope_id") or "lo3rwang")
                self._node(sid, "knowledge_asset", src.get("title") or sid, source_scope)
            for target in rel.get("targets", []):
                tid = str(target.get("work_ref") or target.get("id") or "")
                if not tid:
                    continue
                if tid not in self.nodes:
                    target_scope = str(target.get("scope_id") or "lo3rwang")
                    self._node(tid, "knowledge_asset", target.get("title") or tid, target_scope)
                rtype = rel.get("relation_type") or "related_to"
                mapped = "expanded_to" if "expansion" in rtype else ("adapted_to" if "adapt" in rtype else "related_to")
                self._edge(sid, tid, mapped, rel.get("relationship_id") or "LOC_CROSS_RELATIONSHIP_REGISTRY",
                           relation_type=rtype, canonical_key=rel.get("canonical_key"))

    def expand(self, seed_ids: list[str], max_depth: int = 1, max_nodes: int = 40) -> dict[str, Any]:
        seeds = [s for s in dict.fromkeys(seed_ids) if s in self.nodes]
        seen = set(seeds)
        queue = deque((s, 0) for s in seeds)
        edge_ids: set[str] = set()
        paths: list[list[str]] = []

        while queue and len(seen) < max_nodes:
            node_id, depth = queue.popleft()
            if depth >= max_depth:
                continue
            incident = [*self._out.get(node_id, []), *self._in.get(node_id, [])]
            for edge in incident:
                other = edge["target"] if edge["source"] == node_id else edge["source"]
                edge_ids.add(edge["edge_id"])
                paths.append([node_id, edge["relation"], other])
                if other not in seen and len(seen) < max_nodes:
                    seen.add(other)
                    queue.append((other, depth + 1))

        return {
            "seed_ids": seeds,
            "depth": max_depth,
            "nodes": [self.nodes[n] for n in seen if n in self.nodes],
            "edges": [e for e in self.edges if e["edge_id"] in edge_ids],
            "paths": paths,
            "node_count": len(seen),
            "edge_count": len(edge_ids),
        }

    def stats(self) -> dict[str, Any]:
        by_type: dict[str, int] = defaultdict(int)
        by_relation: dict[str, int] = defaultdict(int)
        for node in self.nodes.values():
            by_type[node.get("node_type", "unknown")] += 1
        for edge in self.edges:
            by_relation[edge.get("relation", "unknown")] += 1
        return {
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "nodes_by_type": dict(sorted(by_type.items())),
            "edges_by_relation": dict(sorted(by_relation.items())),
        }
