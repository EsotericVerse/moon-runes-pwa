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
assert.match(stage,/scale:\[\.58,1\.68,2\.0,2\.0,1\.92,1\.08,1\]/,
  'cinematic character must stay within the approved 2.0x enlargement cap');
assert.match(css,/font-size:clamp\(86px,17\.6vw,176px\)/,
  'base glyph is smaller so the moving authored effects remain visible');
assert.match(css,/font-size:clamp\(86px,24\.8vw,136px\)/,
  'mobile 3D character must respect the smaller visual footprint');
assert.match(css,/rune-3d-atlas-glyph-model\{\s*flex:0 0 auto;font-size:clamp\(96px,12\.8vw,140px\)/,
  'catalogued 3D volume review must stay proportional and readable');
assert.match(css,/rune-3d-atlas-glyph-model\{font-size:clamp\(92px,23\.2vw,120px\)\}/,
  'mobile atlas preview keeps the additional 0.8x rune reduction');
assert.match(stage,/<EffekseerCanvas key=/);
assert.doesNotMatch(stage,/FONT_BY_GROUP|RuneAuraFX|RuneAura/);
console.log('All canonical Runes reuse eight typographic families in their manifestation stage.');
