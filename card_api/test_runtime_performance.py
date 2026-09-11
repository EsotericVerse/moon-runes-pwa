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


if __name__ == "__main__":
    unittest.main()
