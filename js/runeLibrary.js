// runeLibrary.js - unified LunaRunes66 runtime access

import { rune, groups } from './runes.js';
import { allData } from './rune_all_data_all.js';

export function getRunes66() {
  return rune;
}

export function getRuneGroups() {
  return groups;
}

export function getAllData() {
  return allData;
}

// Expose canonical runtime accessors for non-module consumers.
window.getRunes66 = getRunes66;
window.getRuneGroups = getRuneGroups;
window.getAllData = getAllData;
