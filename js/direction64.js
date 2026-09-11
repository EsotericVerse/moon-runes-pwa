/* LunaRunes direction runtime derived from data/json/core/runes.json. */

const response = await fetch(new URL('../data/json/core/runes.json', import.meta.url));
if (!response.ok) {
  throw new Error(`Failed to load runes.json: HTTP ${response.status}`);
}

const payload = await response.json();
const rows = Array.isArray(payload)
  ? payload
  : (Array.isArray(payload?.runes) ? payload.runes : []);

export const direction = [null];

for (const row of rows) {
  const id = Number(row?.編號 ?? row?.id);
  if (!Number.isInteger(id) || id < 1 || id > 66) continue;

  direction[id] = {
    編號: id,
    符文名稱: row.符文名稱 ?? row.名稱 ?? row.name,
    所屬分組: row.所屬分組 ?? row.group,
    符文月相: row.符文月相 ?? row.月相 ?? row.moon_phase,
    正向表示: row.正向表示 ?? '',
    半正向表示: row.半正向表示 ?? '',
    半逆向表示: row.半逆向表示 ?? '',
    逆向表示: row.逆向表示 ?? ''
  };
}
