import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base=process.cwd();
const read=path=>readFileSync(resolve(base,path),'utf8');
for(const path of [
  'app/lrunes/three/RuneWorld.jsx','app/lrunes/three/rune-world.css',
  'app/lrunes/list2/RuneAtlasLab.jsx','app/lrunes/duel2/RuneRitualLab.jsx',
  'app/card/page.jsx','app/card/list/page.jsx','app/card/duel/page.jsx',
  'app/card/daily/page.jsx','app/lrunes/card/daily/page.jsx','app/lrunes/daily3d/RuneDaily3D.jsx',
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
assert.match(duel,/onBackgroundClick={!finished&&!selected\?drawOne:undefined}/);
assert.match(duel,/loadDrawCards\(/);
assert.match(duel,/function RuneDrawCardDialog\(/);
assert.match(duel,/import RuneCardInfo from '\.\.\/RuneCardInfo'/);
const dialog=duel.slice(duel.indexOf('function RuneDrawCardDialog('),duel.indexOf('const pause='));
assert.match(dialog,/layout="home"/);
assert.match(dialog,/realMoonPhase=\{item\.moon\}/);
assert.match(dialog,/direction=\{item\.direction\}/);
assert.doesNotMatch(dialog,/rune_etc|lotSections|sit_q|sit_a|daily_r/);
assert.match(duel,/staticTypes:\[\],moonTypes:\['sit_q'\],currentMoon/);
assert.match(duel,/createPortal\(/);
assert.match(duel,/rune-3d-duel-action-dock/);
assert.match(atlas,/createPortal\(/);
assert.match(read('app/lrunes/three/rune-world.css'),/z-index:10000/);

assert.match(duel,/onSelect=\{showCard\}/);
assert.match(duel,/結束抽牌/);
assert.match(duel,/rune-3d-duel-action-dock/);
assert.match(duel,/重新占卜/);
assert.match(duel,/結束占卜，看指示籤詩/);
assert.match(duel,/onClick=\{reset\}/);
assert.match(duel,/onClick=\{finish\}/);
assert.match(duel,/DRAW_COUNT_GUIDE=RUNE_ALL_DRAW_MODES/);
assert.match(duel,/item\.key!=='daily'/);
assert.match(duel,/sort\(\(a,b\)=>a\.count-b\.count\)/);
const guide=duel.slice(duel.indexOf('<section className="rune-3d-draw-guide"'),duel.indexOf('{selected&&typeof document'));
assert.ok(guide.includes('<article className="rune-3d-draw-guide-card"'));
assert.ok(!/<a\b|<button\b|onClick=|href=|tabIndex=/.test(guide),'explanatory count cards must contain no navigation or interactive actions');
const sceneCss=read('app/lrunes/three/rune-world.css');
assert.match(sceneCss,/\.rune-3d-duel-action-dock\{/);
assert.match(sceneCss,/position:fixed/);
assert.match(sceneCss,/safe-area-inset-bottom/);
assert.match(sceneCss,/min-height:68px/);
assert.match(sceneCss,/rune-3d-draw-guide-grid/);

assert.match(duel,/指示籤詩為/);
assert.match(duel,/buildFixedReading\(/);
assert.match(duel,/function finish\(/);
assert.match(atlas,/selectRows\('silver\.runes_group'/);
assert.match(atlas,/runeslist/);
assert.match(atlas,/onSelect={group\?show:previewGroup}/);
assert.match(atlas,/preview\.desc/);
assert.match(atlas,/onClick=\{\(\)=>enterGroup\(preview\)\}>進入符文星域/);
assert.match(atlas,/role="dialog"/);
assert.match(atlas,/rune_evolution_history/);
assert.match(home,/runeHref\('card\/duel'\)/);
assert.match(home,/runeHref\('card\/list'\)/);
assert.match(home,/runeHref\('card\/daily'\)/);
assert.match(world,/rune-world-orb-name/);
assert.match(world,/function SanctumField\(/);
assert.match(world,/<SanctumField mode=\{mode\} groupIndex=\{groupIndex\}/);
assert.match(world,/groupIndex=\{index\}/);
assert.match(world,/canvas.width=1024;canvas.height=1024/);
assert.match(world,/iridescence=\{\.48\}/);
assert.match(atlas,/import \{runeImage,groupImage\}/);
assert.match(atlas,/src=\{groupImage\(preview.id\)\}/);
assert.match(atlas,/rune-3d-floating-back/);
assert.match(atlas,/onClick=\{backToGroups\}/);
assert.match(sceneCss,/rune-sanctum-mist/);
assert.match(sceneCss,/rune-3d-group-artwork/);
assert.match(sceneCss,/rune-3d-floating-back/);

assert.match(world,/data-min-render-px="1024"/);
assert.match(world,/canvas.width=1024;canvas.height=1024/);
assert.match(read('app/lrunes/daily3d/RuneDaily3D.jsx'),/每日占卜祝福/);
for(const dep of ['three','@react-three/fiber','@react-three/drei','@react-three/postprocessing','opentype.js']){
  assert.ok(pkg.dependencies[dep],dep+' missing from package.json');
}
console.log('LunaRunes true 3D independent skin contracts passed.');
