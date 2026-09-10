/* LunaRunes66 frontend runtime projection.
 * Canonical rune data: data/json/core/runes66.json
 * Canonical group metadata: data/json/core/runes66groups.json
 *
 * Important governance rule:
 * - The frontend runtime exposes only fields that belong to the current 66-rune schema.
 * - Backend-only fields such as Spec are intentionally not projected here.
 * - Legacy runes64 aliases, manifestation/history fields and merged extension data are not accepted.
 */

const canonicalResponse = await fetch(new URL('../data/json/core/runes66.json', import.meta.url), { cache: 'no-store' });
if (!canonicalResponse.ok) {
  throw new Error(`Failed to load runes66.json: HTTP ${canonicalResponse.status}`);
}

const canonicalPayload = await canonicalResponse.json();
if (!Array.isArray(canonicalPayload)) {
  throw new Error('Current runes66 schema must be a JSON array');
}

let groupsPayload = { groups: [] };
try {
  const groupsResponse = await fetch(new URL('../data/json/core/runes66groups.json', import.meta.url), { cache: 'no-store' });
  if (groupsResponse.ok) groupsPayload = await groupsResponse.json();
  else console.warn(`LunaRunes group metadata unavailable: HTTP ${groupsResponse.status}`);
} catch (error) {
  console.warn('LunaRunes group metadata unavailable; rune runtime continues with canonical rune data.', error);
}

const groupRows = Array.isArray(groupsPayload)
  ? groupsPayload
  : (Array.isArray(groupsPayload?.groups) ? groupsPayload.groups : []);

const groupByRuneId = new Map();
for (const group of groupRows) {
  for (const member of group?.runes || []) {
    const id = Number(member?.id);
    if (Number.isInteger(id)) groupByRuneId.set(id, group);
  }
}

function toRuntimeRow(row) {
  const id = Number(row.編號);
  const name = row.符文名稱 ?? '';
  const groupMeta = groupByRuneId.get(id) || null;

  return {
    編號: id,
    符文名稱: name,
    英文: row.英文 ?? '',
    圖騰: row.圖騰 ?? null,
    所屬分組: row.所屬分組 ?? groupMeta?.group_zh ?? '',
    月相: row.月相 ?? '無',
    卡片屬性: row.卡片屬性 ?? '',
    角色行動: row.角色行動 ?? '',
    關鍵詞: row.關鍵詞 ?? '',
    人格原型: row.人格原型 ?? '',
    反向關鍵詞: row.反向關鍵詞 ?? '',
    特別說明: row.特別說明 ?? '',
    正向表示: row.正向表示 ?? '',
    半正向表示: row.半正向表示 ?? '',
    半逆向表示: row.半逆向表示 ?? '',
    逆向表示: row.逆向表示 ?? '',
    分組英文: groupMeta?.group_en ?? '',
    分組說明: groupMeta?.description ?? '',
    群組特質: groupMeta?.trait ?? '',
    風格模組: groupMeta?.style_module ?? '',
    可能語氣: groupMeta?.possible_tone ?? [],
    group_style: groupMeta?.style ?? [],
    group_meta: groupMeta,
    圖檔名稱: id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null,
    drawable: id >= 1 && id <= 66
  };
}

export const groups = groupRows;
export const rune = [null];
for (const row of canonicalPayload) {
  const id = Number(row?.編號);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = toRuntimeRow(row);
}
