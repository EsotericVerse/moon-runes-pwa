from pathlib import Path
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
s=s.replace('moon-runes-pwa-v217','moon-runes-pwa-v218')
anchor='  "/js/statics-dashboard.js",\n'
insert='  "/js/rune-analytics.js",\n  "/js/rune-context-graph.js",\n'
if '"/js/rune-analytics.js"' not in s:
    assert anchor in s
    s=s.replace(anchor,anchor+insert,1)
assert 'moon-runes-pwa-v218' in s
assert s.count('"/js/rune-analytics.js"')==1
assert s.count('"/js/rune-context-graph.js"')==1
p.write_text(s,encoding='utf-8')
print('service worker updated')
