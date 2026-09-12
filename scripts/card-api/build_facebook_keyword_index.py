from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVICE_ROOT = REPO_ROOT / "services" / "api" / "card"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from build_facebook_keyword_index import build_index


if __name__ == "__main__":
    build_index(
        manifest_path=REPO_ROOT / "data" / "json" / "sources" / "facebook" / "manifest.json",
        governance_path=REPO_ROOT / "data" / "json" / "registries" / "LOC_KEYWORD_GOVERNANCE.json",
        output_path=SERVICE_ROOT / "generated" / "facebook_keyword_index.sqlite3",
    )
