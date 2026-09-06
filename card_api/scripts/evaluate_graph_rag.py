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


def build_engine() -> UnifiedSearchEngine:
    faq = FAQSearchEngine(CARD_API / "data" / "LOC_FAQ_RAG_v0.4.json")
    loc3 = LOC3SearchEngine(CARD_API / "data" / "LOC3_LYRICS_SEARCH_v0.1.json")
    runes = json.loads((CARD_API / "new_runes.json").read_text(encoding="utf-8")).get("runes", [])
    return UnifiedSearchEngine(faq_searcher=faq, loc3_searcher=loc3, runes=runes, repo_root=ROOT)


def evaluate_case(engine: UnifiedSearchEngine, case: dict) -> dict:
    result = engine.search(case["query"], top_k=8)
    graph = result.get("graph") or {}
    node_ids = {str(node.get("id")) for node in graph.get("nodes", []) if node.get("id")}
    locs = set(graph.get("loc_path") or [])
    eras = {str(row.get("era_id")) for row in graph.get("era_path", []) if row.get("era_id")}
    expected = case.get("expect") or {}

    checks = {}
    for field, actual in [
        ("nodes", node_ids),
        ("locs", locs),
        ("eras", eras),
    ]:
        wanted = set(expected.get(field) or [])
        checks[field] = {
            "expected": sorted(wanted),
            "found": sorted(wanted & actual),
            "missing": sorted(wanted - actual),
            "pass": wanted <= actual,
        }

    forbidden = set(expected.get("forbidden_nodes") or [])
    forbidden_found = forbidden & node_ids
    checks["forbidden_nodes"] = {
        "expected_absent": sorted(forbidden),
        "found": sorted(forbidden_found),
        "pass": not forbidden_found,
    }

    provenance = result.get("provenance") or {}
    checks["provenance"] = {
        "pass": bool(provenance.get("graph_policy")) and "graph_evidence_kinds" in provenance,
        "source_ref_count": provenance.get("source_ref_count", 0),
        "graph_evidence_kinds": provenance.get("graph_evidence_kinds", {}),
    }

    passed = all(item.get("pass") for item in checks.values())
    return {
        "id": case.get("id"),
        "query": case.get("query"),
        "pass": passed,
        "checks": checks,
        "graph": {
            "node_count": graph.get("node_count", 0),
            "edge_count": graph.get("edge_count", 0),
            "depth": graph.get("depth", 0),
        },
    }


def main() -> int:
    registry = json.loads((ROOT / "data" / "shared" / "LOC_GRAPH_EVAL_CASES.json").read_text(encoding="utf-8"))
    engine = build_engine()
    rows = [evaluate_case(engine, case) for case in registry.get("cases", [])]
    passed = sum(1 for row in rows if row["pass"])
    summary = {
        "registry": registry.get("registry"),
        "schema_version": registry.get("schema_version"),
        "case_count": len(rows),
        "passed": passed,
        "failed": len(rows) - passed,
        "pass_rate": round(passed / len(rows), 4) if rows else 0.0,
        "results": rows,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if passed == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
