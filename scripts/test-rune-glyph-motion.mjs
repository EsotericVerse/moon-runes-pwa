import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GLYPH_MOTION_STYLES,GLYPH_MOTION_TIMES,
  RUNE_GLYPH_MOTION_BY_ID,runeGlyphMotionFor
} from '../app/lrunes/effekseer/rune-glyph-motion.mjs';

test('66 meanings explicitly select a movement: Leaf drifts, Fruit falls',()=>{
  assert.deepEqual(Object.keys(RUNE_GLYPH_MOTION_BY_ID).map(Number),Array.from({length:66},(_,i)=>i+1));
  assert.equal(GLYPH_MOTION_STYLES.length,12);
  const kinds=new Set(Object.values(RUNE_GLYPH_MOTION_BY_ID));
  assert.ok([...kinds].every(style=>GLYPH_MOTION_STYLES.includes(style)));
  assert.equal(kinds.size,12);
  const leaf=runeGlyphMotionFor({rune_id:27}),fruit=runeGlyphMotionFor({rune_id:31});
  assert.equal(leaf.style,'drift');assert.equal(fruit.style,'fall');
  assert.ok(leaf.frames.y[0]>0 && leaf.frames.y[3]<0,'Leaf floats upward rather than dropping');
  assert.ok(fruit.frames.y[0]<0 && fruit.frames.y[4]>0,'Fruit drops from above and settles below');
  assert.equal(runeGlyphMotionFor({rune_id:29}).style,'fall','Root moves down');
  assert.equal(runeGlyphMotionFor({rune_id:44}).style,'rise','Flame moves up');
  assert.equal(runeGlyphMotionFor({rune_id:54}).style,'pendulum','Time moves periodically');
});
test('distinct, subtle, legible letter motions preserve native particle fidelity',()=>{
  const animations=Array.from({length:66},(_,i)=>runeGlyphMotionFor({rune_id:i+1}));
  assert.equal(new Set(animations.map(x=>JSON.stringify(x.frames))).size,66);
  for(const a of animations){
    for(const [property,sequence] of Object.entries(a.frames)){
      assert.equal(sequence.length,GLYPH_MOTION_TIMES.length,property);
      assert.ok(sequence.every(Number.isFinite),property);
      if(property==='scale')assert.ok(sequence.every(value=>value>=.92&&value<=1.06),'Do not upscale glyph geometry');
      if(property==='rotate')assert.ok(sequence.every(value=>Math.abs(value)<22),'Keep glyphs readable and front-facing');
    }
  }
});
test('ceremony no longer forces the same two-times enlarged glyph',()=>{
  const animations=Array.from({length:66},(_,i)=>runeGlyphMotionFor({rune_id:i+1},{ceremony:true}));
  assert.ok(animations.every(m=>m.frames.opacity.at(-1)===1));
  const stage=readFileSync(new URL('../app/lrunes/effekseer/EffekseerStage.jsx',import.meta.url),'utf8');
  assert.ok(stage.includes('animate={reduced?{opacity:1,scale:1}:letterMotion.frames}'));
  assert.ok(stage.includes('ritualCameraDistance(elapsed,runeId)'));
  assert.ok(!stage.includes('if(t<.63)return 24-'));
  assert.ok(!stage.includes('RITUAL_GLYPH_MOTION'));
});
test('smaller lettering in stage and atlas, including narrow screens',()=>{
  const css=readFileSync(new URL('../app/lrunes/effekseer/effekseer-stage.css',import.meta.url),'utf8');
  for(const token of [
    'font-size:clamp(64px,12vw,116px)',
    'font-size:clamp(62px,18vw,100px)',
    'font-size:clamp(72px,8.6vw,104px)',
    'font-size:clamp(70px,17vw,92px)'
  ])assert.ok(css.includes(token),token);
});
