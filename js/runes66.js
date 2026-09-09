/* LunaRunes66 runtime dataset.
 * Canonical and runtime fields share one source: data/json/core/runes66.json.
 */

const canonicalResponse = await fetch(new URL('../data/json/core/runes66.json', import.meta.url));

if (!canonicalResponse.ok) {
  throw new Error(`Failed to load runes66.json: HTTP ${canonicalResponse.status}`);
}
const canonicalPayload = await canonicalResponse.json();

const canonicalRows = Array.isArray(canonicalPayload)
  ? canonicalPayload
  : (Array.isArray(canonicalPayload?.runes) ? canonicalPayload.runes : []);
function toRuntimeRow(row) {
  const id = Number(row.編號 ?? row.id);
  const history = row.history || {};
  const name = row.符文名稱 ?? row.名稱 ?? row.name;

  return {
    ...row,
    編號: id,
    符文名稱: name,
    英文: row.英文 ?? row.english,
    圖騰: row.圖騰 ?? row.icon ?? null,
    所屬分組: row.所屬分組 ?? row.group,
    月相: row.月相 ?? row.moon_phase ?? null,
    卡片屬性: row.卡片屬性 ?? row.card_attribute,
    關鍵詞: row.關鍵詞 ?? row.keyword,
    符文變化歷史: history.符文變化歷史 ?? row.符文變化歷史,
    神話故事: history.神話故事 ?? row.神話故事,
    圖檔名稱: row.image ?? row.圖檔名稱 ?? (id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null),
    drawable: row.drawable ?? (id >= 1 && id <= 66)
  };
}

export const rune = [null];
for (const row of canonicalRows) {
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = toRuntimeRow(row);
}
