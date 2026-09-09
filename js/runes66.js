/* LunaRunes66 runtime dataset.
 * Canonical Basic/Spec/History fields come from data/json/core/runes66.json.
 * Rich 1–64 runtime-only fields are preserved from runes64.json.
 * This keeps JSON and JS in sync instead of maintaining two divergent copies.
 */

const [canonicalResponse, richResponse] = await Promise.all([
  fetch(new URL('../data/json/core/runes66.json', import.meta.url)),
  fetch(new URL('../data/json/core/runes64.json', import.meta.url))
]);

if (!canonicalResponse.ok) {
  throw new Error(`Failed to load runes66.json: HTTP ${canonicalResponse.status}`);
}
if (!richResponse.ok) {
  throw new Error(`Failed to load runes64.json: HTTP ${richResponse.status}`);
}

const canonicalPayload = await canonicalResponse.json();
const richPayload = await richResponse.json();

const canonicalRows = Array.isArray(canonicalPayload)
  ? canonicalPayload
  : (Array.isArray(canonicalPayload?.runes) ? canonicalPayload.runes : []);
const richRows = Array.isArray(richPayload)
  ? richPayload
  : (Array.isArray(richPayload?.runes) ? richPayload.runes : []);

const richById = new Map(
  richRows
    .filter(Boolean)
    .map(row => [Number(row.編號 ?? row.id), row])
);

function toRuntimeRow(row) {
  const id = Number(row.編號 ?? row.id);
  const rich = richById.get(id) || {};
  const history = row.history || {};
  const name = row.符文名稱 ?? row.名稱 ?? row.name ?? rich.符文名稱 ?? rich.名稱;

  return {
    ...rich,
    編號: id,
    符文名稱: name,
    英文: row.英文 ?? row.english ?? rich.英文,
    圖騰: row.圖騰 ?? row.icon ?? rich.圖騰 ?? null,
    所屬分組: row.所屬分組 ?? row.group ?? rich.所屬分組,
    月相: row.月相 ?? row.moon_phase ?? rich.月相 ?? null,
    卡片屬性: row.卡片屬性 ?? row.card_attribute ?? rich.卡片屬性,
    關鍵詞: row.關鍵詞 ?? row.keyword ?? rich.關鍵詞,
    spec: row.spec ?? rich.spec,
    符文變化歷史: history.符文變化歷史 ?? row.符文變化歷史 ?? rich.符文變化歷史,
    神話故事: history.神話故事 ?? row.神話故事 ?? rich.神話故事,
    圖檔名稱: row.image ?? rich.圖檔名稱 ?? (id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null),
    drawable: row.drawable ?? (id >= 1 && id <= 66)
  };
}

export const rune = [null];
for (const row of canonicalRows) {
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;
  rune[id] = toRuntimeRow(row);
}
