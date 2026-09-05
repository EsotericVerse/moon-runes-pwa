from __future__ import annotations

import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Any


class LOCGraph:
    """Derived graph over authoritative LOC registries.

    Nodes/edges are references. This graph never replaces canonical ownership.
    Only explicit registry evidence or deterministic structural evidence is used.
    """

    def __init__(self, repo_root: Path, runes: list[dict[str, Any]] | None = None, loc3_searcher: Any = None):
        self.repo_root = repo_root
        self.shared_root = repo_root / "data" / "shared"
        self.runes = runes or []
        self.loc3_searcher = loc3_searcher
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: list[dict[str, Any]] = []
        self._out: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._in: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._build()

    def _load(self, name: str) -> dict[str, Any]:
        p = self.shared_root / name
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _node(self, node_id: str, node_type: str, title: str, primary_loc: str, **extra: Any) -> None:
        if not node_id:
            return
        current = self.nodes.get(node_id, {})
        payload = {
            "node_id": node_id,
            "node_type": node_type,
            "title": title or node_id,
            "primary_loc": primary_loc,
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
        # LOC domain nodes
        for i in range(1, 9):
            nid = f"LOC{i}"
            self._node(nid, "loc_domain", nid, nid)

        # LOC1 runes + Lots
        lots = self._load("lots.json")
        lots_by_name = {x.get("名稱"): x for x in lots.get("items", [])}
        for idx, rune in enumerate(self.runes, start=1):
            num = rune.get("編號") or idx
            name = self._rune_name(rune)
            rid = f"RUNE-{num}"
            self._node(rid, "rune", f"{num} · {name}", "LOC1", rune_name=name)
            self._edge(rid, "LOC1", "owned_by_loc", "rune source ownership")
            lot = lots_by_name.get(name) or {}
            for direction, domain_map in (lot.get("方向") or {}).items():
                for domain, text in (domain_map or {}).items():
                    lid = f"LOT-{num}-{direction}-{domain}"
                    self._node(lid, "lot", f"{name} · {direction} · {domain}", "LOC1", summary=text)
                    self._edge(rid, lid, "has_lot", "lots.json")

        # LOC2 scenario events
        loc2 = self._load("LOC2_EVENT_REGISTRY.json")
        for item in loc2.get("events", []):
            eid_raw = item.get("event_id") or item.get("id")
            if not eid_raw:
                continue
            eid = str(eid_raw)
            self._node(eid, "scenario_event", item.get("title") or eid, "LOC2", summary=item.get("description"))
            self._edge(eid, "LOC2", "owned_by_loc", "LOC2_EVENT_REGISTRY")

        # LOC3 works
        for work in getattr(self.loc3_searcher, "works", []) or []:
            wid = str(work.get("work_id") or "")
            if not wid:
                continue
            self._node(wid, "music_work", work.get("title") or wid, "LOC3", era_id=work.get("era_id"), period=work.get("period"))
            self._edge(wid, "LOC3", "owned_by_loc", "LOC3 indexed corpus")
            era_id = work.get("era_id")
            if era_id:
                self._edge(wid, era_id, "belongs_to_era", "LOC3 work era metadata")
            # Only preserved explicit draw provenance may create rune edges.
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

        # LOC4 writing
        loc4 = self._load("LOC4_WRITING_REGISTRY.json")
        for work in loc4.get("works", []):
            wid = str(work.get("work_id") or work.get("id") or "")
            if not wid:
                continue
            self._node(wid, "writing_work", work.get("title") or wid, "LOC4", era_id=work.get("era_id"), summary=work.get("summary"))
            self._edge(wid, "LOC4", "owned_by_loc", "LOC4_WRITING_REGISTRY")
            if work.get("era_id"):
                self._edge(wid, work.get("era_id"), "belongs_to_era", "LOC4 work era metadata")

        # LOC5 media
        media = self._load("LOC_MEDIA_REGISTRY.json")
        for item in media.get("items", []):
            mid = str(item.get("media_id") or item.get("id") or "")
            if not mid:
                continue
            self._node(mid, "media", item.get("title") or mid, "LOC5")
            self._edge(mid, "LOC5", "owned_by_loc", "LOC_MEDIA_REGISTRY")
            for key in ("linked_work_id", "work_id", "linked_song_id"):
                target = item.get(key)
                if target:
                    self._edge(str(target), mid, "represented_by", f"LOC_MEDIA_REGISTRY.{key}")

        # LOC6 governance fragments
        gov = self._load("LOC6_GOVERNANCE_REGISTRY.json")
        for item in gov.get("fragments", []) or gov.get("records", []):
            gid = str(item.get("fragment_id") or item.get("id") or "")
            if not gid:
                continue
            self._node(gid, "governance_fragment", item.get("title") or item.get("text") or gid, "LOC6")
            self._edge(gid, "LOC6", "owned_by_loc", "LOC6_GOVERNANCE_REGISTRY")

        # LOC7 knowledge assets
        knowledge = self._load("LOC_KNOWLEDGE_ASSET_REGISTRY.json")
        for asset in knowledge.get("assets", []):
            aid = str(asset.get("asset_id") or "")
            if not aid:
                continue
            ploc = asset.get("primary_loc") or "LOC7"
            self._node(aid, "knowledge_asset", asset.get("title") or aid, ploc, path=asset.get("path"))
            self._edge(aid, ploc, "owned_by_loc", "LOC_KNOWLEDGE_ASSET_REGISTRY")

        # LOC8 eras + deterministic temporal order
        era_doc = self._load("LOC_ERA_REGISTRY.json")
        eras = sorted(era_doc.get("eras", []), key=lambda x: x.get("order", 999))
        prev = None
        for era in eras:
            eid = str(era.get("era_id") or "")
            if not eid:
                continue
            self._node(eid, "era", era.get("display_label") or era.get("name") or eid, "LOC8",
                       start_date=era.get("start_date"), end_date=era.get("end_date"))
            self._edge(eid, "LOC8", "owned_by_loc", "LOC_ERA_REGISTRY")
            if prev:
                self._edge(prev, eid, "temporal_before", "ERA order")
                self._edge(eid, prev, "temporal_after", "ERA order")
            prev = eid

        # Explicit cross-LOC relationships
        rels = self._load("LOC_CROSS_RELATIONSHIP_REGISTRY.json")
        for rel in rels.get("relationships", []):
            src = rel.get("source") or {}
            sid = str(src.get("work_ref") or src.get("id") or "")
            if sid and sid not in self.nodes:
                self._node(sid, "music_work" if src.get("primary_loc") == "LOC3" else "knowledge_asset",
                           src.get("title") or sid, src.get("primary_loc") or "LOC7")
            for target in rel.get("targets", []):
                tid = str(target.get("work_ref") or target.get("id") or "")
                if not tid:
                    continue
                if tid not in self.nodes:
                    tloc = target.get("primary_loc") or "LOC7"
                    ttype = "writing_work" if tloc == "LOC4" else ("media" if tloc == "LOC5" else "knowledge_asset")
                    self._node(tid, ttype, target.get("title") or tid, tloc)
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
