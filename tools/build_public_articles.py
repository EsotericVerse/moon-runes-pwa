#!/usr/bin/env python3
"""Build browser-friendly public HTML views from Markdown knowledge assets.

Only assets explicitly marked:
  presentation = "public_article"
  public_path  = "<path>.html"
are rendered. Internal Markdown/JSON remains a KM retrieval source and is not
automatically exposed as a public page.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "shared" / "LOC_KNOWLEDGE_ASSET_REGISTRY.json"


def inline(text: str) -> str:
    value = html.escape(text, quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>',
        value,
    )
    return value


def markdown_to_html(md: str) -> tuple[str, str]:
    lines = md.replace("\r\n", "\n").split("\n")
    title = "LOC Knowledge Article"
    body: list[str] = []
    paragraph: list[str] = []
    in_list = False
    in_code = False
    code_lines: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            body.append("<p>" + inline(" ".join(x.strip() for x in paragraph)) + "</p>")
            paragraph = []

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            body.append("</ul>")
            in_list = False

    for raw in lines:
        line = raw.rstrip()

        if line.startswith("```"):
            flush_paragraph()
            close_list()
            if in_code:
                body.append("<pre><code>" + html.escape("\n".join(code_lines)) + "</code></pre>")
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_lines.append(line)
            continue

        if not line.strip():
            flush_paragraph()
            close_list()
            continue

        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            flush_paragraph()
            close_list()
            level = len(m.group(1))
            text = m.group(2).strip()
            if level == 1 and title == "LOC Knowledge Article":
                title = re.sub(r"[*_`]","", text)
                continue
            body.append(f"<h{level}>{inline(text)}</h{level}>")
            continue

        if re.match(r"^[-*]\s+", line):
            flush_paragraph()
            if not in_list:
                body.append("<ul>")
                in_list = True
            body.append("<li>" + inline(re.sub(r"^[-*]\s+", "", line)) + "</li>")
            continue

        if line.startswith("> "):
            flush_paragraph()
            close_list()
            body.append("<blockquote>" + inline(line[2:].strip()) + "</blockquote>")
            continue

        paragraph.append(line)

    flush_paragraph()
    close_list()
    if in_code:
        body.append("<pre><code>" + html.escape("\n".join(code_lines)) + "</code></pre>")

    return title, "\n".join(body)


def template(title: str, body: str, asset: dict) -> str:
    desc = asset.get("public_summary") or asset.get("notes") or ""
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{html.escape(title)}｜LOC</title>
  <meta name="description" content="{html.escape(desc, quote=True)}">
  <link rel="stylesheet" href="css/loc-nav.css">
  <style>
    :root{{--bg:#f5f5f3;--card:#fff;--text:#181818;--muted:#666;--line:#d9d9d4}}
    @media(prefers-color-scheme:dark){{:root{{--bg:#111;--card:#181818;--text:#f2f2f2;--muted:#aaa;--line:#343434}}}}
    *{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.85}}
    main{{max-width:860px;margin:0 auto;padding:88px 20px 64px}}article{{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:clamp(24px,5vw,52px)}}
    h1{{font-size:clamp(2rem,5vw,3.2rem);line-height:1.2;margin:.2rem 0 1rem}}h2{{margin-top:2.2rem;padding-top:1.25rem;border-top:1px solid var(--line)}}h3{{margin-top:1.6rem}}
    p{{margin:.8rem 0}}ul{{padding-left:1.35rem}}code,pre{{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}}pre{{overflow:auto;padding:1rem;border:1px solid var(--line);border-radius:12px}}
    blockquote{{margin:1.2rem 0;padding:.3rem 1rem;border-left:4px solid var(--text);color:var(--muted)}}.eyebrow{{font-size:.82rem;letter-spacing:.08em;color:var(--muted)}}.lead{{font-size:1.08rem;color:var(--muted)}}.back{{display:inline-block;margin-top:2rem;color:inherit;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:.55rem .9rem}}
  </style>
</head>
<body>
  <main><article>
    <div class="eyebrow">{html.escape(asset.get("primary_loc") or "LOC7")} · Public Knowledge Article</div>
    <h1>{html.escape(title)}</h1>
    {f'<p class="lead">{html.escape(desc)}</p>' if desc else ''}
    {body}
    <a class="back" href="search.html">← 回到 LOC Search</a>
  </article></main>
  <script src="js/loc-nav.js"></script>
</body>
</html>
"""


def build(asset: dict) -> Path:
    source = ROOT / asset["path"]
    target = ROOT / asset["public_path"]
    md = source.read_text(encoding="utf-8")
    title, body = markdown_to_html(md)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(template(title, body, asset), encoding="utf-8")
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-id", action="append", default=[])
    args = parser.parse_args()

    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    assets = [
        a for a in registry.get("assets", [])
        if a.get("presentation") == "public_article"
        and a.get("public_path")
        and str(a.get("path", "")).lower().endswith(".md")
    ]
    if args.asset_id:
        wanted = set(args.asset_id)
        assets = [a for a in assets if a.get("asset_id") in wanted]

    for asset in assets:
        target = build(asset)
        print(f"{asset.get('asset_id')}: {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
