from pathlib import Path
import json

REPLACEMENTS = {
    'index.html': [('statics.htm#ranking', 'statics.html#ranking')],
    'context.html': [('loc2-game.html', 'game.html')],
    'data/json/search/faq/LOC_FAQ_v0.4.json': [('loc2-game.html', 'game.html')],
    'data/json/search/faq/LOC_FAQ_RAG_v0.4.json': [('loc2-game.html', 'game.html')],
    'data/json/registries/LOC2_EVENT_REGISTRY.json': [('loc2-game.html', 'game.html')],
}
for filename, pairs in REPLACEMENTS.items():
    p=Path(filename)
    text=p.read_text(encoding='utf-8')
    for old,new in pairs:
        text=text.replace(old,new)
    p.write_text(text,encoding='utf-8')

# README: remove the obsolete redirect file from the current tree listing.
p=Path('README.md')
text=p.read_text(encoding='utf-8')
text=text.replace('├── loc2-game.html       # legacy compatibility redirect\n','')
p.write_text(text,encoding='utf-8')

# Terminology registry: the redirect is now retired, not active compatibility.
p=Path('data/json/registries/LOC_TERMINOLOGY_CANON.json')
data=json.loads(p.read_text(encoding='utf-8'))
m=data['migration_status']['legacy_path_migration']
m['compatibility_redirects']=[]
retired=m.setdefault('retired_paths',[])
for name in ('statics.htm','statics.htmll','loc2-game.html'):
    if name not in retired: retired.append(name)
m['runtime_normalization']='canonical HTML paths only; historical migration aliases remain in governance records'
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Runtime nav no longer needs to repair links that must not exist in current HTML.
p=Path('js/loc-nav.js')
text=p.read_text(encoding='utf-8')
text=text.replace('  const LEGACY_STATICS_RE = /(^|\\/)statics\\.htm(?:ll)?(?=([?#]|$))/;\n','')
start=text.find('  function normalizeLegacyLinks(root=document){')
if start!=-1:
    end=text.find('\n  }\n',start)
    if end!=-1:
        text=text[:start]+text[end+5:]
text=text.replace('    normalizeLegacyLinks(document);\n','')
p.write_text(text,encoding='utf-8')

# Governance validator prevents deleted compatibility page from returning.
p=Path('card_api/scripts/validate_repo_layout.py')
text=p.read_text(encoding='utf-8')
needle='    ROOT / "statics.htmll",\n'
if 'ROOT / "loc2-game.html"' not in text:
    text=text.replace(needle,needle+'    ROOT / "loc2-game.html",\n')
p.write_text(text,encoding='utf-8')

# Delete obsolete page; statics.htm is already absent.
legacy=Path('loc2-game.html')
if legacy.exists(): legacy.unlink()

# Current-facing files must no longer reference retired page names.
for filename in ['index.html','context.html','README.md','js/loc-nav.js','data/json/search/faq/LOC_FAQ_v0.4.json','data/json/search/faq/LOC_FAQ_RAG_v0.4.json','data/json/registries/LOC2_EVENT_REGISTRY.json']:
    text=Path(filename).read_text(encoding='utf-8')
    if 'loc2-game.html' in text or 'statics.htm#' in text:
        raise SystemExit(f'legacy current-facing reference remains: {filename}')
if Path('loc2-game.html').exists() or Path('statics.htm').exists() or Path('statics.htmll').exists():
    raise SystemExit('legacy page still exists')
