import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const read=path=>readFileSync(resolve(root,path),'utf8');
for(const file of [
  'app/duel2/page.jsx','app/list2/page.jsx',
  'app/lrunes/duel2/page.jsx','app/lrunes/list2/page.jsx',
  'app/lrunes/duel2/RuneRitualLab.jsx','app/lrunes/list2/RuneAtlasLab.jsx',
  'app/lrunes/RuneGlyph3D.jsx','app/lrunes/skin-lab.css'
])assert.ok(existsSync(resolve(root,file)),`Skin route missing: ${file}`);
const draw=read('app/lrunes/duel2/RuneRitualLab.jsx');
const atlas=read('app/lrunes/list2/RuneAtlasLab.jsx');
const core=read('app/lrunes/RuneDrawClient.jsx');
const home=read('app/lrunes/RunesClient.jsx');
assert.match(draw,/MAX_DRAW=11/);
assert.match(draw,/SHOW_MS=3200/);
assert.match(draw,/loadDrawCards\(/);
assert.match(draw,/buildFixedReading\(/);
assert.match(draw,/randomIndex\(remaining.length\)/);
assert.match(draw,/randomIndex\(4\)/);
assert.match(draw,/function skip\(/);
assert.match(draw,/function endDraw\(/);
assert.match(draw,/latest\.current\.length===0/);
assert.match(atlas,/PAGE_SIZE=8/);
assert.match(atlas,/COUNT=66/);
assert.match(atlas,/selectRows\('silver\.runes'/);
assert.match(core,/export \{randomIndex,loadDrawCards,buildFixedReading\};/);
assert.match(home,/runeHref\('duel2'\)/);
assert.match(home,/runeHref\('list2'\)/);
assert.match(read('app/duel2/page.jsx'),/noIndex:true/);
assert.match(read('app/list2/page.jsx'),/noIndex:true/);
console.log('Rune skin isolated-route contracts passed.');
