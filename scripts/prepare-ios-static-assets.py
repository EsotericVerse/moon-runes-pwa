#!/usr/bin/env python3
"""Read-only validation of the canonical two-digit Rune PNG assets.

Both Web and iOS must use the original checked-in numeric filenames.
Never patch generated JS or rename files during Capacitor packaging.
"""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out')
cards = root / 'assets/lunarunes/cards'
if not (root / 'index.html').is_file() or not cards.is_dir():
    raise SystemExit('Missing static export or LunaRunes cards directory')

expected = {f'{i:02}.png' for i in range(1, 67)}
actual = {p.name for p in cards.iterdir() if p.is_file()}
if actual != expected:
    raise SystemExit(f'Rune image filenames mismatch: missing={sorted(expected - actual)}, extra={sorted(actual - expected)}')

for name in expected:
    with (cards / name).open('rb') as file:
        if file.read(8) != b'\x89PNG\r\n\x1a\n':
            raise SystemExit('Invalid Rune image PNG signature: ' + name)

for file in root.rglob('*'):
    if not file.is_file() or file.suffix not in {'.js', '.html', '.css', '.json', '.txt', '.xml', '.webmanifest'}:
        continue
    if re.search(r'/assets/lunarunes/cards/\d{2}_[^\s"\'<>]+\.png', file.read_text('utf-8')):
        raise SystemExit('Legacy name-based Rune image URL remains: ' + str(file))
print('iOS and Web Rune assets verified: 66 unchanged numeric PNGs and no legacy URLs')
