import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTHORED_EFFECT_FILES,RUNE_EFFECT_KEYS,CANONICAL_RUNE_ENGLISH,RUNE_EFFECT_TUNING,runeEffectFor} from '../app/lrunes/effekseer/rune-effect-library.mjs';
import {EFFECT_ASSET_BLOBS,AUTHORED_EFFECT_NAMES} from './rune-effekseer-asset-manifest.mjs';
import {RUNE_SEMANTIC_ICONS,runeIconFor} from '../app/lrunes/effekseer/rune-semantic-icons.mjs';
import {RUNE_REJECTED_BRIEFS,ACCEPTED_RUNE_EFFECT_BASELINE} from './rune-rejected-brief.mjs';
import {RUNE_VFX_REVIEW_QUEUE,RUNE_VFX_REVIEW_NAMES} from '../app/lrunes/effekseer/rune-review-queue.mjs';
const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(CANONICAL_RUNE_ENGLISH.length,67);
assert.equal(new Set(CANONICAL_RUNE_ENGLISH).size,67);
assert.deepEqual(Object.keys(RUNE_EFFECT_KEYS),CANONICAL_RUNE_ENGLISH);
assert.equal(RUNE_REJECTED_BRIEFS.length,34,'owner returned exactly 34 runes');
assert.equal(new Set(RUNE_REJECTED_BRIEFS.map(row=>row[0])).size,34);
assert.equal(new Set(RUNE_REJECTED_BRIEFS.map(row=>row[1])).size,34);
assert.equal(Object.keys(ACCEPTED_RUNE_EFFECT_BASELINE).length,31,'Mirror was returned and must not remain in accepted baseline');
assert.equal(RUNE_VFX_REVIEW_QUEUE.length,12);
assert.equal(new Set(RUNE_VFX_REVIEW_NAMES).size,12);
assert.equal(new Set(RUNE_VFX_REVIEW_QUEUE.map(row=>row[1])).size,12);
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
assert.equal(RUNE_EFFECT_KEYS.Root,'M:Magic1_earth','Root uses earth motion, not lightning');
assert.ok(!runeEffectFor({english_name:'Root'}).overlays.some(x=>x.key.includes('lightning')),'no lightning root overlays');
assert.equal(RUNE_EFFECT_KEYS.Branch,'M:Sylph8','Branch uses authored organic flow, not lightning');
assert.ok(!runeEffectFor({english_name:'Branch'}).overlays.some(x=>x.key.includes('lightning')),'no lightning branch overlays');
assert.equal(RUNE_EFFECT_KEYS.Jade,'M:Sylph5','Jade no longer uses pixel material');
assert.equal(RUNE_EFFECT_KEYS.Dust,'M:foot_smoke7');
assert.equal(RUNE_EFFECT_KEYS.Illusion,'M:foot_smoke2');
assert.equal(RUNE_EFFECT_KEYS.Chaos,'M:Sylph13','Chaos inherits former Fate VFX');
assert.equal(RUNE_EFFECT_KEYS.Fate,'SAMPLE:Simple_Ring_Shape1','Fate inherits former Chaos VFX');
assert.ok(presentation.includes('grayscale(1) brightness(1.65)'),'Star filters color out of the VFX canvas');
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
assert.equal(RUNE_EFFECT_KEYS.Mirror,'S:ImageDistortion','Mirror uses authored optical reflection, never ice');
assert.equal(RUNE_EFFECT_KEYS.Spectrum,'T:Light3','Spectrum must use the authored multicolour light effect');
assert.match(readFileSync('app/lrunes/effekseer/effekseer-stage.css','utf8'),/data-rune="彩"/);
console.log('Rune embodiment: 66 distinct authored VFX, 66 unique semantic symbols, all pinned with provenance.');
