#!/usr/bin/env python3
import json
import re
import subprocess
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json"


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "template", "svg"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "template", "svg"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def normalize(text):
    return re.sub(r"\s+", "", text)


def html_text(path):
    parser = VisibleText()
    parser.feed(path.read_text(encoding="utf-8"))
    return " ".join(parser.parts)


def docx_text(path):
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    return " ".join(node.text or "" for node in root.iter() if node.tag.endswith("}t"))


def pdf_text(path):
    with tempfile.NamedTemporaryFile(suffix=".txt") as output:
        subprocess.run(["pdftotext", str(path), output.name], check=True)
        return Path(output.name).read_text(encoding="utf-8", errors="ignore")


def json_semantic_text(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    excluded_keys = {
        "asset_id", "path", "public_path", "source_type", "content_type",
        "primary_loc", "related_locs", "status", "authority_level",
        "searchable", "index_priority", "version", "updated_at",
        "created_at", "schema_version", "provenance", "presentation",
        "exposure_policy", "repository", "maintained_in_repo",
    }
    values = []

    def walk(value, key=None):
        if key in excluded_keys:
            return
        if isinstance(value, dict):
            for child_key, child in value.items():
                walk(child, child_key)
        elif isinstance(value, list):
            for child in value:
                walk(child, key)
        elif isinstance(value, str):
            values.append(value)

    walk(data)
    return " ".join(values)


def extract(path):
    suffix = path.suffix.lower()
    if suffix == ".html":
        return html_text(path)
    if suffix in {".md", ".txt"}:
        return path.read_text(encoding="utf-8")
    if suffix == ".docx":
        return docx_text(path)
    if suffix == ".pdf":
        return pdf_text(path)
    if suffix in {".json", ".js"}:
        return json_semantic_text(path) if suffix == ".json" else path.read_text(encoding="utf-8")
    return ""


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    excluded = {
        "data/json/search/faq/LOC_FAQ_RAG_v0.4.json",
        "data/json/registries/LOC4_THREADS_KM_INDEX.json",
        "index.html",
        "tutorial01.html",
    }
    paths = set()
    for asset in registry["assets"]:
        raw = (asset.get("path") or "").split("#", 1)[0]
        if not raw or raw in excluded or asset.get("source_type") == "image":
            continue
        paths.add(raw)
    paths.add("docs/LOC_Canon_1.0.docx")
    paths.update({
        "card_api/FAQ_API.md",
        "card_api/LOC3_API.md",
        "card_api/UNIFIED_SEARCH_API.md",
        "data/README.md",
        "engine/README.md",
        "loc8_api/README.md",
        "docs/LOC_Tutorial_02_月之符文入門.pdf",
    })

    rows = []
    for relative in sorted(paths):
        path = ROOT / relative
        if not path.exists():
            continue
        count = len(normalize(extract(path)))
        rows.append({"path": relative, "characters": count})
    print(json.dumps({"documents": len(rows), "characters": sum(r["characters"] for r in rows), "files": rows}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
