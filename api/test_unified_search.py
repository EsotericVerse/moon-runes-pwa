import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from unified_search import UnifiedSearchEngine


class FakeResult:
    def __init__(self, payload):
        self.payload = payload

    def as_dict(self):
        return self.payload


class FakeFAQ:
    def search(self, query, top_k=5):
        return [FakeResult({
            "id": "FAQ-X",
            "question": "自我治理是什麼？",
            "answer": "整理、選擇、界線與航向管理。",
            "score": 0.8,
            "source_refs": ["test"],
        })]


class FakeLOC3:
    def search(self, query, top_k=8, filters=None):
        return [FakeResult({
            "work_id": "LW0001",
            "title": "治理自己的日子",
            "summary": "自由之後重新整理生活。",
            "score": 0.6,
            "system_id": "lo3rwang",
            "related_locs": ["LOC5", "LOC6", "LOC7", "LOC8"],
            "era_id": "ERA-P8",
            "period": "P8",
            "recommended_version": {
                "song_id": "song-1",
                "suno_url": "https://example.invalid/song",
                "media_id": "MEDIA-0001",
                "media_type": "instagram_reels_preview",
                "ig_preview_url": "https://example.invalid/reel",
                "media_source_refs": [],
            },
        })]


class UnifiedSearchTests(unittest.TestCase):
    def make_engine(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        (root / "data" / "json" / "registries").mkdir(parents=True)
        (root / "data" / "json" / "registries" / "LOC_ERA_REGISTRY.json").write_text(
            '{"language_system_id":"lo3rwang","eras":[{"era_id":"ERA-P8","period":"P8","order":8,"name":"自我治理與未來展望期","display_label":"P8｜自我治理與未來展望期","description":"自我治理","status":"current","source_event_id":"EV-ERA-P8"}]}',
            encoding="utf-8",
        )
        (root / "data" / "json" / "registries" / "LOC_CONTENT_TYPE_REGISTRY.json").write_text(
            '{"types":[{"id":"lyrics_work","primary_loc":"LOC3"}]}',
            encoding="utf-8",
        )
        (root / "data" / "json" / "registries" / "LOC8_EVENT_SNAPSHOT.json").write_text(
            '{"role":"non-authoritative frontend fallback snapshot","events":[{"id":"EV-TEST","date":"2026-09-01","event_type":"transition","title":"進入自我治理","era":"P8 自我治理與未來展望期","confidence":"recorded","source":"test-event"}]}',
            encoding="utf-8",
        )
        (root / "data" / "json" / "registries" / "LOC8_DAILY_RUNE_SNAPSHOT.json").write_text(
            '{"role":"non-authoritative frontend fallback snapshot","daily_draws":[{"id":"DD-TEST","date":"2026-09-01","rune_id":"1","rune":"心","direction":"半正位","era_id":"ERA-P8","confidence":"recorded","source":"test-draw"}]}',
            encoding="utf-8",
        )
        return UnifiedSearchEngine(
            faq_searcher=FakeFAQ(),
            loc3_searcher=FakeLOC3(),
            runes=[{"編號": 1, "名稱": "心", "關鍵詞": "自我 治理"}],
            repo_root=root,
        )

    def test_all_sources_share_one_envelope(self):
        result = self.make_engine().search("自我治理", top_k=5)
        self.assertEqual(result["system_id"], "lo3rwang")
        self.assertEqual(len(result["groups"]["works"]), 1)
        self.assertEqual(len(result["groups"]["media"]), 1)
        self.assertEqual(len(result["groups"]["knowledge"]), 1)
        self.assertEqual(len(result["groups"]["timeline"]), 1)
        self.assertEqual(result["groups"]["works"][0]["primary_loc"], "LOC3")
        self.assertEqual(result["groups"]["media"][0]["primary_loc"], "LOC5")

    def test_content_type_filter_does_not_merge_ownership(self):
        result = self.make_engine().search("自我治理", content_type="faq")
        self.assertEqual(len(result["groups"]["knowledge"]), 1)
        self.assertEqual(len(result["groups"]["works"]), 0)
        self.assertEqual(result["groups"]["knowledge"][0]["primary_loc"], "LOC7")


    def test_loc8_temporal_snapshots_enter_canonical_graph_without_live_private_relations(self):
        graph = self.make_engine()._canonical_graph()
        node_ids = {node["id"] for node in graph["nodes"]}
        edge_kinds = {edge.get("evidence_kind") for edge in graph["edges"]}
        self.assertIn("EV-TEST", node_ids)
        self.assertIn("DD-TEST", node_ids)
        self.assertIn("RUNE-1", node_ids)
        self.assertIn("loc8_event_snapshot", edge_kinds)
        self.assertIn("loc8_daily_rune_snapshot", edge_kinds)

    def test_search_returns_provenance_envelope(self):
        result = self.make_engine().search("自我治理", top_k=5)
        provenance = result["provenance"]
        self.assertIn("graph_evidence_kinds", provenance)
        self.assertIn("loc8_live_relation_policy", provenance)
        self.assertGreaterEqual(provenance["source_ref_count"], 1)


    def test_graph_quality_weights_are_deterministic(self):
        engine = self.make_engine()
        self.assertEqual(
            engine._graph_edge_quality("owned_by_loc", "authority_registry", "recorded"),
            1.0,
        )
        self.assertLess(
            engine._graph_edge_quality("related_to", "semantic_inference", "inferred"),
            0.30,
        )

    def test_search_graph_exposes_quality_contract(self):
        result = self.make_engine().search("自我治理", top_k=5)
        graph = result["graph"]
        self.assertIn("quality", graph)
        self.assertIn("mean_edge_quality", graph["quality"])
        self.assertGreaterEqual(graph["quality"]["mean_edge_quality"], 0.0)
        for edge in graph["edges"]:
            self.assertIn("edge_quality", edge)
            self.assertIn("quality_band", edge)
            self.assertIn("traversal_score", edge)
            self.assertGreaterEqual(edge["traversal_score"], graph["quality"]["min_traversal_score"])

        provenance = result["provenance"]
        self.assertIn("graph_quality_bands", provenance)
        self.assertIn("graph_quality", provenance)


    def test_graph_snapshot_without_center_is_metadata_only(self):
        engine = self.make_engine()
        snapshot = engine.graph_snapshot()
        self.assertEqual("graph_metadata", snapshot["mode"])
        self.assertEqual([], snapshot["nodes"])
        self.assertEqual([], snapshot["edges"])
        self.assertFalse(snapshot["bulk_export"])
        self.assertTrue(snapshot["requires_node_id"])
        self.assertGreater(snapshot["node_count"], 0)

    def test_graph_snapshot_with_center_is_bounded_neighborhood(self):
        engine = self.make_engine()
        snapshot = engine.graph_snapshot("ERA-P8", depth=1)
        self.assertEqual("graph_neighborhood", snapshot["mode"])
        self.assertEqual("ERA-P8", snapshot["center"])
        self.assertGreaterEqual(snapshot["node_count"], 1)
        self.assertTrue(all(
            edge.get("source") == "ERA-P8" or edge.get("target") == "ERA-P8"
            for edge in snapshot["edges"]
        ))

    def test_synthesis_confidence_uses_graph_quality(self):
        result = self.make_engine().search("自我治理", top_k=5)
        synthesis = result["synthesis"]
        self.assertIsNotNone(synthesis)
        self.assertIn("mean_edge_quality", synthesis["confidence"])
        self.assertIn("quality", synthesis["graph"])


if __name__ == "__main__":
    unittest.main()
