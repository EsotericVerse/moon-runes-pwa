'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchNeonDataBatch, LOC_DATA } from '../data';
import { applyDe, createCards, createEvents, draw, evaluateEvent, finishOpening, freshPlayer, HAND_RULE, MULTI_PLAYER_ROUNDS, shuffle, TWO_PLAYER_ROUNDS } from '../model/game-data';
import { GAME_ACTIONS, GAME_DOC_SECTIONS, GAME_HISTORY, GAME_ROLES } from '../model/game-docs';

const NAMES=['A','B','C','D'];
const resultText={perfect:'完美 4/4 · De +2',pass:'過關 3/4 · De +1',fair:'尚可 2/4 · De +0',replenish:'補牌 1/4 · De +0',fail:'不行 0/4 · De −1'};

function GameDocs({data}){
  const[section,setSection]=useState('rules');
  return <section className="loc-card"><h2>遊戲文件</h2><div className="loc-actions">{GAME_DOC_SECTIONS.map(([id,label])=><button key={id} className={`loc-button ${section===id?'primary':''}`} onClick={()=>setSection(id)}>{label}</button>)}</div>
  {section==='rules'&&<div className="loc-log"><h3>Current Alpha 基本規則</h3><p><b>目標：</b>以 Event、Resonance／Battle 改變 De。De 範圍 0–8；先到 8 不會立即勝利。</p><p><b>2P：</b>R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance；R8 完成才比較 De，同分進 Duel。</p><p><b>3P/4P：</b>E → B 交替至 R8；共同 Event 與 Battle 細則仍屬 Alpha playtest。</p><p><b>Event：</b>每次固定使用兩張 Rune 回應。結果為 4/4 +2、3/4 +1、2/4 +0、1/4 補牌 +0、0/4 −1。</p><p><b>Macro：</b>SL＝Soul + Link；ML＝Mineral + Life；NE＝Nature + Element；OD＝Order + Disorder。</p><p><b>手牌：</b>基準 5、暫時上限 8；一般 Event 補 2，Fail 補 1。特殊 Rune 可另行補牌。起手流程目前為 Alpha 測試項。</p></div>}
  {section==='events'&&<div className="loc-log"><h3>Alpha Event32</h3>{data?.events?.map(e=><p key={e.id}><b>{e.id} {e.name}</b>｜{e.req.join(' + ')}｜{e.desc}</p>)||<p>Event 資料載入中。</p>}</div>}
  {section==='actions'&&<div className="loc-log"><h3>Rune Action Profile 01–64</h3><p>歷史 Game 行為原型，不反向定義 Rune Canon。De16 門檻保留歷史標記，等待 De8 playtest 遷移。</p>{Object.entries(GAME_ACTIONS).map(([id,text])=><p key={id}><b>{String(id).padStart(2,'0')}</b>｜{text}</p>)}</div>}
  {section==='roles'&&<div className="loc-log"><h3>八職業</h3><p>職業是世界失序時的回應方式，不是能力職業或人格分類；任何玩家都可使用。</p>{GAME_ROLES.map(([name,role,mode,group])=><p key={name}><b>{name}</b>｜{role}｜{mode}｜{group}</p>)}</div>}
  {section==='history'&&<div className="loc-log"><h3>版本與開發說明</h3>{GAME_HISTORY.map((x,i)=><p key={i}>{x}</p>)}</div>}
  </section>;
}

function freshGame(events,cards,count){
  const eventDeck=shuffle(events);
  return {mode:count===2?'2p':'multi',players:Array.from({length:count},(_,i)=>freshPlayer(cards,`Player ${NAMES[i]}`)),eventDeck,eventIndex:0,round:1,phase:(count===2?TWO_PLAYER_ROUNDS:MULTI_PLAYER_ROUNDS)[0],active:0,actions:0,winner:null,draw:false,logs:['新遊戲開始。'],result:'雙方先從 8 張起手牌各棄 3 張，保留 5 張。'};
}
const clampRound=(count,round)=>(count===2?TWO_PLAYER_ROUNDS:MULTI_PLAYER_ROUNDS)[round-1];

