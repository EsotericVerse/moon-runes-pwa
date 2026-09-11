import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import facebook_search
from facebook_search import FacebookSearchEngine
from keyword_analysis import rank_keyword_documents


class FacebookStreamingSearchTests(unittest.TestCase):
    def make_engine(self):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        shards = [
            [
                {
                    "record_id": "FB-1",
                    "date": "2026-01-01",
                    "year": 2026,
                    "text": "月光與自我治理",
                    "retrieval_text": "月光 自我治理",
                    "semantic_keywords": ["月光", "自我治理"],
                    "searchable": True,
                },
                {
                    "record_id": "FB-2",
                    "date": "2026-01-02",
                    "year": 2026,
                    "text": "完全無關的日常紀錄",
                    "retrieval_text": "日常 紀錄",
                    "semantic_keywords": ["日常紀錄"],
                    "searchable": True,
                },
            ],
            [
                {
                    "record_id": "FB-3",
                    "date": "2026-01-03",
                    "year": 2026,
                    "text": "治理自己的月光",
                    "retrieval_text": "治理 自己 月光",
                    "semantic_keywords": ["治理自己", "月光"],
                    "searchable": True,
                }
            ],
        ]
        names = []
        for i, rows in enumerate(shards, start=1):
            name = f"facebook_posts_{i:02d}.json"
            (root / name).write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
            names.append(name)
        manifest = {
            "schema_version": "test",
            "records": 3,
            "source": "Facebook export",
            "shards": names,
        }
        path = root / "manifest.json"
        path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        return tmp, FacebookSearchEngine(path)

    def test_manifest_does_not_materialize_all_posts(self):
        tmp, engine = self.make_engine()
        try:
            self.assertNotIsInstance(engine.posts, list)
            self.assertEqual(2, len(engine.shards))
            self.assertEqual(3, len(list(engine.posts)))
            self.assertEqual(3, len(list(engine.posts)))
        finally:
            tmp.cleanup()

    def test_search_is_globally_bounded(self):
        tmp, engine = self.make_engine()
        try:
            results = engine.search("月光", top_k=1)
            self.assertEqual(1, len(results))
            self.assertIn(results[0]["result_id"], {"FB-1", "FB-3"})
        finally:
            tmp.cleanup()

    def test_date_filter_still_applies(self):
        tmp, engine = self.make_engine()
        try:
            results = engine.search("月光", top_k=10, start_date="2026-01-03")
            self.assertEqual(["FB-3"], [row["result_id"] for row in results])
        finally:
            tmp.cleanup()

    def test_prefilter_skips_vectorization_for_unrelated_records(self):
        tmp, engine = self.make_engine()
        try:
            original = facebook_search._vectorize
            calls = []

            def counting_vectorize(features):
                calls.append(features)
                return original(features)

            with patch("facebook_search._vectorize", side_effect=counting_vectorize):
                results = engine.search("月光", top_k=10)

            self.assertEqual({"FB-1", "FB-3"}, {row["result_id"] for row in results})
            self.assertEqual(3, len(calls))
        finally:
            tmp.cleanup()

    def test_semantic_keyword_can_enter_candidate_set(self):
        tmp, engine = self.make_engine()
        try:
            results = engine.search("日常紀錄", top_k=10)
            self.assertEqual(["FB-2"], [row["result_id"] for row in results])
        finally:
            tmp.cleanup()

    def test_keyword_ranking_accepts_streamed_posts(self):
        tmp, engine = self.make_engine()
        try:
            result = rank_keyword_documents(engine.posts, top_k=10)
            self.assertEqual(3, result["document_count"])
            self.assertTrue(result["items"])
        finally:
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
