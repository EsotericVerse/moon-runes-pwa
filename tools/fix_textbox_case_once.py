from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
repls = {
'''    .evolution-step small {
      display: block;
      margin-top: 4px;
      color: var(--loc-purple);
      font-size: .7rem;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
    }''': '''    .evolution-step small {
      display: block;
      margin-top: 4px;
      color: var(--loc-purple);
      font-size: .7rem;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: none;
    }''',
'''    .action-card .kicker {
      color: var(--loc-purple);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }''': '''    .action-card .kicker {
      color: var(--loc-purple);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.11em;
      text-transform: none;
    }'''
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit('Expected text-box casing rule not found')
    s = s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
