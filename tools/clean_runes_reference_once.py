from pathlib import Path

# Clean runes.html to reference-only page.
p=Path('runes.html')
s=p.read_text(encoding='utf-8')
start=s.find('      <div class="runes-view" id="libraryView"')
end=s.find('\n  </main>', start)
if start!=-1 and end!=-1:
    s=s[:start]+s[end:]

# Remove obsolete modal if present.
modal_start=s.find('  <dialog id="rune-modal"')
nav_script=s.find('  <script src="js/loc-nav.js"', modal_start)
if modal_start!=-1 and nav_script!=-1:
    s=s[:modal_start]+s[nav_script:]

# Replace old all-view switcher with reference-only switcher.
script_start=s.find('  <script>\n  (()=> {')
script_end=s.find('  </script>', script_start)
if script_start!=-1 and script_end!=-1:
    script_end += len('  </script>')
    new_script='''  <script>\n  (()=>{\n    const buttons=[...document.querySelectorAll('[data-runes-view]')];\n    const views={\n      reference:document.getElementById('referenceView'),\n      examples:document.getElementById('examplesView'),\n      systems:document.getElementById('systemsView')\n    };\n    function switchView(name,updateUrl=true){\n      const safe=views[name]?name:'reference';\n      Object.entries(views).forEach(([key,view])=>{ if(view) view.hidden=key!==safe; });\n      buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.runesView===safe));\n      if(updateUrl) history.replaceState(null,'','runes.html#'+safe);\n    }\n    buttons.forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.runesView)));\n    const hash=location.hash.slice(1);\n    switchView(views[hash]?hash:'reference',false);\n  })();\n  </script>'''
    s=s[:script_start]+new_script+s[script_end:]

p.write_text(s,encoding='utf-8')

# Add Daily Rune to statics NAV2, and keep LunaRunes nav role clear.
p=Path('js/loc-nav.js')
s=p.read_text(encoding='utf-8')
old='''      link("排行榜","statics.html#ranking"),\n      link("符文統計","statics.html#runes"),\n      link("來源管理","statics.html#sources"),\n      link("匯入","statics.html#import")'''
new='''      link("排行榜","statics.html#ranking"),\n      link("符文統計","statics.html#runes"),\n      link("每日符文","statics.html#daily"),\n      link("來源管理","statics.html#sources"),\n      link("匯入","statics.html#import")'''
if old in s:
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

print('cleaned runes reference-only and routed daily stats to statics')
