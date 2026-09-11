/* LunaRunes66 runtime dataset.
 * Canonical rune projection: data/json/core/runes.json
 * Canonical mother source: LunaRune66.xlsx
 * Canonical group metadata: data/json/core/runes66groups.json
 *
 * This module is a derived runtime view only. Rune semantics must come from
 * runes.json, which is generated from LunaRune66.xlsx. Group metadata is
 * supplementary and must never override canonical rune fields.
 */

const canonicalResponse = await fetch(new URL('../data/json/core/runes.json', import.meta.url));
if (!canonicalResponse.ok) {
  throw new Error(`Failed to load runes.json: HTTP ${canonicalResponse.status}`);
}

const canonicalPayload = await canonicalResponse.json();

let groupsPayload = { groups: [] };
try {
  const groupsResponse = await fetch(new URL('../data/json/core/runes66groups.json', import.meta.url));
  if (groupsResponse.ok) groupsPayload = await groupsResponse.json();
  else console.warn(`LunaRunes group metadata unavailable: HTTP ${groupsResponse.status}`);
} catch (error) {
  console.warn('LunaRunes group metadata unavailable; rune draw continues with canonical rune data.', error);
}

const canonicalRows = Array.isArray(canonicalPayload)
  ? canonicalPayload
  : (Array.isArray(canonicalPayload?.runes) ? canonicalPayload.runes : []);

const groupRows = Array.isArray(groupsPayload)
  ? groupsPayload
  : (Array.isArray(groupsPayload?.groups) ? groupsPayload.groups : []);

const groupByZh = new Map(
  groupRows
    .filter(group => group?.group_zh)
    .map(group => [String(group.group_zh), group])
);

const groupByRuneId = new Map();
for (const group of groupRows) {
  for (const member of group?.runes || []) {
    const id = Number(member?.id);
    if (Number.isInteger(id)) groupByRuneId.set(id, group);
  }
}

function resolveGroup(row, id) {
  const groupName = row.所屬分組 ?? row.group;
  return groupByZh.get(String(groupName ?? '')) || groupByRuneId.get(id) || null;
}

function toRuntimeRow(row) {
  const id = Number(row.編號 ?? row.id);
  const history = row.history || {};
  const name = row.符文名稱 ?? row.名稱 ?? row.name;
  const groupMeta = resolveGroup(row, id);
  const groupName = row.所屬分組 ?? row.group ?? groupMeta?.group_zh;

  return {
    ...row,
    編號: id,
    符文名稱: name,
    英文: row.英文 ?? row.english,
    圖騰: row.圖騰 ?? row.icon ?? null,
    所屬分組: groupName,
    分組英文: groupMeta?.group_en,
    分組說明: groupMeta?.description ?? row.分組說明,
    群組特質: groupMeta?.trait,
    風格模組: groupMeta?.style_module,
    可能語氣: groupMeta?.possible_tone ?? [],
    group_style: groupMeta?.style ?? [],
    group_meta: groupMeta,
    月相: row.月相 ?? row.moon_phase ?? null,
    卡片屬性: row.卡片屬性 ?? row.card_attribute,
    關鍵詞: row.關鍵詞 ?? row.keyword,
    符文變化歷史: history.符文變化歷史 ?? row.符文變化歷史,
    神話故事: history.神話故事 ?? row.神話故事,
    圖檔名稱: row.image ?? row.圖檔名稱 ?? (id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null),
    drawable: row.drawable ?? (id >= 1 && id <= 66)
  };
}

export const groups = groupRows;
export const rune = [null];
for (const row of canonicalRows) {
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = toRuntimeRow(row);
}
