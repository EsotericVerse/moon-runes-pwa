import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const read=path=>readFileSync(resolve(root,path),'utf8');
const files=[
  'app/lrunes/visual/RuneArtStage.jsx',
  'app/lrunes/visual/rune-art-stage.css',
  'app/lrunes/visual/rune-art-layout.css',
  'app/lrunes/duel2/RuneRitualLab.jsx',
  'app/lrunes/list2/RuneAtlasLab.jsx',
  'app/lrunes/daily3d/RuneDaily3D.jsx',
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/Rune3DNav.jsx',
  'app/card/page.jsx','app/card/duel/page.jsx',
  'app/card/list/page.jsx','app/card/daily/page.jsx',
  'app/lrunes/card/duel/page.jsx','app/lrunes/card/list/page.jsx',
  'app/lrunes/card/daily/page.jsx',
  'app/duel/one/page.jsx','app/list/page.jsx'
];
for(const path of files)assert.ok(existsSync(resolve(root,path)),path+' missing');

const art=read('app/lrunes/visual/RuneArtStage.jsx');
const duel=read('app/lrunes/duel2/RuneRitualLab.jsx');
const atlas=read('app/lrunes/list2/RuneAtlasLab.jsx');
const daily=read('app/lrunes/daily3d/RuneDaily3D.jsx');
const directory=read('app/lrunes/rune-directory.mjs');
const pkg=JSON.parse(read('package.json'));
const skin=read('app/lrunes/visual/rune-art-stage.css');
const layout=read('app/lrunes/visual/rune-art-layout.css');

