from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVICE_ROOT = REPO_ROOT / "services" / "api" / "card"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import build_loc4_runtime_index as builder


if __name__ == "__main__":
    builder.REPO_ROOT = REPO_ROOT
    builder.CORPUS_MANIFEST = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "corpus" / "LOC4_TEXT_CORPUS_MANIFEST.json"
    builder.HISTORY_MANIFEST = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "offline_history" / "LOC4_OFFLINE_HISTORY_MANIFEST.json"
    builder.OUTPUT_PATH = SERVICE_ROOT / "generated" / "loc4_runtime_index.sqlite3"
    builder.main()
