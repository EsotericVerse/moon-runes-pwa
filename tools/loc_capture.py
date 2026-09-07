#!/usr/bin/env python3
"""LOC Capture: user-curated browser capture to JSON.

Modes:
  page   - capture current page once
  scroll - auto-scroll and capture the loaded page
  pages  - follow a next-button selector for bounded pagination

Login is manual on first run and retained in --profile.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

def clean_text(text: str) -> str:
    lines=[re.sub(r"\s+", " ", x).strip() for x in text.splitlines()]
    return "\n".join(x for x in lines if x)

def record(page, keyword: str) -> dict:
    text=clean_text(page.locator("body").inner_text(timeout=15000))
    links=page.locator("a[href]").evaluate_all(
        """els => els.map(a => ({text:(a.innerText||'').trim(), url:a.href})).filter(x => x.url)"""
    )
    url=page.url
    return {
        "id": hashlib.sha256((url+"\n"+text[:4000]).encode("utf-8")).hexdigest()[:24],
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "keyword": keyword,
        "source": urlparse(url).netloc,
        "title": page.title(),
        "url": url,
        "text": text,
        "links": links,
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--mode",choices=["page","scroll","pages"],default="page")
    ap.add_argument("--keyword",default="")
    ap.add_argument("--profile",default=".loc-browser-profile")
    ap.add_argument("--out",default="data/json/inbox/loc_capture.json")
    ap.add_argument("--scrolls",type=int,default=8)
    ap.add_argument("--next-selector",default="")
    ap.add_argument("--max-pages",type=int,default=10)
    args=ap.parse_args()
    out=Path(args.out); out.parent.mkdir(parents=True,exist_ok=True)

    with sync_playwright() as p:
        ctx=p.chromium.launch_persistent_context(args.profile,headless=False)
        page=ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(args.url,wait_until="domcontentloaded",timeout=60000)
        print("Browser opened. Log in or navigate as needed, then press Enter here to capture.")
        input()

        rows=[]
        if args.mode=="scroll":
            for _ in range(max(0,args.scrolls)):
                page.mouse.wheel(0,5000); page.wait_for_timeout(900)
            rows.append(record(page,args.keyword))
        elif args.mode=="pages":
            if not args.next_selector:
                raise SystemExit("--next-selector is required for pages mode")
            for _ in range(max(1,args.max_pages)):
                rows.append(record(page,args.keyword))
                nxt=page.locator(args.next_selector).first
                if not nxt.count() or not nxt.is_visible(): break
                nxt.click(); page.wait_for_load_state("domcontentloaded"); page.wait_for_timeout(800)
        else:
            rows.append(record(page,args.keyword))
        ctx.close()

    existing=[]
    if out.exists():
        try:
            old=json.loads(out.read_text(encoding="utf-8"))
            existing=old if isinstance(old,list) else old.get("records",[])
        except Exception: pass
    seen={x.get("id") for x in existing if isinstance(x,dict)}
    merged=existing+[x for x in rows if x["id"] not in seen]
    out.write_text(json.dumps({"schema_version":"0.1","records":merged},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"saved {len(rows)} capture(s) -> {out}; total {len(merged)}")

if __name__=="__main__":
    main()
