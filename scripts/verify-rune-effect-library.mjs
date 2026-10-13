import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTHORED_EFFECT_FILES,RUNE_EFFECT_KEYS,CANONICAL_RUNE_ENGLISH,RUNE_EFFECT_TUNING,runeEffectFor} from '../app/lrunes/effekseer/rune-effect-library.mjs';
import {EFFECT_ASSET_BLOBS,AUTHORED_EFFECT_NAMES} from './rune-effekseer-asset-manifest.mjs';
import {RUNE_SEMANTIC_ICONS,runeIconFor} from '../app/lrunes/effekseer/rune-semantic-icons.mjs';
import {RUNE_REJECTED_BRIEFS,ACCEPTED_RUNE_EFFECT_BASELINE} from './rune-rejected-brief.mjs';
import {RUNE_VFX_REVIEW_QUEUE,RUNE_VFX_REVIEW_NAMES,RUNE_VFX_REVIEW_STATUS} from '../app/lrunes/effekseer/rune-review-queue.mjs';
import {GROUP_STAGE_LANGUAGE,groupStageForRune,cinematicCameraPose,GROUP_IMPACT_AT} from '../app/lrunes/effekseer/rune-cinematic-language.mjs';
import {redirectAmbientFogTexture,AMBIENT_FOG_IMAGE} from '../app/lrunes/effekseer/ambient-fog-assets.mjs';
const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(CANONICAL_RUNE_ENGLISH.length,67);
assert.equal(new Set(CANONICAL_RUNE_ENGLISH).size,67);
assert.deepEqual(Object.keys(RUNE_EFFECT_KEYS),CANONICAL_RUNE_ENGLISH);
assert.equal(RUNE_REJECTED_BRIEFS.length,34,'owner returned exactly 34 runes');
assert.equal(new Set(RUNE_REJECTED_BRIEFS.map(row=>row[0])).size,34);
assert.equal(new Set(RUNE_REJECTED_BRIEFS.map(row=>row[1])).size,34);
assert.equal(Object.keys(ACCEPTED_RUNE_EFFECT_BASELINE).length,31,'Mirror was returned and must not remain in accepted baseline');
assert.equal(RUNE_VFX_REVIEW_QUEUE.length,7);
assert.equal(new Set(RUNE_VFX_REVIEW_NAMES).size,7);
assert.equal(new Set(RUNE_VFX_REVIEW_QUEUE.map(row=>row[1])).size,7);
for(const [name,key] of Object.entries(ACCEPTED_RUNE_EFFECT_BASELINE))assert.equal(RUNE_EFFECT_KEYS[name],key,'accepted VFX is immutable: '+name);
assert.equal(RUNE_EFFECT_KEYS.Star,'M:meteo1','Star must use authored meteor, never upward fireworks');
assert.equal(RUNE_EFFECT_KEYS.Insight,'M:Sylph15','owner assigned former Branch effect to Insight');
assert.equal(RUNE_EFFECT_KEYS.Stone,'M:Gohlem_Shield2','owner assigned former Diamond effect to Stone');
assert.equal(RUNE_EFFECT_KEYS.Space,'S:PolarCoords','restore prior Time space contraction effect');
assert.equal(RUNE_EFFECT_KEYS.Illusion,'M:foot_smoke2','owner requested drifting fog for Illusion');
assert.equal(RUNE_EFFECT_KEYS.Void,'M:AquaPoint','owner assigned former Illusion to Void');
assert.equal(RUNE_EFFECT_TUNING.Resonance.rotationZ,Math.PI/2,'horizontal wave orientation');
assert.deepEqual(RUNE_EFFECT_TUNING.Star.color,[255,255,255,255],'meteor light is neutral white');
assert.equal(RUNE_EFFECT_TUNING.Sun.color[0],255,'solar effect must be warm gold');
assert.equal(RUNE_EFFECT_TUNING.Ore.motion,'ore-rise');
assert.equal(RUNE_EFFECT_TUNING.Dust.motion,'dust-drift');
assert.equal(RUNE_EFFECT_KEYS.Root,'B:Homing_Laser01','Root uses its own branching authored trail, not former Dust particles');
assert.ok(!runeEffectFor({english_name:'Root'}).overlays.some(x=>x.key.includes('lightning')),'no lightning root overlays');
assert.equal(RUNE_EFFECT_KEYS.Branch,'M:Sylph6','Branch uses its own upward spreading authored effect');
assert.ok(!runeEffectFor({english_name:'Branch'}).overlays.some(x=>x.key.includes('lightning')),'no lightning branch overlays');
assert.equal(RUNE_EFFECT_KEYS.Jade,'NS:MagicShield','Jade uses reflective planar shield sample');
assert.equal(RUNE_EFFECT_KEYS.Dust,'SAMPLE:Simple_Ribbon_Parent','Dust adopts the specific effect formerly used by Root');
assert.equal(RUNE_EFFECT_KEYS.Illusion,'M:foot_smoke2');
assert.equal(RUNE_EFFECT_KEYS.Chaos,'M:Sylph13','Chaos inherits former Fate VFX');
assert.equal(RUNE_EFFECT_KEYS.Fate,'SAMPLE:Simple_Ring_Shape1','Fate inherits former Chaos VFX');
for(const key of ['M:Sylph8','M:Sylph5','M:foot_smoke7','M:foot_smoke2']){
  const path=AUTHORED_EFFECT_FILES[key]?.slice('Collections/'.length);
  assert.ok(path,'Missing effect source '+key);
  assert.ok(EFFECT_ASSET_BLOBS.some(item=>item.target===path&&item.sha.length===40),'Missing pinned original effect '+key);
}

