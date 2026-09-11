from pathlib import Path

p = Path('js/rune.js')
s = p.read_text(encoding='utf-8')

old = '''  function realMoonPhase(){\n    return window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知';\n  }'''
new = '''  function phaseCategory(value){\n    const raw=clean(value);\n    if(raw === '無' || raw === '空亡') return '空亡';\n    return PHASES.has(raw) ? raw : (raw || '未知');\n  }\n\n  function realMoonPhase(){\n    return phaseCategory(window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知');\n  }'''
if old not in s:
    raise SystemExit('realMoonPhase block not found')
s = s.replace(old, new, 1)

old = '''  function cardPhase(rune){\n    const raw=valueOf(rune,'月相','moon_phase');\n    if(raw === '無' || raw === '空亡') return '空亡';\n    return PHASES.has(raw) ? raw : '空亡';\n  }'''
new = '''  function cardPhase(rune){\n    const raw=valueOf(rune,'月相','moon_phase');\n    return phaseCategory(raw) === '未知' ? '空亡' : phaseCategory(raw);\n  }'''
if old not in s:
    raise SystemExit('cardPhase block not found')
s = s.replace(old, new, 1)

old = '''  function fields(rune, direction=''){\n    const note=valueOf(rune,'特別說明','說明','description');\n    const archetype=valueOf(rune,'人格原型','archetype');\n    const keyword=valueOf(rune,'關鍵詞','keyword');\n    const reverse=valueOf(rune,'反向關鍵詞','反向關鍵字','reverse_keyword');\n    const rows=[\n      ['說明', `${note} / ${archetype}`],\n      ['關鍵詞', `${keyword} / ${reverse}`],\n      ['所屬分組', groupLabel(rune)],\n      ['卡片詞性', cardAttribute(rune)],\n      ['月相', `卡片 ${cardPhase(rune)} / 目前 ${realMoonPhase()}`]\n    ];\n    if(clean(direction)) rows.push(['卡片位向', clean(direction), 'position']);\n    return rows;\n  }\n\n  function fieldHtml(label,value,type=''){\n    const emphasis=type === 'position' ? ' loc-rune-position-bubble' : '';\n    return `<div class="rune-result-field loc-rune-info-bubble${emphasis}"><span class="rune-result-label">${esc(label)}：</span><span class="rune-result-value">${esc(value)}</span></div>`;\n  }\n\n  function infoGridHtml(rune, direction=''){\n    return `<div class="loc-rune-info-grid">${fields(rune,direction).map(([label,value,type])=>`<div class="loc-rune-info-bubble${type === 'position' ? ' loc-rune-position-bubble' : ''}"><strong>${esc(label)}：</strong>${esc(value)}</div>`).join('')}</div>`;\n  }'''
new = '''  function primaryFields(rune){\n    const note=valueOf(rune,'特別說明','說明','description');\n    const archetype=valueOf(rune,'人格原型','archetype');\n    return [\n      ['說明', `${note} / ${archetype}`],\n      ['所屬分組', groupLabel(rune)]\n    ];\n  }\n\n  function detailFields(rune){\n    const keyword=valueOf(rune,'關鍵詞','keyword');\n    const reverse=valueOf(rune,'反向關鍵詞','反向關鍵字','reverse_keyword');\n    return [\n      ['關鍵詞', `${keyword} / ${reverse}`],\n      ['卡片詞性', cardAttribute(rune)],\n      ['月相', `卡片 ${cardPhase(rune)} / 目前 ${realMoonPhase()}`]\n    ];\n  }\n\n  function fieldHtml(label,value,type=''){\n    const emphasis=type === 'position' ? ' loc-rune-position-bubble' : '';\n    return `<div class="rune-result-field loc-rune-info-bubble${emphasis}"><span class="rune-result-label">${esc(label)}：</span><span class="rune-result-value">${esc(value)}</span></div>`;\n  }\n\n  function detailsHtml(rune){\n    return `<details class="loc-rune-details"><summary>關鍵詞 · 卡片詞性 · 月相</summary><div class="loc-rune-details-body">${detailFields(rune).map(([label,value])=>fieldHtml(label,value)).join('')}</div></details>`;\n  }\n\n  function infoGridHtml(rune, direction=''){\n    const primary=primaryFields(rune).map(([label,value])=>`<div class="loc-rune-info-bubble"><strong>${esc(label)}：</strong>${esc(value)}</div>`).join('');\n    const position=clean(direction) ? `<div class="loc-rune-info-bubble loc-rune-position-bubble"><strong>卡片位向：</strong>${esc(clean(direction))}</div>` : '';\n    return `<div class="loc-rune-info-grid">${primary}${detailsHtml(rune)}${position}</div>`;\n  }'''
if old not in s:
    raise SystemExit('fields/infoGrid block not found')
s = s.replace(old, new, 1)

old = '''    grid.classList.add('loc-rune-info-grid');\n    grid.innerHTML=fields(rune,direction).map(([label,value,type])=>fieldHtml(label,value,type)).join('');\n    markGoverned(card);'''
new = '''    grid.classList.add('loc-rune-info-grid');\n    const primary=primaryFields(rune).map(([label,value])=>fieldHtml(label,value)).join('');\n    const position=clean(direction) ? fieldHtml('卡片位向',clean(direction),'position') : '';\n    grid.innerHTML=`${primary}${detailsHtml(rune)}${position}`;\n    markGoverned(card);'''
if old not in s:
    raise SystemExit('governDrawCard render block not found')
s = s.replace(old, new, 1)

# Fix title escape typo while touching canonical renderer.
s = s.replace("'\"':'&quot'", "'\"':'&quot;'")

# Contract assertions: no old flat-field renderer remains.
for forbidden in ["fields(rune,direction)", "['關鍵詞', `${keyword} / ${reverse}`],\\n      ['所屬分組'"]:
    if forbidden in s:
        raise SystemExit(f'legacy flat rune field renderer remains: {forbidden}')
for required in ['primaryFields(rune)', 'detailFields(rune)', 'loc-rune-details', '卡片位向', 'phaseCategory']:
    if required not in s:
        raise SystemExit(f'missing rune card contract: {required}')

p.write_text(s, encoding='utf-8')

cssp = Path('css/style.css')
css = cssp.read_text(encoding='utf-8')
marker = '/* LunaRunes collapsible detail bubbles */'
if marker not in css:
    css += '''\n\n/* LunaRunes collapsible detail bubbles */\n.loc-rune-details{width:100%;margin:0;border:0}\n.loc-rune-details>summary{box-sizing:border-box;width:100%;padding:9px 11px;border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)));border-radius:12px;background:rgba(255,255,255,.035);color:var(--gold,var(--loc-gold,#e7c27d));font-size:.78rem;font-weight:800;line-height:1.55;cursor:pointer;list-style-position:inside}\n.loc-rune-details[open]>summary{margin-bottom:8px}\n.loc-rune-details-body{display:grid;grid-template-columns:1fr;gap:8px}\n.loc-rune-position-bubble{font-size:.9rem!important;font-weight:900!important;color:var(--gold,var(--loc-gold,#e7c27d))!important}\n'''
    cssp.write_text(css, encoding='utf-8')
