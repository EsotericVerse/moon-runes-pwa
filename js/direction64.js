/* AUTO-GENERATED RUNTIME VIEW.
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
