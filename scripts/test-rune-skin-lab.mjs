import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base=process.cwd();
const read=path=>readFileSync(resolve(base,path),'utf8');
for(const path of [
  'app/lrunes/three/RuneWorld.jsx','app/lrunes/three/rune-world.css',
  'app/lrunes/list2/RuneAtlasLab.jsx','app/lrunes/duel2/RuneRitualLab.jsx',
  'app/card/page.jsx','app/card/list/page.jsx','app/card/duel/page.jsx',
  'app/lrunes/card/page.jsx','app/lrunes/card/list/page.jsx','app/lrunes/card/duel/page.jsx',
  'app/list2/page.jsx','app/duel2/page.jsx'
])assert.ok(existsSync(resolve(base,path)),path+' not found');
const world=read('app/lrunes/three/RuneWorld.jsx');
const duel=read('app/lrunes/duel2/RuneRitualLab.jsx');
const atlas=read('app/lrunes/list2/RuneAtlasLab.jsx');
const home=read('app/lrunes/RunesClient.jsx');
const pkg=JSON.parse(read('package.json'));
assert.match(world,/from '@react-three\/fiber'/);
assert.match(world,/new THREE.ExtrudeGeometry/);
assert.match(world,/new THREE.CatmullRomCurve3/);
assert.match(world,/function Moon\(/);
assert.match(world,/function Nebula\(/);
assert.match(world,/function OrbitingRunes\(/);
assert.match(world,/useFrame\(/);
assert.match(world,/function RuneActor\(/);
assert.match(duel,/REVEAL_MS=1000/);
assert.match(duel,/MAX_DRAW=11/);
assert.match(duel,/onBackgroundClick={!finished\?drawOne:undefined}/);
assert.match(duel,/loadDrawCards\(/);
assert.match(duel,/realText\(card,'lots',n\)/);
assert.match(duel,/buildFixedReading\(/);
assert.match(duel,/function finish\(/);
assert.match(atlas,/selectRows\('silver\.runes_group'/);
assert.match(atlas,/runeslist/);
assert.match(atlas,/onSelect={group\?show/);
assert.match(atlas,/role="dialog"/);
assert.match(atlas,/rune_evolution_history/);
assert.match(home,/runeHref\('duel2'\)/);
assert.match(home,/runeHref\('list2'\)/);
for(const dep of ['three','@react-three/fiber','@react-three/drei','@react-three/postprocessing','opentype.js']){
  assert.ok(pkg.dependencies[dep],dep+' missing from package.json');
}
console.log('LunaRunes true 3D independent skin contracts passed.');
