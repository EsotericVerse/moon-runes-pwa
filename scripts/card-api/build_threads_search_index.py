from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVICE_ROOT = REPO_ROOT / "services" / "api" / "card"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import build_threads_search_index as builder


if __name__ == "__main__":
    builder.REPO_ROOT = REPO_ROOT
    builder.MANIFEST_PATH = REPO_ROOT / "data" / "json" / "generated" / "loc4" / "threads" / "LOC4_THREADS_DOCUMENT_MANIFEST.json"
    builder.OUTPUT_PATH = SERVICE_ROOT / "generated" / "threads_search_index.sqlite3"
    builder.main()
