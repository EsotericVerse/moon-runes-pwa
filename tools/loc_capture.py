#!/usr/bin/env python3
"""LOC Browser Capture

Open a persistent Chromium browser. The user logs in and navigates manually.
Each time Enter is pressed, capture the CURRENT page:
- source
- title
- url
- visible text
- all page links
- captured_at
- content_hash

Records are appended to one JSON file with duplicate protection.
Type q + Enter to finish.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urldefrag

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def clean_text(text: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in (text or "").splitlines()]
    return "\n".join(line for line in lines if line)


def canonical_url(url: str) -> str:
    url, _ = urldefrag(url or "")
    return url.strip()


def guess_source(url: str) -> str:
    host = (urlparse(url).netloc or "").lower()
    if "threads" in host:
        return "threads"
    if "instagram" in host:
        return "instagram"
    if "suno" in host:
        return "suno"
    if "youtube" in host or "youtu.be" in host:
        return "youtube"
    if "github" in host:
        return "github"
    return host or "web"


def visible_text(page) -> str:
    try:
        return clean_text(page.locator("body").inner_text(timeout=15000))
    except PlaywrightTimeoutError:
        return clean_text(page.evaluate("() => document.body ? document.body.innerText : ''"))


def page_links(page) -> list[dict]:
    try:
        links = page.locator("a[href]").evaluate_all(
            """els => els.map(a => ({
                text: (a.innerText || a.textContent || '').trim(),
                url: a.href
            })).filter(x => x.url)"""
        )
    except Exception:
        return []

    seen = set()
    output = []
    for item in links:
        url = canonical_url(str(item.get("url", "")))
        if not url or url in seen:
            continue
        seen.add(url)
        output.append({
            "text": clean_text(str(item.get("text", ""))),
            "url": url,
        })
    return output


def capture(page, keyword: str = "") -> dict:
    url = canonical_url(page.url)
    text = visible_text(page)

    try:
        title = page.title().strip()
    except Exception:
        title = ""

    digest = hashlib.sha256((url + "\n" + text).encode("utf-8")).hexdigest()

    return {
        "id": digest[:24],
        "source": guess_source(url),
        "keyword": keyword,
        "title": title,
        "url": url,
        "text": text,
        "links": page_links(page),
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "content_hash": digest,
    }


def load_records(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        return [x for x in data.get("records", []) if isinstance(x, dict)]
    return []


def save_records(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": "0.1",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "records": records,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def upsert(records: list[dict], row: dict) -> str:
    for i, old in enumerate(records):
        if old.get("url") and old.get("url") == row.get("url"):
            if old.get("content_hash") == row.get("content_hash"):
                return "duplicate"
            records[i] = row
            return "updated"

    for old in records:
        if old.get("content_hash") and old.get("content_hash") == row.get("content_hash"):
            return "duplicate"

    records.append(row)
    return "appended"


def main() -> None:
    ap = argparse.ArgumentParser(description="Capture current browser pages into JSON.")
    ap.add_argument("url", nargs="?", default="about:blank", help="Optional starting URL")
    ap.add_argument("--keyword", default="", help="Optional search context to store with each record")
    ap.add_argument("--profile", default=".loc-browser-profile", help="Persistent login profile directory")
    ap.add_argument("--out", default="loc_capture.json", help="Output JSON file")
    args = ap.parse_args()

    out = Path(args.out)
    records = load_records(out)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=args.profile,
            headless=False,
        )
        page = context.pages[0] if context.pages else context.new_page()

        if args.url != "about:blank":
            try:
                page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
            except Exception as exc:
                print(f"[warn] navigation failed: {exc}")

        print("\nLOC Browser Capture")
        print("瀏覽器會保持開啟。你自己登入、搜尋、點到想收錄的頁面。")
        print("回到這個終端：")
        print("  Enter = 抓目前頁面的 URL + 可見文字 + 連結")
        print("  q     = 儲存並結束\n")

        while True:
            command = input("> ").strip().lower()
            if command == "q":
                break

            row = capture(page, args.keyword)

            if not row["url"] or row["url"] == "about:blank":
                print("略過：目前沒有有效網頁 URL")
                continue

            result = upsert(records, row)
            save_records(out, records)

            print(
                f"{result}: {row['title'] or '(no title)'}\n"
                f"  URL: {row['url']}\n"
                f"  text: {len(row['text'])} chars\n"
                f"  links: {len(row['links'])}\n"
                f"  saved: {out}"
            )

        save_records(out, records)
        context.close()

    print(f"完成，共 {len(records)} 筆：{out}")


if __name__ == "__main__":
    main()
