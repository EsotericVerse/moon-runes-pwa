from pathlib import Path

nav_path=Path('js/loc-nav.js')
nav=nav_path.read_text(encoding='utf-8')
old='''  function buildIndex(host){\n    const top=document.getElementById("top")||document.querySelector("main,.loc-page");\n    if(top&&!top.id) top.id="top";\n    host.appendChild(tier([\n      link("模組",sectionHref("framework-map"))\n    ],"首頁模組入口"));\n  }'''
new='''  function buildIndex(){\n    const top=document.getElementById("top")||document.querySelector("main,.loc-page");\n    if(top&&!top.id) top.id="top";\n  }'''
if old not in nav:
    raise SystemExit('buildIndex block not found')
nav=nav.replace(old,new,1)
nav_path.write_text(nav,encoding='utf-8')

css_path=Path('css/style.css')
css=css_path.read_text(encoding='utf-8')
marker='/* THEME CONTROL NEUTRAL UI */'
if marker not in css:
    css += '''\n\n/* THEME CONTROL NEUTRAL UI */\n.loc-theme-control{color:var(--muted)!important}\n.loc-theme-control select{border-color:var(--line)!important;background:transparent!important;color:var(--muted)!important;box-shadow:none!important}\n.loc-theme-control select:hover,.loc-theme-control select:focus{border-color:var(--line-strong)!important;background:var(--surface2)!important;color:var(--text)!important;outline:none}\nhtml[data-theme-resolved="day"] body .loc-theme-control select{background:rgba(255,255,255,.36)!important;color:var(--muted)!important}\n'''
    css_path.write_text(css,encoding='utf-8')

print('fixed homepage tier and neutralized theme control')
