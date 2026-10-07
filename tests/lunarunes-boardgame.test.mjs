import test from 'node:test';
import assert from 'node:assert/strict';
import {createLunaRunesGame} from '../app/lrunes/game/boardgame-rules.js';

const config={playerMin:2,playerMax:4,deMin:0,deMax:8,openingDraw:8,openingDiscard:3,handBase:5,handTempCap:10,eventResponseCards:2,resonanceSelf:1,resonanceAttack:-1};
const cards=Array.from({length:66},(_,i)=>({id:i+1,name:'Rune '+(i+1),group:'Group '+(i%8),alphaCompatMacro:'macro'+(i%4)}));
const rules={cards,events:[{id:'event-1',name:'Test',req:['macro0'],description:'',requirement:''}],rounds:Array.from({length:8},(_,i)=>({round:i+1,phase:i%2?'resonance':'event'})),config,resultByCoverage:new Map(Array.from({length:5},(_,i)=>[i,{code:String(i),label:'result',delta:1,drawCount:1}]))};
const run=(move,G,...args)=>move({G},...args);

test('opening, event, resonance and card limits',()=>{
  const game=createLunaRunesGame(rules,2);
  const G=game.setup();
  assert.equal(G.stage,'opening');
  assert.equal(G.players.length,2);
  for(let i=0;i<2;i++){
    const ids=G.players[i].hand.slice(0,config.openingDiscard).map(c=>c.id);
    for(const id of ids)run(game.moves.toggleCard,G,i,id);
    run(game.moves.confirmOpening,G,i);
  }
  assert.equal(G.stage,'event');
  for(let i=0;i<2;i++){
    assert.equal(G.players[i].hand.length,config.handBase);
    for(const c of G.players[i].hand.slice(0,2))run(game.moves.toggleCard,G,i,c.id);
  }
  run(game.moves.resolveEvent,G);
  assert.equal(G.round,2);
  assert.equal(G.stage,'resonance');
  run(game.moves.resonance,G,'self');
  run(game.moves.resonance,G,'self');
  assert.equal(G.round,3);
  assert.equal(G.stage,'event');
  assert.equal(G.history.length>1,true);
});
test('reject invalid player count',()=>{
  assert.throws(()=>createLunaRunesGame(rules,5),/玩家人數/);
});
