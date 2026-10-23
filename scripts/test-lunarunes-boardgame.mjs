import test from 'node:test';
import assert from 'node:assert/strict';
import {createLunaRunesGame} from '../app/lrunes/game/boardgame-rules.js';
import {produce} from 'immer';
import {packTabletopState,unpackTabletopState,validState} from '../app/lrunes/game/tabletop-state.mjs';

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

test('local React/Immer move transition preserves the previous game state',()=>{
  const game=createLunaRunesGame(rules,2);
  const before=game.setup();
  const id=before.players[0].hand[0].id;
  const selected=produce(before,draft=>game.moves.toggleCard({G:draft},0,id));
  assert.deepEqual(before.players[0].selected,[]);
  assert.deepEqual(selected.players[0].selected,[id]);
  assert.notStrictEqual(selected,before);
  const cleared=produce(selected,draft=>game.moves.toggleCard({G:draft},0,id));
  assert.deepEqual(cleared.players[0].selected,[]);
  assert.deepEqual(selected.players[0].selected,[id]);
});

test('online room snapshot preserves exact cards with smaller Realtime payload',()=>{
  const game=createLunaRunesGame(rules,4);
  const original=game.setup();
  const packed=packTabletopState(original);
  assert.equal(typeof packed.players[0].hand[0],'number');
  assert.ok(JSON.stringify(packed).length<JSON.stringify(original).length);
  assert.deepEqual(unpackTabletopState(packed,rules.cards),original);
  packed.players[0].hand[0]=999;
  assert.equal(unpackTabletopState(packed,rules.cards),null);
});

test('cross-device 2–4 player turns remain identical after every Realtime snapshot',()=>{
  for(const count of [2,3,4]){
    const game=createLunaRunesGame(rules,count);
    let host=game.setup();
    const reflect=()=>{
      const wire=JSON.parse(JSON.stringify(packTabletopState(host)));
      assert.equal(validState(wire),true);
      assert.ok(Buffer.byteLength(JSON.stringify(wire),'utf8')<262144,'snapshot must fit Realtime message');
      const guest=unpackTabletopState(wire,rules.cards);
      assert.deepEqual(guest,host);
    };
    reflect();
    for(let player=0;player<count;player++){
      const chosen=host.players[player].hand.slice(0,config.openingDiscard).map(card=>card.id);
      for(const id of chosen){
        host=produce(host,draft=>game.moves.toggleCard({G:draft},player,id));
        reflect();
      }
      host=produce(host,draft=>game.moves.confirmOpening({G:draft},player));
      reflect();
    }
    assert.equal(host.stage,'event');
    for(let player=0;player<count;player++)
      for(const card of host.players[player].hand.slice(0,config.eventResponseCards)){
        host=produce(host,draft=>game.moves.toggleCard({G:draft},player,card.id));
        reflect();
      }
    host=produce(host,draft=>game.moves.resolveEvent({G:draft}));
    assert.equal(host.stage,'resonance');
    reflect();
    for(let player=0;player<count;player++){
      host=produce(host,draft=>game.moves.resonance({G:draft},'self'));
      reflect();
    }
    assert.equal(host.round,3);
    assert.equal(host.stage,'event');
  }
});

test('invalid cross-device snapshots are rejected',()=>{
  const game=createLunaRunesGame(rules,2);
  const good=packTabletopState(game.setup());
  assert.equal(validState({...good,stage:'invalid'}),false);
  assert.equal(validState({...good,players:[]}),false);
  assert.equal(validState({...good,round:'one'}),false);
  assert.equal(unpackTabletopState({...good,players:[
    {...good.players[0],hand:[999]},good.players[1]
  ]},rules.cards),null);
});
