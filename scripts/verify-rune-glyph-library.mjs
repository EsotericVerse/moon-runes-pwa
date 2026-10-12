import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RUNE_GLYPH_IDS,RUNE_GLYPH_STYLES,runeGlyphProfile} from '../app/lrunes/effekseer/rune-glyph-library.mjs';
const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const css=readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
assert.deepEqual(RUNE_GLYPH_IDS,Array.from({length:67},(_,i)=>i));
assert.equal(Object.keys(RUNE_GLYPH_STYLES).length,8);
for(const rune_id of RUNE_GLYPH_IDS){
 const {family,font,ink,finish}=runeGlyphProfile({rune_id});
 assert.ok(RUNE_GLYPH_STYLES[family]);
 assert.match(ink,/^#[0-9a-f]{6}$/i);
 assert.match(css,new RegExp('rune-effekseer-glyph--'+font));
 assert.ok(finish);
}
assert.equal(runeGlyphProfile({rune_id:44}).font,runeGlyphProfile({rune_id:45}).font);
assert.notEqual(runeGlyphProfile({rune_id:44}).ink,runeGlyphProfile({rune_id:45}).ink);
assert.match(stage,/runeGlyphProfile\(rune\)/);
assert.match(stage,/data-glyph-family=\{profile.family\}/);
assert.match(stage,/<EffekseerCanvas key=/);
assert.doesNotMatch(stage,/FONT_BY_GROUP|RuneAuraFX|RuneAura/);
console.log('All canonical Runes reuse eight typographic families in their manifestation stage.');