assert.ok(pkg.dependencies.motion,'Motion package must be available');
assert.match(art,/from 'motion\/react'/);
assert.match(art,/AnimatePresence/);
assert.match(art,/useReducedMotion/);
assert.match(art,/groupImage,runeImage,runeName/);
assert.match(art,/function Gallery\(/);
assert.match(art,/function DrawStage\(/);
assert.match(art,/className="rune-art-featured-card"/);
assert.match(art,/className="rune-art-history"/);
assert.match(art,/data-visual-mode="2d"/);
// Retired renderer and demo assets must not be imported in any artwork route.
for(const [path,src] of [
  ['app/lrunes/visual/RuneArtStage.jsx',art],
  ['app/lrunes/duel2/RuneRitualLab.jsx',duel],
  ['app/lrunes/list2/RuneAtlasLab.jsx',atlas],
  ['app/lrunes/daily3d/RuneDaily3D.jsx',daily]
]){
  assert.doesNotMatch(src,/three\/RuneWorld|three\/rune-world\.css|RuneGlyph3D|RuneAuraFX/gi,path+' must not use retired renderer');
  assert.doesNotMatch(src,/from ['\"](?:three|@react-three\/[a-z-]+)['\"]|THREE\.\w+|<Canvas\b|<Text3D\b/,path+' must be artwork-only');
  if(path.includes('RuneRitualLab')||path.includes('RuneAtlasLab')||path.includes('RuneDaily3D')){
    assert.match(src,/import RuneArtStage from '\.\.\/visual\/RuneArtStage'/);
    assert.match(src,/import '\.\.\/visual\/rune-art-layout\.css'/);
    assert.match(src,/<RuneArtStage mode=/);
  }
}
assert.doesNotMatch(skin+layout,/transform-style:\s*preserve-3d|perspective\s*:|rotateY\s*\(/i);
assert.match(skin,/\.rune-art-gallery-grid/);
assert.match(skin,/\.rune-art-card-frame/);
assert.match(layout,/\.rune-art-duel-action-dock/);
assert.match(layout,/\.rune-art-group-inline/);
assert.match(layout,/\.rune-art-draw-guide-summary/);
assert.match(skin,/\.rune-art-charge-ring/);

// The old canonical /duel and /list routes are still independent and intact.
assert.match(read('app/duel/one/page.jsx'),/DuelDrawPage/);
assert.match(read('app/list/page.jsx'),/RuneDirectoryRoot/);
assert.doesNotMatch(read('app/duel/one/page.jsx')+read('app/list/page.jsx'),/RuneArtStage|RuneRitualLab|RuneAtlasLab/);

// Only /card/* paths expose the new artwork experiences.
assert.match(read('app/card/duel/page.jsx'),/RuneRitualLab/);
assert.match(read('app/card/list/page.jsx'),/RuneAtlasLab/);
assert.match(read('app/card/daily/page.jsx'),/RuneDaily3D/);
assert.match(read('app/lrunes/card/duel/page.jsx'),/card\/duel\/page/);
assert.match(read('app/lrunes/card/list/page.jsx'),/card\/list\/page/);
assert.match(read('app/lrunes/card/daily/page.jsx'),/card\/daily\/page/);

// Existing draw algorithm/meaning, actual moon, directions and 11-card ceiling remain.
assert.match(duel,/MAX_DRAW=11/);
assert.match(duel,/REVEAL_MS=1000/);
assert.match(duel,/DIRECTIONS=\['正位','半正位','半逆位','逆位'\]/);
assert.match(duel,/realMoonPhase\(/);
assert.match(duel,/randomIndex\(remaining.length\)/);
assert.match(duel,/loadDrawCards\(/);
assert.match(duel,/buildFixedReading\(/);
assert.match(duel,/function drawOne\(/);
assert.match(duel,/function finish\(/);
assert.match(duel,/function reset\(/);
assert.match(duel,/onBackgroundClick=\{!finished&&!selected\?drawOne:undefined\}/);
assert.match(duel,/onSelect=\{showCard\}/);
assert.match(duel,/import RuneCardInfo from '\.\.\/RuneCardInfo'/);
assert.match(duel,/createPortal\(/);
assert.match(duel,/rune-art-duel-action-dock/);
assert.match(duel,/onClick=\{drawOne\}/);
assert.match(duel,/onClick=\{reset\}/);
assert.match(duel,/onClick=\{finish\}/);
const controls=duel.slice(duel.indexOf('className="rune-art-duel-action-dock"'),
  duel.indexOf('<section className="rune-art-stage"'));
assert.match(controls,/重新開始占卜/);
assert.match(controls,/招喚下一枚符文/);
assert.match(controls,/占卜結束，觀看籤詩/);
assert.ok(controls.indexOf('重新開始占卜')<controls.indexOf('招喚下一枚符文'));
assert.ok(controls.indexOf('招喚下一枚符文')<controls.indexOf('占卜結束，觀看籤詩'));
assert.match(duel,/<RuneArtStage mode="draw" items=\{items\} charging=\{busy\} actions=\{actionDock\}/);
assert.match(duel,/function RuneDrawResultDialog\(/);
assert.match(duel,/resultOpen&&finished&&typeof document/);
assert.match(duel,/className="rune-art-result-home"/);
assert.match(duel,/className="rune-art-result-new"/);
assert.doesNotMatch(duel,/\{finished\?<section className="rune-skin-verse/);
assert.match(art,/卡片方向：\{last.direction/);
assert.match(art,/className="rune-art-ritual-actions"/);
assert.doesNotMatch(daily,/占卜結束，觀看每日指示/);
assert.match(daily,/setDetails\(true\);/,'one daily draw immediately opens guidance');
assert.doesNotMatch(daily,/actions=\{dailyActions\}/,'daily draw does not have an unnecessary finish action');
assert.match(daily,/createPortal\(/);
assert.match(daily,/className="rune-art-modal rune-art-result-modal"/);
assert.match(daily,/className="rune-art-result-home"/);
assert.doesNotMatch(daily,/className="rune-art-result-new"/,'daily draw should not invite a second draw');
assert.doesNotMatch(daily,/\{draw\?<section className="rune-skin-verse/);
assert.match(layout,/\.rune-art-result-modal/);
assert.match(layout,/\.rune-art-result-actions/);
assert.match(layout,/\.rune-art-ritual-actions/);
assert.match(skin,/\.rune-art-direction-label/);
assert.match(art,/className="rune-art-charge"/);
assert.match(art,/DIRECTION_ANGLES=Object\.freeze/);
assert.match(art,/'逆位':180/);
assert.match(art,/'半正位':90/);
assert.match(art,/'半逆位':-90/);
assert.match(art,/animate=\{\{rotate:angle\}\}/);
const toolbar=duel.indexOf('rune-art-toolbar');
const stage=duel.indexOf('<section className="rune-art-stage"');
assert.ok(toolbar<stage,'moon phase summary must precede artwork');
assert.match(duel,/const actionDock=<div className="rune-art-duel-action-dock"/);
assert.ok(duel.indexOf('const actionDock=')<duel.indexOf('return <main'),'actions must be passed into stage');
assert.ok(art.indexOf('rune-art-direction-label')<art.indexOf('rune-art-ritual-actions'),
  'action dock must appear directly under card direction');
assert.match(duel,/DRAW_COUNT_GUIDE=RUNE_ALL_DRAW_MODES/);
assert.match(duel,/item\.key!=='daily'/);
const countGuide=duel.slice(duel.indexOf('<details className="rune-art-draw-guide"'),
  duel.indexOf('{selected&&typeof document'));
assert.match(countGuide,/<summary className="rune-art-draw-guide-summary">/);
assert.doesNotMatch(countGuide,/<details[^>]*\sopen\b/);
assert.match(countGuide,/DRAW_COUNT_GUIDE\.map\(/);
assert.doesNotMatch(countGuide,/<a\b|<button\b|onClick=|href=|tabIndex=/,
  'count explanations must not turn into navigation buttons');

// Group descriptions, group IDs and the original images remain authoritative.
assert.match(atlas,/selectRows\('silver\.runes_group'/);
assert.match(atlas,/GROUP_COLUMNS='group_id,english_name,desc,quality,style,runeslist'/);
assert.match(atlas,/selectRows\('silver\.runes'/);
assert.match(atlas,/runeslist/);
assert.match(art,/className="rune-art-group-summary"/);
assert.match(art,/item\.english_name/);
assert.match(art,/item\.desc/);
assert.match(art,/item\.quality/);
assert.match(art,/item\.style/);
assert.match(art,/item\.runeslist\.length/);
assert.match(skin,/\.rune-art-group-english/);
assert.match(skin,/\.rune-art-group-blurb/);
assert.match(skin,/\.rune-art-group-facts/);
assert.match(atlas,/onSelect=\{group\?show:enterGroup\}/);
assert.match(atlas,/className="rune-art-group-inline"/);
assert.match(atlas,/src=\{groupImage\(group.id\)\}/);
assert.match(atlas,/group\.english_name/);
assert.match(atlas,/group\.desc/);
assert.match(atlas,/group\.runeslist\.length/);
assert.doesNotMatch(atlas,/previewGroup|setPreview\(|className="rune-art-group-preview"/);
assert.match(atlas,/rune_evolution_history/);
assert.match(atlas,/<RuneInfoDialog rune=\{details\} onClose=\{closeDetails\}\/>/);
assert.match(directory,/export function groupImage\(/);
assert.match(directory,/\/assets\/lunarunes\/cards\//);
for(const file of [
  '01.soul.jpg','02_connection.jpg','03_life.jpg','04_nature.jpg',
  '05_mineral.jpg','06_element.jpg','07_order.jpg','08_disorder.jpg','09_specia.jpg'
])assert.ok(existsSync(resolve(root,'pics',file)),'missing published group artwork: '+file);
for(let id=1;id<=66;id++)assert.ok(existsSync(resolve(root,'assets/lunarunes/cards/'+String(id).padStart(2,'0')+'.png')),'rune card '+id+' missing');

assert.match(daily,/realMoonPhase\(/);
assert.match(daily,/loadDrawCards\(/);
assert.match(daily,/每日占卜祝福/);
assert.match(daily,/onSelect=\{\(\)=>setDetails\(true\)\}/);
assert.match(read('app/lrunes/RunesClient.jsx'),/runeHref\('card\/duel',native\)/);
assert.match(read('app/card/page.jsx'),/符文美術場域/);
console.log('LunaRunes original-art Motion routes and legacy separation passed.');
