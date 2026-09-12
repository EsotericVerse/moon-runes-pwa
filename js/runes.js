// Legacy compatibility adapter.
// Canonical rune rows live in data/json/core/runes.json and are projected by lib/runes.js.
// New code should import from ../lib/runes.js directly.
export { rune, groups, runeRows } from '../lib/runes.js';
