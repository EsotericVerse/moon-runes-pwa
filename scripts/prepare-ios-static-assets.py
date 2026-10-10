#!/usr/bin/env python3
"""Make only the exported iOS web payload ASCII-safe for Windows AltServer.

Keep canonical repository/PWA PNG names, Rune definitions, and page text unchanged.
"""
from pathlib import Path
from urllib.parse import quote
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out')
cards = root / 'assets/lunarunes/cards'
if not (root / 'index.html').is_file() or not cards.is_dir():
    raise SystemExit('Missing Next.js static export or LunaRunes cards directory')

images = sorted(path for path in cards.iterdir() if re.fullmatch(r'\d{2}_[^\x00-\x7f]+\.png', path.name))
if len(images) != 66 or sorted(int(p.name[:2]) for p in images) != list(range(1, 67)):
    raise SystemExit('Expected exactly 66 uniquely numbered LunaRunes Chinese-named PNG files')

aliases = [(p.name, p.name[:2] + '.png') for p in images]
text_suffixes = {'.js', '.html', '.css', '.json', '.txt', '.xml', '.webmanifest'}
template = re.compile(r'/assets/lunarunes/cards/\$\{([^}]+)\}_\$\{[^}]+\}\.png')
concatenation = re.compile(r'"/assets/lunarunes/cards/"\+String\((\w+)\.id\)\.padStart\(2,"0"\)\+"_"\+String\(\1\.name\)\.replace\(/之符文\$/,""\)\.trim\(\)\+"\.png"')
paths_changed = 0
dynamics_changed = 0
files_changed = 0

for file in root.rglob('*'):
    if not file.is_file() or file.suffix not in text_suffixes:
        continue
    before = file.read_text(encoding='utf-8')
    after = before
    for original, alias in aliases:
        for needle in ('/assets/lunarunes/cards/' + original,
                       '/assets/lunarunes/cards/' + quote(original)):
            count = after.count(needle)
            if count:
                after = after.replace(needle, '/assets/lunarunes/cards/' + alias)
                paths_changed += count
    after, count = template.subn(lambda m: '/assets/lunarunes/cards/' + ' + m.group(1) + .png', after)
    dynamics_changed += count
    after, count = concatenation.subn(lambda m: '"/assets/lunarunes/cards/"+String(' + m.group(1) + '.id).padStart(2,"0")+".png"', after)
    dynamics_changed += count
    if template.search(after) or concatenation.search(after):
        raise SystemExit('Unconverted dynamic rune image path in ' + str(file))
    for match in re.finditer(r'/assets/lunarunes/cards/([^"\'<>\s]+\.png)', after):
        if not match.group(1).isascii():
            raise SystemExit('Unconverted Chinese rune image URL in ' + str(file))
    if after != before:
        file.write_text(after, encoding='utf-8')
        files_changed += 1

if paths_changed < 4 or dynamics_changed < 4:
    raise SystemExit(f'Unexpected static output structure: {paths_changed} literal and {dynamics_changed} dynamic replacements')

for old, new in aliases:
    destination = cards / new
    if destination.exists():
        raise SystemExit(f'Duplicate native rune image filename: {new}')
    (cards / old).rename(destination)

if any(not p.name.isascii() for p in root.rglob('*')):
    raise SystemExit('Non-ASCII iOS static payload pathname remains')
print(f'iOS-only export ready: {len(aliases)} numeric PNG filenames, {files_changed} pages/chunks, {paths_changed} literal URLs, {dynamics_changed} dynamic URLs')
