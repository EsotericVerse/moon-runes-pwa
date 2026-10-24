import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GLYPH_MOTION_STYLES,GLYPH_MOTION_TIMES,RUNE_GLYPH_MOTION_BY_ID,
  RUNE_GLYPH_MOTION_PRESETS,runeGlyphMotionFor
} from '../app/lrunes/effekseer/rune-glyph-motion.mjs';
import {RUNE_GLYPH_INKS,runeGlyphProfile} from '../app/lrunes/effekseer/rune-glyph-library.mjs';
import {CANONICAL_RUNE_ENGLISH} from '../app/lrunes/effekseer/rune-effect-library.mjs';

test('all 66 identities have 66 deliberately named, non-recycled choreography presets',()=>{
  const ids=Array.from({length:66},(_,i)=>i+1);
  assert.deepEqual(Object.keys(RUNE_GLYPH_MOTION_PRESETS).map(Number),ids);
  assert.equal(GLYPH_MOTION_STYLES.length,66);
  assert.equal(new Set(GLYPH_MOTION_STYLES).size,66);
  assert.equal(new Set(Object.values(RUNE_GLYPH_MOTION_BY_ID)).size,66);
  assert.equal(CANONICAL_RUNE_ENGLISH.length,67);
  const motions=ids.map(id=>runeGlyphMotionFor({rune_id:id}));
  assert.equal(new Set(motions.map(x=>JSON.stringify(x.frames))).size,66,
    'unique names are not enough: keyframe curves must also differ');
  assert.ok(motions.every(({style})=>style!=='none'));
});

test('meaning governs the choreography: illness weakens and trembles; gravity and wind remain distinct',()=>{
  const m=id=>runeGlyphMotionFor({rune_id:id});
  const ill=m(19),leaf=m(27),fruit=m(31),root=m(29),fire=m(44),water=m(43),clock=m(54);
  assert.equal(ill.style,'illness-atrophy-tremor');
  assert.ok(ill.frames.scale[0]===1&&ill.frames.scale.at(-1)<.8,
    'Illness must visibly shrink rather than swell');
  assert.ok(ill.frames.x[1]<0&&ill.frames.x[2]>0&&ill.frames.x[3]<0&&ill.frames.x[4]>0,
    'Illness must shiver from side to side during the shrink');
  assert.equal(leaf.style,'leaf-wind-dance');
  assert.ok(leaf.frames.y[0]>0&&leaf.frames.y[3]<0,'Leaf drifts upwards');
  assert.ok(new Set(leaf.frames.x).size>=5,'Leaf swirls instead of straight-line translation');
  assert.equal(fruit.style,'fruit-gravity-bounce');
  assert.ok(fruit.frames.y[0]<0&&fruit.frames.y[4]>0,'Fruit falls and rebounds');
  assert.ok(root.frames.y[0]<0&&root.frames.y[4]>0,'Root descends into earth');
  assert.ok(fire.frames.y[0]>0&&fire.frames.y[4]<0,'Flame rises');
  assert.ok(new Set(water.frames.y).size>=4&&new Set(water.frames.x).size>=4,'Water forms a wave');
  assert.equal(clock.style,'time-clock-pendulum');
  assert.ok(clock.frames.rotate[0]<0&&clock.frames.rotate[2]>0&&clock.frames.rotate[3]<0);
});

test('movement preserves legibility on all 66 runes and reduced-motion remains available',()=>{
  for(let id=1;id<=66;id++){
    for(const ceremony of [false,true]){
      const {frames}=runeGlyphMotionFor({rune_id:id},{ceremony});
      for(const [prop,seq] of Object.entries(frames)){
        assert.equal(seq.length,GLYPH_MOTION_TIMES.length,`rune ${id} ${prop}`);
        assert.ok(seq.every(Number.isFinite),`rune ${id} nonfinite ${prop}`);
        if(prop==='scale')assert.ok(seq.every(v=>v>=.7&&v<=1.05),
          `rune ${id} must never be enlarged enough to show aliased contours`);
        if(prop==='rotate')assert.ok(seq.every(v=>Math.abs(v)<=21),`rune ${id} still readable`);
      }
      assert.equal(frames.opacity.at(-1),ceremony?1:0);
    }
  }
  const source=readFileSync(new URL('../app/lrunes/effekseer/EffekseerStage.jsx',import.meta.url),'utf8');
  assert.ok(source.includes('animate={reduced?{opacity:1,scale:1}:letterMotion.frames}'));
  assert.ok(source.includes('ritualCameraDistance(elapsed,runeId)'));
  assert.ok(!source.includes('RITUAL_GLYPH_MOTION'));
});

test('all 67 glyph identities have semantic colors in both 3D materials and 2D fallback',()=>{
  assert.deepEqual(Object.keys(RUNE_GLYPH_INKS).map(Number),Array.from({length:67},(_,i)=>i));
  for(let id=0;id<=66;id++){
    const expected=RUNE_GLYPH_INKS[id];
    assert.match(expected,/^#[0-9a-f]{6}$/i);
    assert.equal(runeGlyphProfile({rune_id:id}).ink,expected);
  }
  const water=RUNE_GLYPH_INKS[43],fire=RUNE_GLYPH_INKS[44];
  assert.equal(water,'#66d0ff','Water must be water-blue, not yellow');
  assert.equal(fire,'#ff985d','Flame must be warm orange');
  const material=readFileSync(new URL('../app/lrunes/effekseer/RuneExtrudedGlyph.jsx',import.meta.url),'utf8');
  const stage=readFileSync(new URL('../app/lrunes/effekseer/EffekseerStage.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../app/lrunes/effekseer/effekseer-stage.css',import.meta.url),'utf8');
  assert.ok(material.includes('const ink=profile.ink;'));
  assert.ok(stage.includes("style={{'--rune-ink':profile.ink}}"));
  assert.ok(!css.includes('0 0 2px color-mix(in srgb,var(--loc-gold) 55%,transparent)'));
});

test('letter size stays moderate on desktop/mobile and in the atlas',()=>{
  const css=readFileSync(new URL('../app/lrunes/effekseer/effekseer-stage.css',import.meta.url),'utf8');
  for(const token of ['clamp(64px,12vw,116px)','clamp(62px,18vw,100px)',
    'clamp(72px,8.6vw,104px)','clamp(70px,17vw,92px)'])
    assert.ok(css.includes(token),token);
});
