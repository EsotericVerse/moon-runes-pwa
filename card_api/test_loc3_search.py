import json
import unittest
from pathlib import Path

from loc3_search import LOC3SearchEngine


ROOT = Path(__file__).resolve().parent
DATASET = ROOT / "data" / "LOC3_LYRICS_SEARCH_v0.1.json"


class LOC3DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(DATASET.read_text(encoding="utf-8"))
        cls.engine = LOC3SearchEngine(DATASET)
        cls.works = cls.engine.works

    def test_dataset_is_unique_lyrics_work_layer(self):
        works = self.works
        self.assertEqual(400, len(works))
        self.assertEqual(400, len({work["lyrics_hash"] for work in works}))
        self.assertEqual(527, sum(len(work["versions"]) for work in works))

    def test_excluded_period_and_languages_are_absent(self):
        self.assertNotIn("P1", {work["period"] for work in self.works})
        self.assertEqual("zh-Hant", self.payload["dataset"]["language_scope"])

    def test_public_dataset_contains_no_full_lyrics_or_lyric_excerpt(self):
        for work in self.works:
            self.assertNotIn("lyrics", work)
            self.assertNotIn("歌詞", work)
            self.assertNotIn("ending_evidence", work)
            self.assertLess(len(work.get("retrieval_text", "")), 2500)

    def test_same_lyrics_versions_are_grouped(self):
        grouped = [work for work in self.works if len(work["versions"]) > 1]
        self.assertTrue(grouped)
        result = self.engine.search(grouped[0]["title"], top_k=12)
        matching = [item for item in result if item.work["work_id"] == grouped[0]["work_id"]]
        self.assertLessEqual(len(matching), 1)

    def test_governance_query_returns_explainable_fields(self):
        results = self.engine.search("不再配合別人的劇本，拿回自己的界線與選擇權", top_k=5)
        self.assertTrue(results)
        response = results[0].as_dict()
        self.assertIn("turn_method", response)
        self.assertIn("final_state", response)
        self.assertNotIn("retrieval_text", response)
        self.assertNotIn("lyrics_hash", response)

    def test_filters_apply_before_ranking(self):
        results = self.engine.search("微月光照著孤獨的人", top_k=12, filters={"period": "P3"})
        self.assertTrue(results)
        self.assertTrue(all(item.work["period"] == "P3" for item in results))

    def test_unrelated_weather_query_is_not_forced_into_a_song(self):
        self.assertEqual([], self.engine.search("台北明天會下雨嗎", top_k=5))

    def test_happiness_intent_prefers_happiness_category(self):
        results = self.engine.search("想聽幸福甜蜜而安穩的日常", top_k=5)
        self.assertTrue(any("幸福甜美" in item.work["category"] for item in results[:3]))

    def test_facets_include_periods_and_playlists(self):
        facets = self.engine.facets()
        self.assertTrue(facets["periods"])
        self.assertIn("playlists", facets)


if __name__ == "__main__":
    unittest.main()
