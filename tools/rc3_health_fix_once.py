from pathlib import Path
import re

# 1. lots.html: only operational views that actually belong to lots.
p = Path('lots.html')
s = p.read_text(encoding='utf-8')
s = s.replace('  <script type="module" src="js/rune-daily-records.js?v=20260908-1"></script>\n', '')

old_views = '''    const views={
      reference:document.getElementById('referenceView'),
      examples:document.getElementById('examplesView'),
      systems:document.getElementById('systemsView'),
      library:document.getElementById('libraryView'),
      daily:document.getElementById('dailyView'),
      draw:document.getElementById('drawView')
    };'''
new_views = '''    const views={
      library:document.getElementById('libraryView'),
      draw:document.getElementById('drawView')
    };'''
if old_views not in s:
    raise SystemExit('lots views block did not match expected current main')
s = s.replace(old_views, new_views, 1)

old_switch = '''    if(mode==='daily') switchView('draw',false);
    else if(location.hash==='#daily') switchView('daily',false);
    else if(hasMode||location.hash==='#draw') switchView('draw',false);
    else if(location.hash==='#reference') switchView('reference',false);
    else if(location.hash==='#examples') switchView('examples',false);
    else if(location.hash==='#systems') switchView('systems',false);
    else if(location.hash==='#library') switchView('library',false);
    else switchView('draw',false);'''
new_switch = '''    if(hasMode||location.hash==='#draw') switchView('draw',false);
    else if(location.hash==='#library') switchView('library',false);
    else switchView('draw',false);'''
if old_switch not in s:
    raise SystemExit('lots hash switch block did not match expected current main')
s = s.replace(old_switch, new_switch, 1)
p.write_text(s, encoding='utf-8')

# 2. Service worker: force fresh CSS/runtime for RC3 candidate.
p = Path('service-worker.js')
s = p.read_text(encoding='utf-8')
s, n = re.subn(r'const CACHE_NAME = "moon-runes-pwa-v\d+";', 'const CACHE_NAME = "moon-runes-pwa-v217";', s, count=1)
if n != 1:
    raise SystemExit('cache name not found')
s = s.replace('/js/rune-daily-records.js?v=20260908-1', '/js/rune-daily-records.js?v=20260913-1')
p.write_text(s, encoding='utf-8')

print('RC3 runtime fixes applied')
