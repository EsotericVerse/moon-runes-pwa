import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTHORED_EFFECT_FILES,RUNE_EFFECT_KEYS,CANONICAL_RUNE_ENGLISH,runeEffectFor} from '../app/lrunes/effekseer/rune-effect-library.mjs';
import {EFFECT_ASSET_BLOBS,AUTHORED_EFFECT_NAMES} from './rune-effekseer-asset-manifest.mjs';
const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(CANONICAL_RUNE_ENGLISH.length,67);
assert.equal(new Set(CANONICAL_RUNE_ENGLISH).size,67);
assert.equal(Object.keys(RUNE_EFFECT_KEYS).length,67);
assert.deepEqual(Object.keys(RUNE_EFFECT_KEYS),CANONICAL_RUNE_ENGLISH);
assert.equal(RUNE_EFFECT_KEYS.Blank,null,'Blank is deliberate absence, never Void');
assert.notEqual(RUNE_EFFECT_KEYS.Void,RUNE_EFFECT_KEYS.Illusion);
assert.notEqual(RUNE_EFFECT_KEYS.Flame,RUNE_EFFECT_KEYS.Radiance);
assert.notEqual(RUNE_EFFECT_KEYS.Thunder,RUNE_EFFECT_KEYS.Wind);
const installed=new Set(EFFECT_ASSET_BLOBS.map(file=>file.target));
assert.equal(installed.size,EFFECT_ASSET_BLOBS.length,'Bundle paths are unique');
for(const blob of EFFECT_ASSET_BLOBS){
 assert.match(blob.sha,/^[\da-f]{40}$/);
 assert.ok(blob.size>0);
 assert.ok(blob.repo&&blob.revision&&blob.path);
}
for(let i=0;i<CANONICAL_RUNE_ENGLISH.length;i++){
 const name=CANONICAL_RUNE_ENGLISH[i];
 const effect=runeEffectFor({rune_id:i,english_name:name});
 if(i===0||name==='Blank'){assert.equal(effect,null);continue;}
 assert.ok(effect,'Missing authored effect for '+i+' '+name);
 assert.ok(AUTHORED_EFFECT_FILES[RUNE_EFFECT_KEYS[name]]);
 assert.ok(effect.path.startsWith('/vendor/effekseer/'));
 const relative=effect.path.slice('/vendor/effekseer/'.length);
 if(relative.startsWith('Collections/')){
  assert.ok(installed.has(relative.slice('Collections/'.length)),'Missing pinned package: '+name);
 } else {
  assert.ok(relative.startsWith('Resources/'),'Unexpected effect path: '+relative);
 }
}
assert.equal(CANONICAL_RUNE_ENGLISH.filter(name=>RUNE_EFFECT_KEYS[name]).length,65);
assert.equal(AUTHORED_EFFECT_NAMES.godot4.length,16);
assert.equal(AUTHORED_EFFECT_NAMES.tktk.length,7);
assert.match(stage,/runeEffectFor\(rune\)/);
assert.match(stage,/onReady=\{\(\)=>setVisibleKey\(key\)\}/);
assert.doesNotMatch(stage,/const LIBRARY=|RuneAuraFX|RuneAura/);
assert.match(pkg.scripts.prebuild,/prepare-rune-effekseer-assets/);
console.log('65 drawable effects use pinned authored assets; Blank remains distinct and intentionally without magic.');
