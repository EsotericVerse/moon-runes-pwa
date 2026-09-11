from pathlib import Path
p=Path('css/style.css')
css=p.read_text(encoding='utf-8')
marker='/* NAV1 COLOR CANON */'
if marker not in css:
    css += '''\n\n/* NAV1 COLOR CANON */\nhtml body .loc-global-shell .loc-global-link,\nhtml body .loc-global-shell .loc-global-home{color:var(--text)!important}\nhtml body .loc-global-shell .loc-global-link:hover,\nhtml body .loc-global-shell .loc-global-link:focus-visible,\nhtml body .loc-global-shell .loc-global-link[aria-current="page"],\nhtml body .loc-global-shell .loc-global-home:hover,\nhtml body .loc-global-shell .loc-global-home:focus-visible{color:var(--text)!important;border-bottom-color:var(--gold)!important}\nhtml[data-theme-resolved="day"] body .loc-global-shell .loc-global-link,\nhtml[data-theme-resolved="day"] body .loc-global-shell .loc-global-home{color:#27384a!important}\n'''
    p.write_text(css,encoding='utf-8')
print('nav1 color canon fixed')
