import unittest
from pathlib import Path

from faq_rag import FAQSearchEngine
from paths import search_json


DATASET = search_json("faq", "LOC_FAQ_RAG_v0.4.json")


class FAQSearchEngineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = FAQSearchEngine(DATASET)

    def test_dataset_is_loaded(self):
        self.assertEqual(len(self.engine.chunks), 90)

    def test_alias_query_finds_loc_definition(self):
        result = self.engine.search("可以簡單介紹月典嗎？", top_k=3)[0]
        self.assertEqual(result.chunk["parent_id"], "FAQ-001")

    def test_current_loc_definition_uses_module_framework(self):
        result = self.engine.search("LOC是什麼？", top_k=3)[0]
        self.assertEqual(result.chunk["parent_id"], "FAQ-001")
        self.assertIn("Language Module Framework", result.chunk["answer"])
        self.assertNotIn("Language System Model", result.chunk["answer"])

    def test_loc_module_names_use_current_loc6_and_loc7(self):
        result = self.engine.search("LOC1至LOC8是什麼關係？", top_k=3)[0]
        self.assertEqual(result.chunk["parent_id"], "FAQ-018")
        self.assertIn("LOC6 Algorithm／演算法", result.chunk["answer"])
        self.assertIn("LOC7 Module／演算模組", result.chunk["answer"])
        self.assertNotIn("LOC6 Methodology", result.chunk["answer"])

    def test_framework_positioning_question_is_current(self):
        rows = [chunk for chunk in self.engine.chunks if chunk.get("parent_id") == "FAQ-091"]
        self.assertTrue(rows)
        self.assertIn("Language Module Framework", rows[0]["question"])
        self.assertNotIn("Language System Model", rows[0]["question"])

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
