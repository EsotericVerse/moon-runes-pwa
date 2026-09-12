// LOC Galaxy aggregation layer for Next/runtime modules.
// Canonical rune data is supplied by lib/runes.js; Galaxy only aggregates systems.
import { rune, groups } from './runes.js';

export { rune, groups };

export const galaxy = {
  runes: rune,
  runeGroups: groups,
  systems: Object.create(null)
};

export function registerGalaxySystem(id, payload) {
  const key = String(id || '').trim();
  if (!key) throw new TypeError('Galaxy system id is required.');
  galaxy.systems[key] = payload;
  return payload;
}

export function getGalaxySystem(id) {
  return galaxy.systems[String(id || '').trim()] ?? null;
}
