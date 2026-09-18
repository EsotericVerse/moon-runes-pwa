import { runeRows } from '../../../js/runes-core';
import { normalizeRune } from './game-engine';

// Static-export-safe Game projection.
// The canonical Rune dataset is already public and read-only. Game consumes only the
// Game-safe fields below and does not expose private governance/source data. When a
// server-side PostgreSQL projection becomes available, this adapter can be replaced
// without changing GameClient.
function gameSafe(row){
 return {
  編號:row['編號'],
  符文名稱:row['符文名稱'],
  英文:row['英文'],
  所屬分組:row['所屬分組'],
  角色行動:row['角色行動']||''
 };
}

export async function loadGameRunes(){
 return runeRows
  .filter(row=>Number(row['編號'])>=1&&Number(row['編號'])<=66)
  .map(gameSafe)
  .map(normalizeRune);
}