export default function GameView(){
  const[data,setData]=useState(null),[loadError,setLoadError]=useState(''),[state,setState]=useState(null),[playerCount,setPlayerCount]=useState(2),[homeView,setHomeView]=useState('play');
  useEffect(()=>{let live=true;fetchNeonDataBatch([LOC_DATA.RUNES,LOC_DATA.GAME_EVENTS],{concurrency:2}).then(([r,e])=>{if(live)setData({cards:createCards(r),events:createEvents(e)});}).catch(e=>live&&setLoadError(e.message));return()=>{live=false};},[]);
  const event=state?.eventDeck[state.eventIndex%state.eventDeck.length];
  const allOpened=state?.players.every(p=>!p.opening);
  const phaseLabel=state?.phase==='event'?'Event':state?.phase?.includes('battle')?'Battle':'Resonance';
  const status=useMemo(()=>loadError?'遊戲資料載入失敗。':!data?'載入符文與事件資料…':!state?'選擇人數後開始 Alpha。':state.winner!==null?`${state.players[state.winner].name} 勝出。`:state.draw?'R8 同分；多人後續判定尚未定案。':`R${state.round} · ${phaseLabel}`,[data,loadError,state,phaseLabel]);

  function start(){if(data)setState(freshGame(data.events,data.cards,playerCount));}
  function toggle(pi,id){setState(s=>{if(!s)return s;const players=s.players.map((p,i)=>{if(i!==pi)return p;const limit=p.opening?3:2;const selected=p.selected.includes(id)?p.selected.filter(x=>x!==id):(p.selected.length<limit?[...p.selected,id]:p.selected);return{...p,selected};});return{...s,players};});}
  function confirmOpening(pi){setState(s=>{try{return{...s,players:s.players.map((p,i)=>i===pi?finishOpening(p,p.selected):p)}}catch(e){return{...s,result:e.message}}});}

  function settleIfFinal(s){
    if(s.round!==8)return s;
    const max=Math.max(...s.players.map(p=>p.de)),leaders=s.players.map((p,i)=>p.de===max?i:null).filter(i=>i!==null);
    if(leaders.length===1)return{...s,winner:leaders[0]};
    return s.mode==='2p'?{...s,phase:'duel',active:0,actions:0,result:'R8 同分，進入 R9 Duel。'}:{...s,draw:true,result:'R8 同分；多人後續判定保留測試。'};
  }
  function nextRound(s){if(s.round===8)return settleIfFinal(s);const round=s.round+1;return{...s,round,phase:clampRound(s.players.length,round),active:0,actions:0,eventIndex:s.eventIndex+(clampRound(s.players.length,round)==='event'?1:0)};}

  function resolve2PEvent(){
    setState(s=>{if(!s||s.phase!=='event')return s;try{
      const outcomes=s.players.map(p=>{const cards=p.hand.filter(c=>p.selected.includes(c.id)),o=evaluateEvent(cards,event);let n=applyDe(p,o.delta);n={...n,hand:n.hand.filter(c=>!p.selected.includes(c.id)),discard:[...n.discard,...cards],selected:[]};n=draw(n,o.result==='fail'?HAND_RULE.failDraw:HAND_RULE.eventDraw);return{p:n,o};});
      const n={...s,players:outcomes.map(x=>x.p),logs:[`R${s.round} Event：${outcomes.map((x,i)=>`${NAMES[i]} ${resultText[x.o.result]}`).join('｜')}`,...s.logs],result:outcomes.map((x,i)=>`${NAMES[i]} ${resultText[x.o.result]}`).join('｜')};
      return nextRound(n);
    }catch(e){return{...s,result:e.message}}});
  }

  function resonance(kind){
    setState(s=>{if(!s||(!s.phase?.includes('resonance')&&s.phase!=='duel'))return s;const actor=s.active,target=kind==='self'?actor:1-actor,players=s.players.map((p,i)=>i===target?applyDe(p,kind==='self'?1:-2):p),actions=s.actions+1,n={...s,players,actions,active:1-actor,logs:[`${s.phase==='duel'?'R9 Duel':`R${s.round} Resonance`}：${NAMES[actor]} ${kind==='self'?'+1':'對手 −2'}`,...s.logs]};if(actions<2)return n;if(s.phase==='duel'){const[a,b]=players;if(a.de===b.de)return{...n,result:'Duel 仍同分；Duel 細則待測試修正。'};return{...n,winner:a.de>b.de?0:1};}return nextRound(n);});
  }

  function battle(target,strength=1){
    setState(s=>{if(!s||!s.phase?.includes('battle'))return s;const actor=s.active;if(target===actor)return s;const players=s.players.map((p,i)=>i===target?applyDe(p,-Math.max(1,Math.min(4,strength))):p),actions=s.actions+1,next=(actor+1)%s.players.length,n={...s,players,actions,active:next,logs:[`R${s.round} Battle：${NAMES[actor]} → ${NAMES[target]}（測試 strength 1）`,...s.logs]};return actions===s.players.length?nextRound(n):n;});
  }

  if(!state)return <section className="loc-view loc-game"><header className="loc-hero"><p className="loc-eyebrow">LunaRunes × Game · Alpha</p><h1>Semantic Playground</h1><p>Current Game 測試骨架：De 0–8；2P 為 EEE-R-EEE-R，多人為 E-B 交替。</p></header><div className="loc-actions"><button className={`loc-button ${homeView==='play'?'primary':''}`} onClick={()=>setHomeView('play')}>開始遊戲</button><button className={`loc-button ${homeView==='docs'?'primary':''}`} onClick={()=>setHomeView('docs')}>遊戲文件</button></div>{homeView==='docs'?<GameDocs data={data}/>:<><div className="loc-actions"><select value={playerCount} onChange={e=>setPlayerCount(Number(e.target.value))}><option value="2">2 Players</option><option value="3">3 Players</option><option value="4">4 Players</option></select><button className="loc-button primary" onClick={start} disabled={!data}>開始新遊戲</button></div><p className="loc-status">{loadError||status}</p></>}</section>;

  return <section className="loc-view loc-game"><header className="loc-hero"><p className="loc-eyebrow">LunaRunes × Game · Alpha</p><h1>Semantic Playground</h1><p>{state.mode==='2p'?'2P：EEE → R → EEE → R；R8 結算，同分進 Duel。':'3P/4P：E → B 交替至 R8；Battle 細則仍屬測試。'}</p></header><p className="loc-status">{status}｜{state.result}</p>
  {!allOpened&&<p className="loc-status">起手設定：每位玩家從 8 張棄 3 張，保留 5 張。</p>}
  <div className="loc-game-board">{state.players.map((p,pi)=><section className={`loc-player ${state.active===pi?'is-turn':''}`} key={p.name}><p className="loc-eyebrow">{p.name}</p><div className="loc-score">{p.de} <small>/ 8 De</small></div><p>手牌 {p.hand.length} · 牌庫 {p.deck.length} · 棄牌 {p.discard.length}</p><div className="loc-hand">{p.hand.map(c=><button key={c.id} className={`loc-rune ${p.selected.includes(c.id)?'selected':''}`} onClick={()=>toggle(pi,c.id)}><b>{c.name}</b><span>{c.group}</span><em>{c.aspect||'SYSTEM'}</em></button>)}</div>{p.opening&&<button className="loc-button primary" onClick={()=>confirmOpening(pi)} disabled={p.selected.length!==3}>棄 3 張</button>}</section>)}
  {allOpened&&state.phase==='event'&&<section className="loc-event"><p className="loc-eyebrow">{event?.id}</p><h2>{event?.name}</h2><p className="loc-event-req">{event?.req.join(' + ')}</p><p>{event?.desc}</p>{state.mode==='2p'?<button className="loc-button primary" onClick={resolve2PEvent} disabled={state.players.some(p=>p.selected.length!==2)}>雙方雙卡結算 Event</button>:<p className="loc-status">多人 Event 為共同解題；共同提交／計分細則尚未定案，暫不偽造規則。</p>}</section>}
  {allOpened&&(state.phase?.includes('resonance')||state.phase==='duel')&&<section className="loc-event"><h2>{state.phase==='duel'?'R9 Duel':'Resonance'}</h2><p>輪到 {state.players[state.active].name}</p><button className="loc-button primary" onClick={()=>resonance('self')}>自我共振 +1</button><button className="loc-button" onClick={()=>resonance('attack')}>破壞共振 −2</button></section>}
  {allOpened&&state.phase?.includes('battle')&&<section className="loc-event"><h2>Battle · Alpha Skeleton</h2><p>輪到 {state.players[state.active].name}。1–4 派別分數機制尚待接回；目前只提供 strength 1 測試按鈕。</p><div className="loc-actions">{state.players.map((p,i)=>i!==state.active&&<button className="loc-button" key={p.name} onClick={()=>battle(i,1)}>對 {p.name} 測試 −1</button>)}</div></section>}
  </div><section className="loc-card"><h2>對局紀錄</h2><div className="loc-log">{state.logs.map((x,i)=><p key={i}>{x}</p>)}</div></section></section>;
}
