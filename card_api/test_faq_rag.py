import unittest
from pathlib import Path

from faq_rag import FAQSearchEngine
from paths import runtime_json


DATASET = runtime_json("LOC_FAQ_RAG_v0.4.json")


class FAQSearchEngineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = FAQSearchEngine(DATASET)

    def test_dataset_is_loaded(self):
        self.assertEqual(len(self.engine.chunks), 80)

    def test_alias_query_finds_loc_definition(self):
        result = self.engine.search("可以簡單介紹月典嗎？", top_k=3)[0]
        self.assertEqual(result.chunk["parent_id"], "FAQ-001")

    def test_zero_rune_is_not_drawn(self):
        results = self.engine.search("第零符德會抽到嗎？", top_k=3)
        self.assertEqual(results[0].chunk["parent_id"], "FAQ-007")

    def test_answer_contains_citation(self):
        payload = self.engine.answer("LOC去哪裡使用？", top_k=5)
        self.assertTrue(payload["citations"])
        self.assertIn("[FAQ-", payload["answer"])

    def test_multi_intent_answer_uses_two_sources(self):
        payload = self.engine.answer("LOC3的歌曲和LOC4的小說是什麼？", top_k=5)
        self.assertEqual(len(payload["citations"]), 2)
        self.assertTrue(any(citation.startswith("FAQ-033") for citation in payload["citations"]))
        self.assertTrue(any(citation.startswith("FAQ-038") for citation in payload["citations"]))

    def test_blank_query_is_rejected(self):
        with self.assertRaises(ValueError):
            self.engine.search("   ")


if __name__ == "__main__":
    unittest.main()
