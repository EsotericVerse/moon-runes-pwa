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
        (root / "data" / "shared").mkdir(parents=True)
        (root / "data" / "shared" / "LOC_ERA_REGISTRY.json").write_text(
            '{"language_system_id":"lo3rwang","eras":[{"era_id":"ERA-P8","period":"P8","order":8,"name":"自我治理與未來展望期","display_label":"P8｜自我治理與未來展望期","description":"自我治理","status":"current","source_event_id":"EV-ERA-P8"}]}',
            encoding="utf-8",
        )
        (root / "data" / "shared" / "LOC_CONTENT_TYPE_REGISTRY.json").write_text(
            '{"types":[{"id":"lyrics_work","primary_loc":"LOC3"}]}',
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


if __name__ == "__main__":
    unittest.main()
