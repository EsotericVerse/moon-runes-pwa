#!/usr/bin/env python3
"""LOC universal browser capture.

Purpose:
- Open a real Chromium browser with a persistent profile.
- Let the user log in / navigate manually.
- Capture current page URL, title, visible text and links.
- Optionally auto-scroll or follow pagination.
- Save normalized JSON for later KM upload / analysis.

Examples:
  python tools/loc_capture.py "https://www.threads.com/" --mode page
  python tools/loc_capture.py "https://www.instagram.com/" --mode scroll --scrolls 12
  python tools/loc_capture.py "https://example.com/list" --mode pages --next-selector "a[rel=next]"
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def clean_text(text: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def extract_visible_text(page) -> str:
    try:
        text = page.locator("body").inner_text(timeout=15000)
    except PlaywrightTimeoutError:
        text = page.evaluate("() => document.body ? document.body.innerText : ''")
    return clean_text(text or "")


def extract_links(page) -> list[dict]:
    try:
        return page.locator("a[href]").evaluate_all(
            """els => els.map(a => ({
                text: (a.innerText || a.textContent || '').trim(),
                url: a.href
            })).filter(x => x.url)"""
        )
    except Exception:
        return []


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


def make_record(page, keyword: str = "") -> dict:
    url = page.url
    text = extract_visible_text(page)
    title = ""
    try:
        title = page.title()
    except Exception:
        pass

    content_fingerprint = hashlib.sha256(
        (url + "\n" + text[:8000]).encode("utf-8")
    ).hexdigest()

    return {
        "id": content_fingerprint[:24],
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "keyword": keyword,
        "source": guess_source(url),
        "url": url,
        "title": title,
        "text": text,
        "links": extract_links(page),
        "content_hash": content_fingerprint,
    }


def load_existing(out: Path) -> list[dict]:
    if not out.exists():
        return []
    try:
        data = json.loads(out.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        rows = data.get("records", [])
        return [x for x in rows if isinstance(x, dict)]
    return []


def save_records(out: Path, rows: list[dict]) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing(out)
    by_id = {x.get("id"): x for x in existing if x.get("id")}
    for row in rows:
        by_id[row["id"]] = row
    payload = {
        "schema_version": "0.1",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "records": list(by_id.values()),
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def capture_page_mode(page, keyword: str) -> list[dict]:
    return [make_record(page, keyword)]


def capture_scroll_mode(page, keyword: str, scrolls: int, delay_ms: int) -> list[dict]:
    for _ in range(max(0, scrolls)):
        page.mouse.wheel(0, 5000)
        page.wait_for_timeout(delay_ms)
    return [make_record(page, keyword)]


def capture_pages_mode(page, keyword: str, next_selector: str, max_pages: int, delay_ms: int) -> list[dict]:
    rows: list[dict] = []
    for _ in range(max(1, max_pages)):
        rows.append(make_record(page, keyword))
        nxt = page.locator(next_selector).first
        if not nxt.count():
            break
        try:
            if not nxt.is_visible() or not nxt.is_enabled():
                break
        except Exception:
            break
        before = page.url
        nxt.click()
        try:
            page.wait_for_load_state("domcontentloaded", timeout=15000)
        except Exception:
            pass
        page.wait_for_timeout(delay_ms)
        if page.url == before:
            # SPA pagination may keep URL unchanged; still allow the next loop.
            pass
    return rows


def main():
    ap = argparse.ArgumentParser(description="Capture visible webpage text + URL into JSON.")
    ap.add_argument("url", nargs="?", default="about:blank", help="Starting URL")
    ap.add_argument("--mode", choices=["page", "scroll", "pages"], default="page")
    ap.add_argument("--keyword", default="", help="Optional search keyword/context")
    ap.add_argument("--profile", default=".loc-browser-profile", help="Persistent Chromium profile")
    ap.add_argument("--out", default="data/json/inbox/loc_capture.json", help="Output JSON path")
    ap.add_argument("--scrolls", type=int, default=8)
    ap.add_argument("--delay-ms", type=int, default=900)
    ap.add_argument("--next-selector", default="")
    ap.add_argument("--max-pages", type=int, default=10)
    args = ap.parse_args()

    if args.mode == "pages" and not args.next_selector:
        raise SystemExit("--next-selector is required for pages mode")

    out = Path(args.out)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=args.profile,
            headless=False,
        )
        page = context.pages[0] if context.pages else context.new_page()

        if args.url and args.url != "about:blank":
            try:
                page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
            except Exception as e:
                print(f"[warn] initial navigation failed: {e}")

        print("\nBrowser is open.")
        print("1) Log in if needed.")
        print("2) Navigate/search to the exact page you want.")
        print("3) Return here and press Enter to capture the CURRENT page.\n")
        input()

        if args.mode == "scroll":
            rows = capture_scroll_mode(page, args.keyword, args.scrolls, args.delay_ms)
        elif args.mode == "pages":
            rows = capture_pages_mode(
                page, args.keyword, args.next_selector, args.max_pages, args.delay_ms
            )
        else:
            rows = capture_page_mode(page, args.keyword)

        context.close()

    save_records(out, rows)
    print(f"saved {len(rows)} capture(s) -> {out}")


if __name__ == "__main__":
    main()
