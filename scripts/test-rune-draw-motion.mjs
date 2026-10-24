import assert from 'node:assert/strict';
import test from 'node:test';
import {runeDrawMotion,runeDrawGroup} from '../app/lrunes/rune-draw-motion.mjs';

const groups=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];

test('nine rune groups have distinct choreographies ending at the same reveal pose',()=>{
  const signatures=groups.map(group=>{
    const {initial,animate,transition}=runeDrawMotion(group,0,{width:1000,height:600});
    assert.equal(initial.x,-260);
    assert.equal(initial.y,108);
    assert.equal(animate.x.at(-1),0);
    assert.equal(animate.y.at(-1),0);
    assert.equal(animate.rotateY.at(-1)%360,180);
    assert.equal(animate.rotateZ.at(-1),0);
    for(const field of ['x','y','scale','rotateY','rotateZ'])assert.equal(animate[field].length,4);
    return JSON.stringify({animate,transition});
  });
  assert.equal(new Set(signatures).size,9);
});
test('orientations affect only final facing, not the group motion',()=>{
  for(const group of groups)for(const [i,angle] of [0,90,-90,180].entries()){
    const r=runeDrawMotion(group,i,{width:1000,height:600});
    assert.equal(r.animate.rotateZ.at(-1),angle);
    assert.equal(r.initial.x,-260);
    assert.equal(r.animate.x.at(-1),0);
  }
});
test('reduced motion is brief and travel-free',()=>{
  for(const group of groups){const r=runeDrawMotion(group,3,{width:640,height:400},true);
    assert.equal(r.transition.duration,.05);
    assert.equal(r.animate.x,0);
    assert.equal(r.animate.rotateZ,180);
  }
});
test('all 66 runes resolve to the correct group, including both specials',()=>{
  for(let id=1;id<=66;id++){
    assert.equal(runeDrawGroup({rune_id:id}),groups[id>=65?8:Math.floor((id-1)/8)]);
  }
  assert.equal(runeDrawGroup({group_name:'生命'}),'生命');
  assert.equal(runeDrawGroup({rune_id:999}),'特殊');
});
