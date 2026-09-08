#!/usr/bin/env python3
"""Merge Facebook mother sources, deduplicate, and rebuild searchable keyword shards."""
from __future__ import annotations

import base64
import gzip
import hashlib
import html
import json
import math
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/json/sources/facebook"
# Keep generated shards comfortably below connector/proxy payload limits.
SHARD_SIZE = 200
URL_RE = re.compile(r"https?://\S+", re.I)
CJK_RE = re.compile(r"[\u3400-\u9fff]{2,}")
LATIN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{2,}")
STOP = {"自己", "就是", "真的", "今天", "現在", "還是", "一個", "沒有", "不是", "可以", "覺得", "因為", "所以", "已經", "這個", "那個", "一下", "更新", "近況", "分享", "內容", "透過", "一些", "發表"}


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(str(value or "")).lower()).strip()


def candidates(text: str) -> Counter[str]:
    clean = URL_RE.sub(" ", text)
    out: Counter[str] = Counter(x.lower() for x in LATIN_RE.findall(clean))
    for seq in CJK_RE.findall(clean):
        for size in (2, 3, 4):
            for i in range(len(seq) - size + 1):
                term = seq[i:i + size]
                if term not in STOP:
                    out[term] += 1
    return out


def load_existing() -> list[dict]:
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    rows = []
    for name in manifest["shards"]:
        rows.extend(json.loads((DATA / name).read_text(encoding="utf-8")))
    for row in rows:
        row.setdefault("author_account", "sopa2306")
    return rows


def load_oscars80() -> list[dict]:
    manifest = json.loads((DATA / "oscars80_mother_manifest.json").read_text(encoding="utf-8"))
    encoded = "".join((DATA / name).read_text(encoding="utf-8").strip() for name in manifest["storage"]["parts"])
    source = json.loads(gzip.decompress(base64.b64decode(encoded)))
    rows = []
    for index, item in enumerate(source):
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        dt = datetime.fromtimestamp(int(item["timestamp"]), tz=timezone.utc)
        digest = hashlib.sha256(f"{item['timestamp']}\0{text}".encode()).hexdigest()[:10]
        urls = URL_RE.findall(text)
        rows.append({
            "record_id": f"FB-OSCARS80-{dt:%Y%m%d}-{digest}", "date": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "year": dt.year, "month": dt.month, "title": "Oscar Wang 發表了動態。", "text": text,
            "char_count": len(text), "content_type": "文字＋連結" if urls else "文字",
            "media_source": [], "external_urls": urls, "media_files": [], "place": "",
            "source_json": manifest["source_member"], "source_index": index,
            "author_account": "oscars80", "concepts": [], "semantic_keywords": [],
        })
    return rows


def main() -> None:
    rows = load_existing() + load_oscars80()
    unique = {}
    duplicates = 0
    for row in rows:
        key = hashlib.sha256((str(row.get("date") or "") + "\0" + norm(row.get("text") or "")).encode()).hexdigest()
        if key in unique:
            duplicates += 1
            continue
        unique[key] = row
    rows = sorted(unique.values(), key=lambda r: (str(r.get("date") or ""), str(r.get("record_id") or "")))

    feature_rows = [candidates(str(row.get("text") or "")) for row in rows]
    df: Counter[str] = Counter()
    for features in feature_rows:
        df.update(features.keys())
    total = len(rows)
    for row, features in zip(rows, feature_rows):
        extracted = []
        for term, tf in features.items():
            if df[term] > total * 0.20:
                continue
            score = (1 + math.log(tf)) * (math.log((total + 1) / (df[term] + 1)) + 1) * (1 + 0.10 * min(len(term), 4))
            extracted.append((score, term))
        extracted.sort(key=lambda x: (-x[0], -len(x[1]), x[1]))
        existing = [str(x) for x in row.get("semantic_keywords", []) if str(x).strip()]
        row["semantic_keywords"] = list(dict.fromkeys([*existing, *(term for _, term in extracted)]))[:12]
        row["retrieval_text"] = " ".join(filter(None, [str(row.get("text") or ""), str(row.get("title") or ""), " ".join(row.get("concepts", [])), " ".join(row["semantic_keywords"]), str(row.get("author_account") or "")]))
        row["searchable"] = "爭議文章" not in set(row.get("classification") or [])

    for old in DATA.glob("facebook_posts_*.json"):
        old.unlink()
    shards = []
    for start in range(0, len(rows), SHARD_SIZE):
        part = rows[start:start + SHARD_SIZE]
        name = f"facebook_posts_{start // SHARD_SIZE + 1:02d}.json"
        (DATA / name).write_text(json.dumps(part, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        shards.append(name)
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    manifest.update({"schema_version": "0.3", "records": len(rows), "shards": shards,
        "accounts": {"sopa2306": sum(r["author_account"] == "sopa2306" for r in rows), "oscars80": sum(r["author_account"] == "oscars80" for r in rows)},
        "duplicates_excluded": duplicates, "keyword_policy": "existing concepts plus corpus TF-IDF CJK 2-4grams and Latin terms; retrieval aid only",
        "search_status": "all_mother_sources_merged_searchable"})
    manifest["mother_sources"][0]["status"] = "merged_searchable"
    (DATA / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(rows), "shards": len(shards), "duplicates": duplicates, "accounts": manifest["accounts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
