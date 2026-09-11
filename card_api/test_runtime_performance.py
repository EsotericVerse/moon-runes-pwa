from __future__ import annotations

import unittest

import runtime_app


class RuntimePerformanceTests(unittest.TestCase):
    def test_runtime_exports_fastapi_app(self):
        self.assertIs(runtime_app.app, runtime_app.core.app)

    def test_canonical_graph_is_cached_per_process(self):
        searcher = runtime_app.core.get_unified_searcher()
        first = searcher._canonical_graph()
        second = searcher._canonical_graph()
        self.assertIs(first, second)
        self.assertGreaterEqual(int(first.get("node_count") or 0), 1)

    def test_gzip_middleware_is_installed(self):
        middleware_names = {item.cls.__name__ for item in runtime_app.app.user_middleware}
        self.assertIn("GZipMiddleware", middleware_names)

    def test_text_record_and_governance_article_share_article_cache(self):
        class FakeSearcher:
            def __init__(self):
                self.article_calls = 0

            def _canonical_graph(self):
                return {"nodes": [], "edges": [], "node_count": 0, "edge_count": 0}

            def _iter_loc4_article_documents(self):
                yield from ()

            def _loc4_article_results(self, query, top_k, wanted, filters=None):
                self.article_calls += 1
                return [{"result_id": "T1", "title": query, "score": 1.0}]

            def _knowledge_asset_results(self, query, top_k, wanted):
                return []

        searcher = FakeSearcher()
        runtime_app._install_unified_search_cache(searcher)
        first = searcher._loc4_article_results("治理", 5, "text_record", {"period": "P7"})
        second = searcher._loc4_article_results("治理", 5, "governance_article", {"period": "P7"})
        self.assertEqual(first, second)
        self.assertEqual(searcher.article_calls, 1)


if __name__ == "__main__":
    unittest.main()
