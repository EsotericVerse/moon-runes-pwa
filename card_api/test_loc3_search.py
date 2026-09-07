import json
import unittest
from pathlib import Path

from loc3_search import LOC3SearchEngine
from paths import search_json


ROOT = Path(__file__).resolve().parent
DATASET = search_json("loc3", "LOC3_LYRICS_SEARCH_v0.1.json")
MEDIA_DATASET = search_json("loc3", "LOC3_MEDIA_LINKS_v0.1.json")


class LOC3DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(DATASET.read_text(encoding="utf-8"))
        cls.engine = LOC3SearchEngine(DATASET)
        cls.works = cls.engine.works

    def test_dataset_is_unique_lyrics_work_layer(self):
        works = self.works
        self.assertEqual(403, len(works))
        self.assertEqual(403, len({work["lyrics_hash"] for work in works}))
        self.assertEqual(530, sum(len(work["versions"]) for work in works))

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

    def test_self_governance_era_and_two_new_songs_are_loaded(self):
        titles = {work["title"] for work in self.works}
        self.assertTrue({"白晝也有月光", "清空舊航線"}.issubset(titles))
        new_works = [work for work in self.works if work["title"] in titles & {"白晝也有月光", "清空舊航線"}]
        self.assertTrue(all(work["period"] == "P8" for work in new_works))
        self.assertTrue(all(work["era_name"] == "治理自己" for work in new_works))
        self.assertTrue(all("6.治理自己" in work["playlists"] for work in new_works))

    def test_reels_catalog_is_version_specific_and_metrics_are_separate(self):
        media = json.loads(MEDIA_DATASET.read_text(encoding="utf-8"))
        items = media["items"]
        linked = [item for item in items if item["linked_to_semantic_index"]]
        pending = [item for item in items if not item["linked_to_semantic_index"]]
        reels_count = sum(len(item.get("reels", [])) for item in items)
        pending_reels_count = sum(len(item.get("reels", [])) for item in pending)
        self.assertEqual(reels_count, media["dataset"]["reels_count"])
        self.assertEqual(len(linked), media["dataset"]["linked_count"])
        self.assertEqual(pending_reels_count, media["dataset"]["pending_count"])
        self.assertEqual(len(items), media["dataset"]["song_version_count"])
        self.assertTrue(all(item["ig_plays"] is None for item in items))
        linked_ids = {
            version["song_id"]
            for work in self.works
            for version in work["versions"]
            if version.get("ig_preview_url")
        }
        expected_ids = {
            item["song_id"] for item in media["items"]
            if item["linked_to_semantic_index"]
        }
        self.assertEqual(expected_ids, linked_ids)

    def test_life_platform_song_is_searchable_and_has_reels_preview(self):
        results = self.engine.search("人生像月台，還不知道下一班車要往哪裡", top_k=5)
        life_platform = next(item for item in results if item.work["title"] == "人生月台")
        self.assertEqual("P5", life_platform.work["period"])
        self.assertEqual("人生月台", life_platform.work["era_name"])
        self.assertTrue(life_platform.work["versions"][0]["ig_preview_url"])


if __name__ == "__main__":
    unittest.main()
