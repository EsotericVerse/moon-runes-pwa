from __future__ import annotations

import unittest

import runtime_text_bundle


class RuntimeTextBundleTests(unittest.TestCase):
    @staticmethod
    def _merge(groups, incoming):
        for group_name, items in (incoming or {}).items():
            if not items:
                continue
            bucket = groups.setdefault(group_name, [])
            seen = {str(item.get("result_id") or "") for item in bucket}
            for item in items:
                rid = str(item.get("result_id") or "")
                if rid and rid in seen:
                    continue
                bucket.append(item)
                if rid:
                    seen.add(rid)

    @staticmethod
    def _ids(groups):
        return {
            group: [str(item.get("result_id") or "") for item in items]
            for group, items in groups.items()
            if items
        }

    def test_one_pass_matches_legacy_text_union(self):
        searcher = runtime_text_bundle.core.get_unified_searcher()
        query = "月語者"
        top_k = 4
        filters = {
            "source": "",
            "start_date": "",
            "end_date": "",
            "period": "",
            "era": "",
            "playlist": "",
            "category": "",
            "style": "",
        }

        legacy = {}
        for text_type in ("text_record", "text_work", "governance_article", "governance_fragment"):
            partial = searcher.search(query, top_k=top_k, content_type=text_type, filters=filters)
            self._merge(legacy, partial.get("groups") or {})

        optimized = runtime_text_bundle._one_pass_text_groups(searcher, query, top_k, filters)
        self.assertEqual(self._ids(legacy), self._ids(optimized))

    def test_one_pass_does_not_build_search_graph(self):
        searcher = runtime_text_bundle.core.get_unified_searcher()
        original = searcher._graph_enrichment
        try:
            def fail_graph(*_args, **_kwargs):
                raise AssertionError("text bundle must not perform partial Graph enrichment")

            searcher._graph_enrichment = fail_graph
            groups = runtime_text_bundle._one_pass_text_groups(
                searcher,
                "自我治理",
                4,
                {
                    "source": "",
                    "start_date": "",
                    "end_date": "",
                    "period": "",
                    "era": "",
                    "playlist": "",
                    "category": "",
                    "style": "",
                },
            )
            self.assertIsInstance(groups, dict)
        finally:
            searcher._graph_enrichment = original


if __name__ == "__main__":
    unittest.main()
