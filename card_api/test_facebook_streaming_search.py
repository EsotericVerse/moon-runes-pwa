import json
import tempfile
import unittest
from pathlib import Path

from facebook_search import FacebookSearchEngine


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
                    "searchable": True,
                },
                {
                    "record_id": "FB-2",
                    "date": "2026-01-02",
                    "year": 2026,
                    "text": "完全無關的日常紀錄",
                    "retrieval_text": "日常 紀錄",
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
            self.assertIsNone(engine.posts)
            self.assertEqual(2, len(engine.shards))
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


if __name__ == "__main__":
    unittest.main()
