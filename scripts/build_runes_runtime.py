#!/usr/bin/env python3
"""Generate browser runtime modules from the canonical rune projection.

Authority chain:
    LunaRune66.xlsx -> data/json/core/runes.json -> generated JS runtime

Browser/runtime code must never fetch rune JSON directly. The JSON file is a
build-time projection only; generated JavaScript contains the runtime values.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "json" / "core" / "runes.json"
RUNES_JS = ROOT / "js" / "runes66.js"
DIRECTION_JS = ROOT / "js" / "direction64.js"


def load_rows() -> list[dict]:
    payload = json.loads(SOURCE.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("runes", [])
    if not isinstance(rows, list):
        raise SystemExit("runes.json must be an array or contain a runes array")

    ids = {int(row.get("編號", row.get("id"))) for row in rows}
    required = set(range(0, 67))
    missing = sorted(required - ids)
    if missing:
        raise SystemExit(f"runes.json missing ids: {missing}")
    return rows


def build_runes_js(rows: list[dict]) -> str:
    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    return f'''/* AUTO-GENERATED. DO NOT EDIT BY HAND.
 * Source of generation: data/json/core/runes.json
 * Mother source / SSOT: LunaRune66.xlsx
 * Runtime has NO JSON dependency. Regenerate with:
 *   python scripts/build_runes_runtime.py
 */

const runeRows = {payload};

export const rune = [null];
for (const row of runeRows) {{
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = {{
    ...row,
    編號: id,
    符文名稱: row.符文名稱 ?? row.名稱 ?? row.name,
    英文: row.英文 ?? row.english,
    圖騰: row.圖騰 ?? row.icon ?? null,
    所屬分組: row.所屬分組 ?? row.group,
    月相: row.月相 ?? row.moon_phase ?? null,
    卡片屬性: row.卡片屬性 ?? row.card_attribute,
    關鍵詞: row.關鍵詞 ?? row.keyword,
    圖檔名稱: row.image ?? row.圖檔名稱 ?? (id > 0 ? `${{String(id).padStart(2, '0')}}_${{row.符文名稱 ?? row.名稱 ?? row.name}}.png` : null),
    drawable: row.drawable ?? (id >= 1 && id <= 66)
  }};
}}

export const runeZero = runeRows.find(row => Number(row?.編號 ?? row?.id) === 0) ?? null;

const groupMap = new Map();
for (const row of runeRows) {{
  const id = Number(row?.編號 ?? row?.id);
  if (id < 1 || id > 66) continue;
  const name = String(row?.所屬分組 ?? row?.group ?? '');
  if (!groupMap.has(name)) groupMap.set(name, []);
  groupMap.get(name).push({{ id, name: row.符文名稱 ?? row.名稱 ?? row.name }});
}}
export const groups = [...groupMap.entries()].map(([group_zh, runes]) => ({{ group_zh, runes }}));
'''


def build_direction_js() -> str:
    return '''/* AUTO-GENERATED RUNTIME VIEW.
 * Source values are imported from js/runes66.js.
 * No JSON is fetched at runtime.
 */

import { rune } from './runes66.js';

export const direction = [null];
for (let id = 1; id <= 66; id += 1) {
  const row = rune[id];
  if (!row) continue;
  direction[id] = {
    編號: id,
    符文名稱: row.符文名稱,
    所屬分組: row.所屬分組,
    符文月相: row.符文月相 ?? row.月相 ?? row.moon_phase,
    正向表示: row.正向表示 ?? '',
    半正向表示: row.半正向表示 ?? '',
    半逆向表示: row.半逆向表示 ?? '',
    逆向表示: row.逆向表示 ?? ''
  };
}
'''


def main() -> None:
    rows = load_rows()
    RUNES_JS.write_text(build_runes_js(rows), encoding="utf-8")
    DIRECTION_JS.write_text(build_direction_js(), encoding="utf-8")
    print(f"generated {RUNES_JS.relative_to(ROOT)} and {DIRECTION_JS.relative_to(ROOT)} from {SOURCE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
