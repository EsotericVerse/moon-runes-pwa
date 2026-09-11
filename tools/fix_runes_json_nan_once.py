from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'data/json/core/runes.json'
text = path.read_text(encoding='utf-8')
if 'NaN' not in text:
    raise SystemExit('No NaN found; nothing to fix')
text = text.replace('NaN', '""')
# Validate strict JSON after replacement.
json.loads(text)
path.write_text(text, encoding='utf-8')
print('Replaced NaN with empty strings and validated strict JSON')
