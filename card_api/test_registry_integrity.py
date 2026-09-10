import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_ROOT = REPO_ROOT / "data" / "json" / "registries"


class RegistryIntegrityTests(unittest.TestCase):
    def test_all_runtime_registries_are_valid_utf8_json(self):
        for path in sorted(REGISTRY_ROOT.glob("*.json")):
            with self.subTest(path=path.name):
                json.loads(path.read_text(encoding="utf-8"))

    def test_rune_literature_projection_is_present(self):
        path = REGISTRY_ROOT / "RUNE_LITERATURE_REGISTRY.json"
        registry = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual("RUNE_LITERATURE_REGISTRY", registry.get("registry_id"))
        self.assertTrue(registry.get("runes"))


if __name__ == "__main__":
    unittest.main()
