from pathlib import Path
import json

# One-shot generator: canonical source is always data/json/core/runes.json.
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'data/json/core/runes.json'
target = ROOT / 'js/runes66.js'

rows = json.loads(source.read_text(encoding='utf-8'))
if isinstance(rows, dict):
    rows = rows.get('runes', [])
if not isinstance(rows, list):
    raise SystemExit('runes.json must be a list or {"runes": [...]}')

runtime_rows = []
for row in rows:
    rid = int(row.get('編號', row.get('id', -1)))
    if 1 <= rid <= 66:
        runtime_rows.append(row)

if len(runtime_rows) != 66:
    raise SystemExit(f'expected 66 drawable runes, got {len(runtime_rows)}')

payload = json.dumps(runtime_rows, ensure_ascii=False, indent=2)

js = f'''/* AUTO-GENERATED from data/json/core/runes.json.
 * DO NOT hand-edit rune semantics here.
 * Canonical rune authority: data/json/core/runes.json
 * Group metadata: data/json/core/runes66groups.json
 */

const canonicalRows = {payload};

let groupsPayload = {{ groups: [] }};
try {{
  const groupsResponse = await fetch(
    new URL('../data/json/core/runes66groups.json', import.meta.url),
    {{ cache: 'no-store' }}
  );
  if (groupsResponse.ok) groupsPayload = await groupsResponse.json();
  else console.warn(`LunaRunes group metadata unavailable: HTTP ${{groupsResponse.status}}`);
}} catch (error) {{
  console.warn('LunaRunes group metadata unavailable; rune draw continues with generated canonical rune data.', error);
}}

const groupRows = Array.isArray(groupsPayload)
  ? groupsPayload
  : (Array.isArray(groupsPayload?.groups) ? groupsPayload.groups : []);

const groupByZh = new Map(
  groupRows
    .filter(group => group?.group_zh)
    .map(group => [String(group.group_zh), group])
);

const groupByRuneId = new Map();
for (const group of groupRows) {{
  for (const member of group?.runes || []) {{
    const id = Number(member?.id);
    if (Number.isInteger(id)) groupByRuneId.set(id, group);
  }}
}}

function resolveGroup(row, id) {{
  const groupName = row.所屬分組 ?? row.group;
  return groupByZh.get(String(groupName ?? '')) || groupByRuneId.get(id) || null;
}}

function toRuntimeRow(row) {{
  const id = Number(row.編號 ?? row.id);
  const name = row.符文名稱 ?? row.名稱 ?? row.name;
  const groupMeta = resolveGroup(row, id);
  const groupName = groupMeta?.group_zh ?? row.所屬分組 ?? row.group;
  const positiveKeywords = row.正向關鍵詞 ?? row.關鍵詞 ?? row.keyword ?? '';
  const reverseKeywords = row.反向關鍵詞 ?? row.反向關鍵字 ?? row.reverse_keyword ?? '';

  return {{
    ...row,
    編號: id,
    符文名稱: name,
    英文: row.英文 ?? row.english ?? '',
    圖騰: row.圖騰 ?? row.icon ?? '',
    所屬分組: groupName,
    分組英文: groupMeta?.group_en ?? '',
    分組說明: groupMeta?.description ?? '',
    群組特質: groupMeta?.trait ?? '',
    風格模組: groupMeta?.style_module ?? '',
    可能語氣: groupMeta?.possible_tone ?? [],
    group_style: groupMeta?.style ?? [],
    group_meta: groupMeta,
    月相: row.月相 ?? row.moon_phase ?? '',
    卡片屬性: row.卡片屬性 ?? row.card_attribute ?? '',
    符文說明: row.符文說明 ?? row.description ?? '',
    人格原型: row.人格原型 ?? row.archetype ?? '',
    角色行動: row.角色行動 ?? row.role_action ?? '',
    正向關鍵詞: positiveKeywords,
    反向關鍵詞: reverseKeywords,
    額外規則: row.額外規則 ?? '',
    額外留意: row.額外留意 ?? '',
    正向表示: row.正向表示 ?? '',
    半正向表示: row.半正向表示 ?? '',
    半逆向表示: row.半逆向表示 ?? '',
    逆向表示: row.逆向表示 ?? '',
    // Compatibility aliases only.
    關鍵詞: positiveKeywords,
    反向關鍵字: reverseKeywords,
    圖檔名稱: row.image ?? row.圖檔名稱 ?? (id > 0 && name ? `${{String(id).padStart(2, '0')}}_${{name}}.png` : null),
    drawable: row.drawable ?? (id >= 1 && id <= 66)
  }};
}}

export const groups = groupRows;
export const rune = [null];
for (const row of canonicalRows) {{
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = toRuntimeRow(row);
}}
'''

target.write_text(js, encoding='utf-8')
print(f'Generated {target.relative_to(ROOT)} from {source.relative_to(ROOT)} with {len(runtime_rows)} runes')
