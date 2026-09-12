from __future__ import annotations

import os
from pathlib import Path

# Directory-migration bootstrap: keep the legacy Facebook fallback anchored to
# the repository data tree without changing the API implementation itself.
os.environ.setdefault(
    "LOC_FB_SEARCH_DATASET",
    str(Path(__file__).resolve().parents[3] / "data" / "json" / "sources" / "facebook" / "manifest.json"),
)

from core_main import *  # noqa: F401,F403,E402
