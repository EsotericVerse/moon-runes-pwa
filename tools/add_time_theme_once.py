from pathlib import Path

nav_path=Path('js/loc-nav.js')
nav=nav_path.read_text(encoding='utf-8')
if 'const THEME_STORAGE_KEY = "loc-theme";' not in nav:
    anchor='  const fileName = () => location.pathname.split("/").pop() || "index.html";\n'
    block='''  const THEME_STORAGE_KEY = "loc-theme";\n  const THEME_MODES = new Set(["auto","day","night"]);\n  const DAY_START_HOUR = 6;\n  const NIGHT_START_HOUR = 18;\n\n  function getThemeMode(){\n    try {\n      const saved=localStorage.getItem(THEME_STORAGE_KEY);\n      return THEME_MODES.has(saved) ? saved : "auto";\n    } catch { return "auto"; }\n  }\n\n  function resolveAutoTheme(now=new Date()){\n    const hour=now.getHours();\n    return hour>=DAY_START_HOUR && hour<NIGHT_START_HOUR ? "day" : "night";\n  }\n\n  function syncThemeControl(){\n    const select=document.querySelector("[data-loc-theme-select]");\n    if(select) select.value=getThemeMode();\n  }\n\n  function applyTheme(mode=getThemeMode()){\n    const safe=THEME_MODES.has(mode) ? mode : "auto";\n    const resolved=safe==="auto" ? resolveAutoTheme() : safe;\n    document.documentElement.dataset.theme=safe;\n    document.documentElement.dataset.themeResolved=resolved;\n    document.documentElement.style.colorScheme=resolved==="day" ? "light" : "dark";\n    syncThemeControl();\n  }\n\n  function setThemeMode(mode){\n    if(!THEME_MODES.has(mode)) return;\n    try { localStorage.setItem(THEME_STORAGE_KEY,mode); } catch {}\n    applyTheme(mode);\n  }\n\n  function themeControlHtml(){\n    return `<label class="loc-theme-control"><span>風格</span><select data-loc-theme-select aria-label="即時風格"><option value="auto">自動</option><option value="day">白天</option><option value="night">夜間</option></select></label>`;\n  }\n\n'''
    if anchor not in nav: raise SystemExit('fileName anchor missing')
    nav=nav.replace(anchor,anchor+block,1)

    old='      node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${home}`;'
    new='      node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${themeControlHtml()}${home}`;'
    if old not in nav: raise SystemExit('nav render anchor missing')
    nav=nav.replace(old,new,1)

    old='''  document.addEventListener("click",event=>{\n    const control=event.target.closest('.loc-nav-tier[data-tier="2"] .loc-nav-tier-link');'''
    new='''  document.addEventListener("change",event=>{\n    const select=event.target.closest("[data-loc-theme-select]");\n    if(select) setThemeMode(select.value);\n  });\n\n  document.addEventListener("click",event=>{\n    const control=event.target.closest('.loc-nav-tier[data-tier="2"] .loc-nav-tier-link');'''
    if old not in nav: raise SystemExit('click anchor missing')
    nav=nav.replace(old,new,1)

    old='''  window.addEventListener("hashchange",syncCurrent);\n  window.addEventListener("DOMContentLoaded",()=>{\n    renderNav1();'''
    new='''  applyTheme();\n  window.setInterval(()=>{ if(getThemeMode()==="auto") applyTheme("auto"); },60000);\n  window.addEventListener("storage",event=>{ if(event.key===THEME_STORAGE_KEY) applyTheme(); });\n  window.addEventListener("hashchange",syncCurrent);\n  window.addEventListener("DOMContentLoaded",()=>{\n    renderNav1();\n    syncThemeControl();'''
    if old not in nav: raise SystemExit('DOMContentLoaded anchor missing')
    nav=nav.replace(old,new,1)
    nav_path.write_text(nav,encoding='utf-8')

css_path=Path('css/style.css')
css=css_path.read_text(encoding='utf-8')
marker='/* TIME THEME SYSTEM · Auto / Day / Night */'
if marker not in css:
    css += r'''

/* TIME THEME SYSTEM · Auto / Day / Night */
html[data-theme-resolved="night"]{color-scheme:dark}
html[data-theme-resolved="day"]{color-scheme:light}
html[data-theme-resolved="day"] body{
  --bg:#eef3f7;--surface:rgba(255,255,255,.94);--surface2:rgba(235,241,247,.96);--soft:rgba(230,237,245,.92);--panel:#f8fafc;
  --line:rgba(55,75,96,.18);--line-strong:rgba(55,75,96,.34);--border:rgba(55,75,96,.18);
  --text:#172334;--muted:#5f7082;--purple:#625095;--gold:#8b682b;--accent:#376c98;--accent-2:#8b682b;--shadow:0 18px 48px rgba(43,61,79,.14);
  color:var(--text)!important;
  background:radial-gradient(circle at 10% 8%,rgba(119,105,169,.13),transparent 30rem),radial-gradient(circle at 88% 88%,rgba(91,151,176,.11),transparent 30rem),linear-gradient(180deg,#f4f7fa 0%,#edf3f7 62%,#e7eef4 100%)!important;
}
html[data-theme-resolved="day"] body .loc-global-nav,html[data-theme-resolved="day"] body .loc-nav-tiers{background:rgba(244,247,250,.95)!important}
html[data-theme-resolved="day"] body input,html[data-theme-resolved="day"] body select,html[data-theme-resolved="day"] body textarea{color:var(--text);background:rgba(255,255,255,.76)}
html[data-theme-resolved="day"] body .card,html[data-theme-resolved="day"] body .panel,html[data-theme-resolved="day"] body .search-panel,html[data-theme-resolved="day"] body .gov-card,html[data-theme-resolved="day"] body .rune-group,html[data-theme-resolved="day"] body .rune-tile,html[data-theme-resolved="day"] body .context-tool-card,html[data-theme-resolved="day"] body .context-graph-panel,html[data-theme-resolved="day"] body .era,html[data-theme-resolved="day"] body .keyword-card,html[data-theme-resolved="day"] body .trajectory-card,html[data-theme-resolved="day"] body .event-card,html[data-theme-resolved="day"] body .daily-record-form,html[data-theme-resolved="day"] body .daily-stats-panel,html[data-theme-resolved="day"] body .stats-metric,html[data-theme-resolved="day"] body article{background:var(--surface)!important;border-color:var(--line)!important;box-shadow:var(--shadow)}
html[data-theme-resolved="day"] body .loc-guidance-note,html[data-theme-resolved="day"] body .loc-concept-note,html[data-theme-resolved="day"] body .quick-selector,html[data-theme-resolved="day"] body .quick-selector-detail{background:var(--surface2)!important;color:var(--text)!important}
html[data-theme-resolved="day"] body .loc-header-copy,html[data-theme-resolved="day"] body .lead,html[data-theme-resolved="day"] body .intro,html[data-theme-resolved="day"] body .muted,html[data-theme-resolved="day"] body .summary{color:var(--muted)!important}
.loc-theme-control{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:.72rem;white-space:nowrap}
.loc-theme-control span{font-weight:700}
.loc-theme-control select{height:32px;min-width:66px;padding:3px 22px 3px 8px;border:1px solid var(--line);border-radius:999px;background:var(--surface2);color:var(--text);font:inherit;font-size:.72rem;cursor:pointer}
@media(max-width:760px){.loc-theme-control span{display:none}.loc-theme-control select{min-width:58px}.loc-theme-control+.loc-global-home{margin-left:0}}
'''
    css_path.write_text(css,encoding='utf-8')

print('theme patch ready')
