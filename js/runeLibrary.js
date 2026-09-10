// runeLibrary.js - current LunaRunes66 runtime access
// The runtime exposes only the current 66-rune dataset and group classification.
// Legacy runes64 extended/all-data structures are intentionally not imported here.

import { rune, groups } from './runes66.js';

export function getRunes66() {
  return rune;
}

export function getRuneGroups() {
  return groups;
}

// Expose current runtime accessors for non-module consumers.
window.getRunes66 = getRunes66;
window.getRuneGroups = getRuneGroups;
