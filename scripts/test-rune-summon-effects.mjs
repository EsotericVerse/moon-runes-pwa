import test from 'node:test';
import assert from 'node:assert/strict';
import {GROUP_SUMMON_EFFECTS,groupSummonForRune} from '../app/lrunes/effekseer/rune-cinematic-language.mjs';
import {AUTHORED_EFFECT_FILES} from '../app/lrunes/effekseer/rune-effect-library.mjs';

test('nine distinct authored prelude effects replace the repeated MagicArea beam',()=>{
  assert.equal(GROUP_SUMMON_EFFECTS.length,9);
  assert.equal(new Set(GROUP_SUMMON_EFFECTS.map(s=>s.key)).size,9);
  assert.ok(GROUP_SUMMON_EFFECTS.every(s=>Boolean(AUTHORED_EFFECT_FILES[s.key])));
  assert.ok(GROUP_SUMMON_EFFECTS.every(s=>s.key!=='M:MagicArea'));
});
test('all 66 runes select the correct group for the prelude',()=>{
  for(let id=1;id<=66;id++){
    const expected=id>64?8:Math.floor((id-1)/8);
    assert.equal(groupSummonForRune(id),GROUP_SUMMON_EFFECTS[expected]);
  }
  assert.equal(groupSummonForRune(0),null);
  assert.equal(groupSummonForRune(67),null);
  assert.equal(groupSummonForRune('bad'),null);
});

test('draw prelude and reveal play each rune scene, not nine shared group effects',()=>{
  const source=readFileSync(new URL('../app/lrunes/effekseer/EffekseerStage.jsx',import.meta.url),'utf8');
  assert.ok(source.includes('return runeEffectFor({english_name:CANONICAL_RUNE_ENGLISH[id]});'));
  assert.ok(source.includes('data-source="authored-rune-prelude"'));
  assert.ok(source.includes('data-effect-key={effect?.key'));
  assert.ok(source.includes('<EffekseerCanvas key={key} effect={effect} reduced={reduced} ceremony={ceremony}'));
  assert.ok(!source.includes('ceremony?groupEffectFor(rune)'));
  assert.ok(!source.includes('ceremony?groupStageForRune(rune?.rune_id)'));
});