assert.equal(RUNE_EFFECT_TUNING.Chaos.motion,'fate-converge','owner exchanged Fate effect into Chaos');
assert.equal(RUNE_EFFECT_TUNING.Fate.motion,'chaos-orbit','owner exchanged Chaos effect into Fate');
assert.match(stage,/other\.setRotation\(/,'two authored diagonal slash handles must mark Error');
assert.match(stage,/setAllColor\(/,'authored effects must support meaning-specific tint');
assert.equal(RUNE_EFFECT_TUNING.Void.motion,'collapse','Void effect itself converges to the center');
assert.ok(RUNE_EFFECT_TUNING.Flame.scale>2,'Flame must fill visible stage');
assert.ok(RUNE_EFFECT_TUNING.Fate.speed<1&&RUNE_EFFECT_TUNING.Chaos.scale>1);
assert.ok(stage.includes('handle.setScale('),'Effekseer handle setScale missing');
assert.ok(stage.includes('handle.setRotation('),'Effekseer handle setRotation missing');
assert.ok(stage.includes('handle.setSpeed('),'Effekseer handle setSpeed missing');
for(const [word] of RUNE_REJECTED_BRIEFS)assert.ok(stage.includes("'"+word+"':"),'missing choreographed rejection: '+word);
assert.equal(RUNE_EFFECT_KEYS.Virtue,null,'0 is not a drawable Rune');
const chosen=Object.values(RUNE_EFFECT_KEYS).filter(Boolean);
assert.equal(chosen.length,66,'all 66 drawable Runes have an authored VFX');
assert.equal(new Set(chosen).size,66,'no duplicate VFX assignments permitted');
assert.equal(new Set(chosen.map(x=>AUTHORED_EFFECT_FILES[x])).size,66,'no two keys alias the same VFX file');
assert.notEqual(RUNE_EFFECT_KEYS.Blank,RUNE_EFFECT_KEYS.Void);
assert.notEqual(RUNE_EFFECT_KEYS.Void,RUNE_EFFECT_KEYS.Illusion);
assert.notEqual(RUNE_EFFECT_KEYS.Flame,RUNE_EFFECT_KEYS.Radiance);
assert.equal(RUNE_EFFECT_KEYS.Flame,'M:FirePot1','Flame must use a genuine pre-authored flame module');
assert.equal(RUNE_EFFECT_KEYS.Resonance,'M:MagicArea','Resonance effect must be a wave field rather than fire');
assert.equal(RUNE_EFFECT_KEYS.Calamity,'M:Thunder3','Calamity must have independently authored destructive storm VFX');
assert.ok(EFFECT_ASSET_BLOBS.some(file=>file.target==='godot4/ef_fire01_projectile.efkefc'));
assert.ok(EFFECT_ASSET_BLOBS.some(file=>file.target==='godot4/Textures/tx_fire_flipbook01_1024.png'));

assert.equal(RUNE_EFFECT_KEYS.Spectrum,'T:Light3','Spectrum must use rainbow-colored authored Light3');
const presentation=readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
assert.ok(presentation.includes('grayscale(1) brightness(1.65)'),'Star filters color out of the VFX canvas');
assert.match(presentation,/data-rune="彩"/,'Spectrum must visually express multiple colors');
assert.match(presentation,/linear-gradient\(100deg/,'Spectrum needs a genuinely multicolored letterform');
assert.match(presentation,/data-rune="火"/,'Flame must carry a warm-color object and typeface');

assert.notEqual(RUNE_EFFECT_KEYS.Mirror,'G:ef_ice03','Mirror can never be crystalline ice');
assert.equal(RUNE_EFFECT_KEYS.Blank,'M:foot_smoke8','Blank needs an authored fading dispersion module');
assert.equal(RUNE_SEMANTIC_ICONS.length,67);
assert.equal(new Set(RUNE_SEMANTIC_ICONS.map(x=>x.path)).size,67);
assert.equal(RUNE_SEMANTIC_ICONS[3].path,'lorc/rainbow-star.svg');
assert.equal(RUNE_SEMANTIC_ICONS[7].path,'lorc/mirror-mirror.svg');
assert.equal(RUNE_SEMANTIC_ICONS[55].path,'lorc/portal.svg');
const pinned=new Map(EFFECT_ASSET_BLOBS.map(x=>[x.target,x]));
assert.equal(pinned.size,EFFECT_ASSET_BLOBS.length);
for(const blob of EFFECT_ASSET_BLOBS){assert.match(blob.sha,/^[a-f\d]{40}$/);assert.ok(blob.size>0);}
for(let id=1;id<=66;id++){
 const name=CANONICAL_RUNE_ENGLISH[id];
 const profile=runeEffectFor({rune_id:id,english_name:name});
 assert.ok(profile?.path,'Effect missing: '+id+' '+name);
 assert.ok(profile.path.startsWith('/vendor/effekseer/'));
 const file=profile.path.slice('/vendor/effekseer/'.length);
 if(file.startsWith('Collections/'))assert.ok(pinned.has(file.slice('Collections/'.length)),'Unbundled effect '+name+': '+file);
 else assert.ok(file.startsWith('Resources/'),'Unrecognised existing effect: '+file);
 const icon=RUNE_SEMANTIC_ICONS[id];
 assert.equal(icon.id,id);assert.equal(icon.name,name);assert.match(icon.sha,/^[a-f\d]{40}$/);
 assert.equal(runeIconFor({rune_id:id}),'/vendor/rune-semantic-icons/'+id+'.svg');
}
assert.equal(AUTHORED_EFFECT_NAMES.tktk.length,41);
for(const effect of Object.values(RUNE_EFFECT_KEYS).filter(key=>key?.startsWith('M:'))){
 assert.ok(AUTHORED_EFFECT_FILES[effect]?.includes('MAGICALxSPIRAL/MxS_'),'new authored effect missing: '+effect);
 assert.ok(pinned.has(AUTHORED_EFFECT_FILES[effect].slice('Collections/'.length)),'new authored asset unbundled '+effect);
}
assert.ok(Object.values(RUNE_EFFECT_KEYS).filter(x=>x?.startsWith('M:')).length>10,'catalogue must retain authored modules');
for(const [name] of RUNE_VFX_REVIEW_QUEUE){
 const chosen=runeEffectFor({english_name:name});
 assert.ok(chosen?.path,'missing VFX: '+name);
 assert.ok(chosen.tuning,'review queue VFX requires semantically explicit playback: '+name);
}
assert.equal(AUTHORED_EFFECT_NAMES.materials.length,8);
assert.match(stage,/runeEffectFor\(rune\)/);
assert.match(stage,/runeIconFor\(rune\)/);
assert.match(stage,/effect\.overlays/,'licensed modules compose visible errors and chaos rings');
assert.match(stage,/iconMotionFor\(word\)/,'symbolic material has semantics-driven Motion, not generic bounces');
assert.match(stage,/scale:\[1\.3,1,\.42,0\]/,'Void must visibly converge toward its center');
assert.match(stage,/'星':\{x:/,'celestial star must fall, not rise like fireworks');
assert.match(stage,/onReady=\{\(\)=>setVisibleKey\(key\)\}/);
assert.match(stage,/useMemo\(\(\)=>runeEffectFor\(rune\)/);
assert.doesNotMatch(stage,/RuneAuraFX|RuneAura|const LIBRARY=/);
assert.match(pkg.scripts.prebuild,/prepare-rune-semantic-icons/);
// Semantic contract: an effect is distinct AND evokes the DB English concept.
assert.notEqual(RUNE_EFFECT_KEYS.Karma,'T:Fire2','Timing/coincidence must not be represented by fire');
assert.notEqual(RUNE_EFFECT_KEYS.Star,'T:Fire1','Celestial Star must not be generic fire');
assert.notEqual(RUNE_EFFECT_KEYS.Space,'G:ef_wind03','Space must not be a tornado');
assert.equal(RUNE_EFFECT_KEYS.Mirror,'M:Gohlem_Shield1','Mirror uses a shield-shaped authored VFX and optical reflection');
assert.equal(RUNE_EFFECT_KEYS.Spectrum,'T:Light3','Spectrum must use the authored multicolour light effect');
assert.match(readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8'),/data-rune="彩"/);

assert.deepEqual(RUNE_VFX_REVIEW_NAMES,['Mirror','Root','Branch','Jade','Crystal','Diamond','Dust']);
assert.ok(RUNE_VFX_REVIEW_NAMES.every(name=>RUNE_VFX_REVIEW_STATUS[name]==='rejected'),'the seven remain X until visual review');
assert.ok(runeEffectFor({english_name:'Root'}).overlays.every(x=>x.key==='B:Homing_Laser01'));
assert.ok(runeEffectFor({english_name:'Branch'}).overlays.every(x=>x.key==='B:Homing_Laser01'));
assert.ok(!runeEffectFor({english_name:'Mirror'}).overlays.some(x=>x.key.toLowerCase().includes('ice')));
assert.equal(runeEffectFor({english_name:'Mirror'}).overlays[0].key,'S:ImageDistortion','shield mirror contains authored reflective overlay');
assert.ok(EFFECT_ASSET_BLOBS.some(x=>x.target==='MAGICALxSPIRAL/MxS_Gohlem_Shield1.efkefc'),'mirror shield source must be pinned');
for(const key of ['B:Homing_Laser01','M:Sylph6','NS:MagicShield']){
 const path=AUTHORED_EFFECT_FILES[key]?.slice('Collections/'.length);
 assert.ok(EFFECT_ASSET_BLOBS.some(x=>x.target===path&&x.sha.length===40),'pinned authored VFX missing '+key);
}


assert.notEqual(RUNE_EFFECT_KEYS.Root,RUNE_EFFECT_KEYS.Dust,'owner forbids reusing former Dust as Root');
assert.equal(RUNE_EFFECT_TUNING.Root.motion,'root-branch-down');
assert.equal(RUNE_EFFECT_TUNING.Branch.motion,'branch-up');
assert.equal(RUNE_EFFECT_TUNING.Jade.motion,'jade-reflection');
assert.ok(runeEffectFor({english_name:'Dust'}).overlays.every(x=>x.key==='SAMPLE:Simple_Ribbon_Parent'));
assert.match(stage,/case 'root-branch-down'/);
assert.match(stage,/case 'branch-up'/);
assert.match(stage,/jade-reflection/);
assert.match(stage,/data-direction=\{direction/);
assert.match(stage,/rune-direction-stroke/);
const drawPreview=readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
assert.match(drawPreview,/direction=\{pending\.direction\}/,'3D draw and daily must pass the pending draw’s actual four-value direction');
for(const token of ['data-direction="upright"','data-direction="semi-upright"','data-direction="semi-reversed"','data-direction="reversed"']){
 assert.ok(presentation.includes(token),'directional stroke missing: '+token);
}
assert.match(presentation,/mask-image:repeating-linear-gradient/,'half-directions require interrupted outline, not solid');
assert.match(presentation,/-webkit-text-stroke:/,'orientation must hug the glyph outline');


assert.match(stage,/RITUAL_GLYPH_MOTION/,'ritual typography must have real zoom-and-return keyframes');
assert.match(stage,/RITUAL_KEYFRAMES/);
assert.match(stage,/ritualCameraDistance\(elapsed\)/,'authored VFX should visibly fill then relinquish stage');
assert.match(stage,/context\.play\(loaded,0,0,0\)/,'only the authored Rune effect is ever played');
assert.match(stage,/settledEffectStarted/,'the same authored scene should return at reduced footprint');
assert.match(stage,/ceremony=false/,'normal 3D atlas presentation must be unchanged');
assert.doesNotMatch(stage,/RuneAuraFX|RuneAura|customEmitter/);
const drawStage=readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
assert.match(drawStage,/direction=\{pending\.direction\} ceremony/,'only a real drawn Rune enters the ceremonial mode');
assert.match(drawStage,/appearance=\{ceremonySubject\}/);
assert.match(drawStage,/cardSrc=\{runeImage\(pending\.card\)\}/,'floating card uses its actual drawn Rune image');
assert.match(drawStage,/巨大符文字/);
assert.match(drawStage,/漂浮卡圖/);


assert.match(stage,/WaitingEffekseerStage/,'1-second waiting must use existing authored VFX');
assert.match(stage,/groupEffectFor/,'pre-authored group layers must be supported');
assert.match(stage,/context\.play\(groupAsset,0,0,0\)/,'group VFX plays inside the original context');
assert.match(stage,/onCeremonyComplete/,'revealed Rune must complete then transfer');
assert.equal(RUNE_EFFECT_KEYS.Root,'B:Homing_Laser01');
const drawFlow=readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
for(const key of ["'idle'","'waiting'","'revealing'","'transfer'","'ready'"]){
  assert.ok(drawFlow.includes(key),'ritual phase missing: '+key);
}
assert.match(drawFlow,/remainingWait=Math\.max\(0,1000-/,'waiting phase must last at least 1 second');
assert.match(stage,/textureRedirect=ambient&&effectFile\.endsWith\(/,
  'never redirect Illusion rune original smoke textures; 2K fog is ambient-only');
assert.match(drawFlow,/if\(mode!=='daily'\)setPhase\('waiting'\)/,'daily draw does not enter wait state');
assert.match(drawFlow,/if\(mode==='daily'\)\{[\s\S]*?cards\.current=\[item\];[\s\S]*?setResultOpen\(true\);/,
  'daily draw must show the one actual Rune and the complete daily results automatically');
assert.match(drawFlow,/mode!=='daily'\?<button type="button" onClick=\{reset\}>重新開始/,
  'daily mode must not expose multi-draw restart button');
assert.match(drawFlow,/mode!=='daily'\?<button type="button" className="rune-skin-btn" onClick=\{reset\}>開始新抽牌/,
  'daily results must not offer a redundant new draw');
const artDaily=readFileSync('app/lrunes/daily3d/RuneDaily3D.jsx','utf8');
assert.match(artDaily,/setDetails\(true\);/,'2D art daily must auto-open its one result');
assert.doesNotMatch(artDaily,/占卜結束，觀看每日指示|開始新抽牌/,'daily art has no redundant end/restart step');
assert.match(artDaily,/if\(lock\.current\|\|draw\)return/,'2D art daily cannot redraw once a card is shown');
assert.match(drawFlow,/<RuneCardInfo card=\{day\.card\} imageSrc=\{runeImage\(day\.card\)\} direction=\{day\.direction\}/,
  'daily results include original card and actual direction before five daily guidance fields');

assert.match(drawFlow,/onCeremonyComplete=\{\(\)=>setPhase/,'Rune returns to result area after authored performance');
assert.match(drawFlow,/onAnimationComplete=\{completeTransfer\}/,'moving into result shelf must finish before next draw');
assert.match(drawFlow,/onClick=\{\(\)=>choose\(item\.card\)\}/,'result shelf must open Rune details');
assert.match(drawFlow,/setResultOpen\(true\)/,'guide is a centered dialog, not a page section');
assert.match(drawFlow,/requestFullscreen/,'browser Fullscreen API controls stage without reinventing a renderer');
assert.doesNotMatch(drawFlow,/rune-3d-duel-action-dock/,'legacy controls below the stage are removed');
const cssHero=readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
assert.doesNotMatch(cssHero,/width:min\\(calc\\(100% - clamp\\(16px,3vw,56px\\)\\),1880px\\)/,
  '3D effect must inherit the original LOC content width instead of a competing 1880px main');
assert.match(drawFlow,/return <main className="loc-next-main"/,
  '3D stage belongs within the site page layout');
assert.match(drawFlow,/<div className="loc-panel rune-skin-lab rune-3d-shell">/,
  '3D stage remains inside the original LOC text panel');
assert.match(cssHero,/height:clamp\(620px,80dvh,980px\)/,'stage must be Hero-sized on desktop');
assert.match(cssHero,/\.rune-3d-stage:fullscreen/,'Fullscreen view must use the browser-native API');
assert.match(cssHero,/\.rune-3d-result-shelf/,'results belong inside the unified stage');
assert.match(cssHero,/\.rune-3d-stage:not\(\[data-ritual-phase="atlas"\]\)\{\s*background:#000;/,
  'rune draw canvas must use a true black backdrop to match dark-matte Effekseer sprites');
assert.match(cssHero,/\.rune-3d-night-backdrop\{[^}]*background:#000;/s,
  'the separate moonlit underlay must not introduce a purple/blue gradient behind particles');
assert.match(cssHero,/\.rune-3d-stage\[data-ritual-phase="revealing"\] \.rune-3d-night-moon/,
  'the moonlight illustration must clear during the large authored-effect reveal');
assert.doesNotMatch(cssHero,/radial-gradient\(ellipse 64% 72% at 70% 21%/,
  'old tinted radial gradient must not leak through transparent particle quads');
assert.match(cssHero,/\.rune-3d-stage\[data-ritual-phase="waiting"\] \.rune-3d-night-moon\{\s*filter:[^}]*opacity:0/s,
  'late waiting-state moon rules must not reintroduce purple behind opaque particles');
assert.match(cssHero,/\.rune-3d-stage\[data-ritual-phase="revealing"\] \.rune-3d-night-moon\{\s*filter:[^}]*opacity:0/s,
  'late revealing-state moon rules must not reintroduce purple backlight');

/* Authored moonlit mist: never replace the original 66 VFX with a homemade scene. */
assert.match(stage,/export function RuneMistBackdrop/,'draw stage must expose persistent native fog');
assert.match(stage,/AUTHORED_EFFECT_FILES\['M:foot_smoke2'\]/,'fog must be an existing Effekseer smoke module');
assert.match(stage,/ambientPauseRef/,'mobile GPU should pause fog drawing during the main rune performance');
assert.match(stage,/ambientRetire\?\.stop\?\.\(\)/,'persistent fog clips must retire old native handles');
assert.match(stage,/quality==='high'\?1\.5:1/,'ambient DPR needs both high-quality and balanced modes');
assert.match(drawFlow, /!isList\?<RuneMistBackdrop phase=\{phase\} quality=\{sceneQuality\} textureQuality=\{textureQuality\}/,
  'native Effekseer fog must be mounted by default on the main 3D draw stage');
assert.doesNotMatch(drawFlow,/fogPreview|setFogPreview|fog_preview/,
  'native smoke must never depend on a hidden query-string preview switch');
assert.match(drawFlow,/phase==='idle'\?<button type="button" className="rune-3d-tap-to-draw"/,
  'idle scene keeps the tap-anywhere-to-draw control');
assert.match(drawFlow,/phase==='waiting'\?<><WaitingEffekseerStage textureQuality=\{textureQuality\}\/>/,
  'waiting Effekseer begins only after the user draws');
assert.match(drawFlow,/rune-skin-moon rune-3d-night-moon/,'reuse existing moon artwork instead of DIY moon effects');
assert.match(drawFlow,/setSceneQuality\(current=>current==='high'\?'balanced':'high'\)/,'quality toggle must be functional');
assert.match(cssHero,/data-ritual-phase="waiting"/,'fog reacts to drawing click');
assert.match(cssHero,/data-ritual-phase="revealing"/,'authored fog clears for giant Rune');
assert.match(cssHero,/data-ritual-phase="transfer"/,'fog returns after the Rune settles');
assert.doesNotMatch(drawFlow,/new THREE\.Points|ShaderMaterial|RuneAura/,'no generated fog/particles/shader');


assert.match(drawFlow,/className="rune-3d-continue-hitarea"/,'the empty stage itself remains clickable');
assert.match(drawFlow,/onClick=\{drawOne\} aria-label="點選舞台繼續抽牌"/,'clicking empty stage draws the next Rune');
assert.match(drawFlow,/phase==='ready'&&mode==='duel'&&!finished&&items\.length<11/,'no redraw during completed or daily spreads');
assert.match(drawFlow,/輕觸舞台畫面任一空白處繼續抽牌/,'clear tap-the-stage instructions');
assert.match(drawFlow,/點選下方抽牌結果區觀看符文細節/,'result area explains detail access');
assert.doesNotMatch(drawFlow,/>繼續召喚符文<\/button>/,'there must not be a separate continue button');
assert.match(cssHero,/\.rune-3d-ritual-ready\{pointer-events:none\}/,'ready message must not intercept stage clicks');
assert.match(cssHero,/\.rune-3d-ritual-actions button\{pointer-events:auto\}/,'actual controls must remain independent of stage clicks');
assert.match(cssHero,/\.rune-3d-continue-hitarea:focus-visible/,'keyboard activation is available');


/* High-spec authored cinematic stage: one precise nine-group program with
   only licensed effects and normal Three.js/Effekseer camera playback. */
assert.equal(GROUP_STAGE_LANGUAGE.length,9,'one theatrical camera language per canonical group');
assert.equal(new Set(GROUP_STAGE_LANGUAGE.map(row=>row.style)).size,9,'every group needs a distinct scenic motion signature');
for(const entry of GROUP_STAGE_LANGUAGE){
  assert.ok(AUTHORED_EFFECT_FILES[entry.impact],'unlicensed/missing Effekseer impact '+entry.impact);
  assert.ok(entry.impactScale>0&&entry.impactSpeed>0,'invalid authored playback transform for '+entry.group);
}
for(let id=1;id<=66;id++){
  const scene=groupStageForRune(id);
  assert.equal(scene,GROUP_STAGE_LANGUAGE[id<=64?Math.floor((id-1)/8):8],'wrong group staging for rune '+id);
}
for(const value of [0,-1,67,66.1,'not-a-rune'])assert.equal(groupStageForRune(value),null);
assert.equal(GROUP_IMPACT_AT,.62,'authored impact aligns with first full rune reveal');
assert.equal(cinematicCameraPose(5,GROUP_STAGE_LANGUAGE[5],24).z,24,'camera must return to its original focal depth');
assert.ok(cinematicCameraPose(GROUP_IMPACT_AT,GROUP_STAGE_LANGUAGE[5],12).z<12,'impact must physically advance the lens');
assert.notEqual(cinematicCameraPose(1.3,GROUP_STAGE_LANGUAGE[0],13).x,cinematicCameraPose(1.3,GROUP_STAGE_LANGUAGE[3],13).x,
  'camera choreography must distinguish groups');
assert.match(stage,/cinematicCameraPose\(elapsed,groupStage,ritualCameraDistance\(elapsed\)\)/);
assert.match(stage,/context\.play\(impactAsset,0,0,0\)/,'impact must play an existing Effekseer file');
assert.match(stage,/AUTHORED_EFFECT_FILES\[groupStage\.impact\]/,'impact must come from the pinned author library');
assert.match(stage,/ambientDepth==='foreground'/,'high-spec mist needs real native foreground spatial placement');
assert.match(stage,/ambientGhost\.setLocation\(/,'high-spec mist needs a far-depth authored layer');
assert.match(stage,/quality==='high'&&!reduced/,'balanced mode must avoid the third WebGL canvas');
assert.doesNotMatch(stage,/AUTHORED_EFFECT_FILES\['M:foot_smoke7'\]/,
  'particle-only smoke7 is not a valid mist source');
assert.match(stage,/\/MxS_foot_smoke2\.efkefc/,'correct texture redirect applies to vetted smoke source');
assert.match(AMBIENT_FOG_IMAGE,/Texture\/_fog-cloud-2048\.png$/);
assert.match(stage,/redirectAmbientFogTexture\(path,/,'only vetted native fog textures are redirected');
const fogPaths=[
  ['Texture/smoke_01.png','Texture/_fog-cloud-2048.png','Texture/_hd256/_fog-cloud-2048.png'],
  ['Texture/star.png','Texture/_fog-cloud-2048.png','Texture/_hd256/_fog-cloud-2048.png'],
  ['smoke_01.png?revision=1','_fog-cloud-2048.png?revision=1','_hd256/_fog-cloud-2048.png?revision=1'],
  ['Texture\\\\star.png','Texture\\\\_fog-cloud-2048.png','Texture\\\\_hd256\\\\_fog-cloud-2048.png'],
  ['/vendor/effekseer/Texture/smoke_01.png','/vendor/effekseer/Texture/_fog-cloud-2048.png','/vendor/effekseer/Texture/_hd256/_fog-cloud-2048.png']
];
for(const [input,normal,hd] of fogPaths){
  const seen=[];
  assert.equal(redirectAmbientFogTexture(input,{onReplacement:p=>seen.push(p)}),normal);
  assert.equal(redirectAmbientFogTexture(input,{quality:'hd256'}),hd);
  assert.equal(seen.length,1,'diagnostic reports each redirected authored fog texture');
}
assert.equal(redirectAmbientFogTexture('/Texture/unrelated.png',{quality:'hd256'}),'/Texture/unrelated.png');
assert.match(stage,/diagnoseAmbient/,'QA diagnostics must stay explicitly opt-in');
assert.match(stage,/getContextAttributes/,'QA diagnostics must inspect actual WebGL canvas alpha');
const drawPreview=readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
assert.match(drawPreview,/query.get\('fog_preview'\)==='1'/,'QA activated only via fog_preview=1');
assert.match(drawPreview,/diagnoseAmbient=\{diagnoseAmbient\}/);

assert.doesNotMatch(stage,/textureRedirect[\s\S]*?_fog-star\.png/,'star sprites must not appear in the persistent fog');
assert.match(stage,/textureRedirect\);/,'official loadEffect redirect callback resolves transparent cloud images');
const hdBuild=readFileSync('scripts/prepare-rune-fog-hd.mjs','utf8');
assert.match(hdBuild,/HD_FOG_SIZE=2048/,'stage fog must originate at full 2K');
assert.match(hdBuild,/\[4,6\]\.includes\(type\)/,'stage fog requires explicit PNG alpha');
assert.match(hdBuild,/CC0/,'licensed high-resolution fog provenance is required');
assert.match(stage,/ambient\?\{enablePremultipliedAlpha:true\}:undefined/,
  'ambient Effekseer blending must match the Three.js premultiplied canvas');
assert.match(stage,/premultipliedAlpha:ambient/,
  'the THREE canvas must use straight alpha for drawn runes and premultiplied alpha for ambient fog');
assert.match(stage,/antialias:quality==='high'&&!ambient/,
  'high-quality 3D rune opening must retain native antialiasing');
assert.match(cssHero,/\.rune-3d-mist-backdrop \.rune-effekseer-canvas\{[^}]*mix-blend-mode:screen/s,
  'black-matte smoke cannot render as a rectangle over the moonlit stage');
assert.match(stage,/groupHandle\.setScale\(grow,grow,grow\)/,'group backdrop changes over the same authored timeline');
const cinematicCSS=readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8');
assert.match(cinematicCSS,/\.rune-3d-foreground-mist\{/);
assert.match(cinematicCSS,/rune-cinematic-peak 4\.8s/);
assert.match(cinematicCSS,/data-ritual-phase="revealing".*rune-3d-foreground-mist/);
assert.doesNotMatch(stage,/new THREE\.Points|new THREE\.ShaderMaterial|RuneAura/);

console.log('Rune embodiment: 66 distinct authored VFX, 66 unique semantic symbols, all pinned with provenance.');
