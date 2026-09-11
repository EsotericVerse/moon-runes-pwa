from pathlib import Path
import re

css_path = Path('css/style.css')
css = css_path.read_text(encoding='utf-8')
before = len(css)

# RC3 conservative cleanup: remove only selectors that belong to UI already
# moved away from lots.html or removed from runes.html.
STALE_LOTS_TOKENS = (
    '.daily-record-grid', '.daily-record-form', '.daily-stats-panel',
    '.daily-form-grid', '.daily-record-submit', '.daily-record-status',
    '.daily-metrics', '.daily-metric', '.daily-history-list',
    '.daily-history-pagination', '.daily-history-page-info', '.daily-history-pages'
)
STALE_RUNES_TOKENS = ('#libraryView', '#dailyView', '#drawView', '#rune-modal')

# Remove ordinary CSS rules only. Keep @media blocks intact; rules inside them
# are removed independently by the same pass because the regex walks all rules.
rule_re = re.compile(r'(?P<selectors>[^{}]+)\{(?P<body>[^{}]*)\}', re.S)
removed = []

def keep_rule(m):
    selectors = m.group('selectors')
    stripped = selectors.strip()
    # Never interpret at-rules as selectors.
    if stripped.startswith('@'):
        return m.group(0)
    stale_lots = 'body.loc-page-lots' in selectors and any(t in selectors for t in STALE_LOTS_TOKENS)
    stale_runes = 'body.loc-page-runes' in selectors and any(t in selectors for t in STALE_RUNES_TOKENS)
    if stale_lots or stale_runes:
        removed.append(' '.join(stripped.split()))
        return ''
    return m.group(0)

# Multiple passes allow removal of simple rules inside media blocks without
# flattening or rewriting the media blocks themselves.
for _ in range(3):
    new_css = rule_re.sub(keep_rule, css)
    if new_css == css:
        break
    css = new_css

# Collapse excessive blank lines caused by rule deletion, without reformatting CSS.
css = re.sub(r'\n{4,}', '\n\n\n', css)

# Safety checks.
if css.count('{') != css.count('}'):
    raise SystemExit('CSS brace mismatch after cleanup')
for token in STALE_LOTS_TOKENS:
    # Only lots-scoped occurrences are forbidden; statics may legitimately use them.
    if re.search(r'body\.loc-page-lots[^{}]*' + re.escape(token), css):
        raise SystemExit(f'stale lots CSS remains: {token}')
for token in STALE_RUNES_TOKENS:
    if re.search(r'body\.loc-page-runes[^{}]*' + re.escape(token), css):
        raise SystemExit(f'stale runes CSS remains: {token}')

css_path.write_text(css, encoding='utf-8')
print(f'CSS bytes/chars: {before} -> {len(css)} (removed {before-len(css)})')
print(f'Removed rules: {len(removed)}')
for item in removed:
    print(' -', item)
