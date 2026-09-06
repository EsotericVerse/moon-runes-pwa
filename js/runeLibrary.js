// runeLibrary.js - current LOC1 browser data bridge
import { rune } from './runes64.js';

export function getRunes64() {
  return rune;
}

window.getRunes64 = getRunes64;
