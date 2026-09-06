from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARD_API = ROOT / "card_api"
if str(CARD_API) not in sys.path:
    sys.path.insert(0, str(CARD_API))

from faq_rag import FAQSearchEngine
from loc3_search import LOC3SearchEngine
from unified_search import UnifiedSearchEngine
from paths import core_json, registry_json, search_json


def build_engine() -> UnifiedSearchEngine:
    faq = FAQSearchEngine(search_json("faq", "LOC_FAQ_RAG_v0.4.json"))
    loc3 = LOC3SearchEngine(search_json("loc3", "LOC3_LYRICS_SEARCH_v0.1.json"))
    runes = json.loads(core_json("runes64.json").read_text(encoding="utf-8")).get("runes", [])
    return UnifiedSearchEngine(faq_searcher=faq, loc3_searcher=loc3, runes=runes, repo_root=ROOT)


def validate_result(engine: UnifiedSearchEngine, query: str) -> dict:
    result = engine.search(query, top_k=8)
    failures: list[str] = []

    if result.get("system_id") != "lo3rwang":
        failures.append("system_id")
    if result.get("retrieval_mode") not in {"graph_enriched", "oracle_keyword_graph_enriched"}:
        failures.append("retrieval_mode")

    groups = result.get("groups")
    if not isinstance(groups, dict) or not groups:
        failures.append("groups")

    graph = result.get("graph") or {}
    if graph.get("mode") != "canonical_graph_rag":
        failures.append("graph.mode")
    quality = graph.get("quality") or {}
    for key in ("min_traversal_score", "hop_decay", "mean_edge_quality"):
        if key not in quality:
            failures.append(f"graph.quality.{key}")

    min_score = float(quality.get("min_traversal_score") or 0.0)
    for edge in graph.get("edges", []) or []:
        if "edge_quality" not in edge:
            failures.append(f"edge_quality:{edge.get('edge_id')}")
        if "quality_band" not in edge:
            failures.append(f"quality_band:{edge.get('edge_id')}")
        if float(edge.get("traversal_score") or 0.0) < min_score:
            failures.append(f"traversal_score:{edge.get('edge_id')}")

    provenance = result.get("provenance") or {}
    for key in ("graph_evidence_kinds", "graph_evidence_status", "graph_quality_bands", "graph_quality"):
        if key not in provenance:
            failures.append(f"provenance.{key}")

    synthesis = result.get("synthesis")
    if result.get("total_count", 0) > 0:
        if not synthesis:
            failures.append("synthesis")
        else:
            confidence = synthesis.get("confidence") or {}
            if "mean_edge_quality" not in confidence:
                failures.append("synthesis.confidence.mean_edge_quality")
            if "quality" not in (synthesis.get("graph") or {}):
                failures.append("synthesis.graph.quality")

    return {
        "query": query,
        "pass": not failures,
        "failures": failures,
        "total_count": result.get("total_count", 0),
        "graph_node_count": graph.get("node_count", 0),
        "graph_edge_count": graph.get("edge_count", 0),
        "mean_edge_quality": quality.get("mean_edge_quality", 0.0),
    }


def validate_graph_snapshot(engine: UnifiedSearchEngine) -> dict:
    metadata = engine.graph_snapshot()
    failures = []
    if metadata.get("mode") != "graph_metadata":
        failures.append("metadata.mode")
    if metadata.get("nodes") != [] or metadata.get("edges") != []:
        failures.append("metadata.bulk_payload")
    if metadata.get("bulk_export") is not False:
        failures.append("metadata.bulk_export")
    if not metadata.get("requires_node_id"):
        failures.append("metadata.requires_node_id")
    if int(metadata.get("node_count") or 0) <= 0:
        failures.append("metadata.node_count")
    if int(metadata.get("edge_count") or 0) <= 0:
        failures.append("metadata.edge_count")

    graph = engine._canonical_graph()
    center = next((str(node.get("id")) for node in graph.get("nodes", []) if node.get("id")), "")
    neighborhood = engine.graph_snapshot(center, depth=2) if center else {}
    if center:
        if neighborhood.get("mode") != "graph_neighborhood":
            failures.append("neighborhood.mode")
        if not neighborhood.get("nodes"):
            failures.append("neighborhood.nodes")
        for edge in neighborhood.get("edges", []) or []:
            if "edge_quality" not in edge or "quality_band" not in edge:
                failures.append(f"edge_contract:{edge.get('edge_id')}")
                break

    return {
        "pass": not failures,
        "failures": failures,
        "node_count": metadata.get("node_count", 0),
        "edge_count": metadata.get("edge_count", 0),
        "center": center,
        "neighborhood_node_count": neighborhood.get("node_count", 0) if center else 0,
        "neighborhood_edge_count": neighborhood.get("edge_count", 0) if center else 0,
    }


def main() -> int:
    engine = build_engine()
    queries = ["自我治理", "Luna Codex", "月語者", "心半正", "P8"]
    query_results = [validate_result(engine, query) for query in queries]
    snapshot = validate_graph_snapshot(engine)

    schema = json.loads(registry_json("LOC_GRAPH_SCHEMA.json").read_text(encoding="utf-8"))
    schema_ok = schema.get("schema_version") == "0.4" and bool(schema.get("quality_policy"))

    passed = all(row["pass"] for row in query_results) and snapshot["pass"] and schema_ok
    summary = {
        "suite": "LOC_SEARCH_CORE_INTEGRATION",
        "pass": passed,
        "schema_version": schema.get("schema_version"),
        "schema_quality_policy": schema_ok,
        "queries": query_results,
        "graph_snapshot": snapshot,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
