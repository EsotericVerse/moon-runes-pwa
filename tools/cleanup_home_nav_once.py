from pathlib import Path
import re

# 1) Homepage tier: keep only the module/framework entry.
nav_path = Path('js/loc-nav.js')
nav = nav_path.read_text(encoding='utf-8')
old = '''  function buildIndex(host){
    const top=document.getElementById("top")||document.querySelector("main,.loc-page");
    if(top&&!top.id) top.id="top";
    host.appendChild(tier([
      link("LOC月典簡介",sectionHref("top")),
      link("新手上路",sectionHref("start-title","start")),
      link("LOC架構圖",sectionHref("framework-map")),
      link("目前進度",sectionHref("current-progress")),
      link("作者的話",sectionHref("about-title","about"))
    ],"首頁快速選單"));
  }
'''
new = '''  function buildIndex(host){
    const top=document.getElementById("top")||document.querySelector("main,.loc-page");
    if(top&&!top.id) top.id="top";
    host.appendChild(tier([
      link("模組",sectionHref("framework-map"))
    ],"首頁模組入口"));
  }
'''
if old not in nav:
    raise SystemExit('buildIndex block not found')
nav = nav.replace(old, new, 1)
nav_path.write_text(nav, encoding='utf-8')

# 2) Bottom text-only quick links, separate from NAV tiers.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
style_marker = '<style id="loc-site-footer-style">'
quick_style = '''<style id="home-quick-links-style">
.home-quick-links{margin:28px 0 0;padding:12px 0;text-align:center;color:var(--loc-muted,#7f8794);font-size:.82rem;line-height:1.8}
.home-quick-links a{color:inherit;text-decoration:none}
.home-quick-links a:hover,.home-quick-links a:focus-visible{color:var(--loc-gold,#e7c27d);text-decoration:underline}
.home-quick-links span{margin:0 .45em;opacity:.55}
</style>
'''
if 'id="home-quick-links-style"' not in index:
    if style_marker not in index:
        raise SystemExit('footer style marker not found')
    index = index.replace(style_marker, quick_style + style_marker, 1)

quick_nav = '''<nav class="home-quick-links" aria-label="首頁快速連結">
  <a href="#top">簡介</a><span>·</span>
  <a href="#start-title">新手上路</a><span>·</span>
  <a href="#framework-map">模組</a><span>·</span>
  <a href="#current-progress">進度</a><span>·</span>
  <a href="#skills">Skills</a><span>·</span>
  <a href="#about-title">作者的話</a>
</nav>

'''
footer_marker = '<footer class="loc-site-footer"'
if 'class="home-quick-links"' not in index:
    if footer_marker not in index:
        raise SystemExit('footer marker not found')
    index = index.replace(footer_marker, quick_nav + footer_marker, 1)
index_path.write_text(index, encoding='utf-8')
