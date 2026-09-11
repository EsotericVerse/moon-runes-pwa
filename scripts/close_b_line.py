#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 1) Current-facing homepage terminology must match LOC_TERMINOLOGY_CANON.
index_path = ROOT / "index.html"
index_text = index_path.read_text(encoding="utf-8")
old = "語言模組框架"
new = "語言系統模組框架"
count = index_text.count(old)
if count < 1:
    raise SystemExit("Expected current-facing homepage term not found; aborting without broad rewrite.")
index_text = index_text.replace(old, new)
index_path.write_text(index_text, encoding="utf-8")

# 2) Canon migration ledger must reflect the current source-level architecture.
canon_path = ROOT / "data/json/registries/LOC_TERMINOLOGY_CANON.json"
canon = json.loads(canon_path.read_text(encoding="utf-8"))
canon["schema_version"] = "1.2"
status = canon.setdefault("migration_status", {})
status["directly_migrated"] = [
    "README.md",
    "index.html",
    "manifest.json",
    "data/json/search/faq/LOC_FAQ_CANON_OVERRIDES.json"
]
status["runtime_canon_overrides"] = [
    "data/json/search/faq/LOC_FAQ_RAG_v0.4.json via data/json/search/faq/LOC_FAQ_CANON_OVERRIDES.json + card_api/faq_rag.py"
]
status["retired_runtime_shims"] = [
    "js/home-canonical.js",
    "js/public-terminology.js"
]
legacy = status.get("legacy_source_debt", [])
status["legacy_source_debt"] = [item for item in legacy if item != "index.html"]
canon_path.write_text(json.dumps(canon, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# One-shot cleanup leaves no maintenance artifacts behind.
for rel in ("scripts/close_b_line.py", ".github/workflows/close-b-line.yml"):
    path = ROOT / rel
    if path.exists():
        path.unlink()

print(f"B-line closeout complete; normalized {count} homepage occurrence(s) and updated terminology canon ledger.")
