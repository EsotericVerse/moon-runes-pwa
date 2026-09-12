'use client';

import { useMemo, useState } from 'react';
import runes from '../../../data/json/core/runes.json';

const EVENTS=[{"id":"E01","name":"記憶","req":["SL","SL"],"desc":"過去重新浮現。"},{"id":"E02","name":"自我懷疑","req":["SL","OC"],"desc":"你開始質疑自己的定義。"},{"id":"E03","name":"真實表達","req":["SL","ML"],"desc":"必須說出真正的想法。"},{"id":"E04","name":"內在映照","req":["SL","NE"],"desc":"環境反映出你的狀態。"},{"id":"E05","name":"誤解","req":["SL","ML"],"desc":"訊息產生偏差。"},{"id":"E06","name":"合作","req":["ML","ML"],"desc":"單獨完成變得困難。"},{"id":"E07","name":"切斷","req":["ML","OC"],"desc":"某條連結必須結束。"},{"id":"E08","name":"重建關係","req":["ML","NE"],"desc":"關係進入新階段。"},{"id":"E09","name":"疾病","req":["SL","NE"],"desc":"系統需要修復。"},{"id":"E10","name":"康復","req":["SL","ML"],"desc":"開始回到正常軌道。"},{"id":"E11","name":"愛","req":["SL","OC"],"desc":"接受某種無法控制的情感。"},{"id":"E12","name":"韻律","req":["SL","NE","ML"],"desc":"找回自己的節奏。"},{"id":"E13","name":"發芽","req":["NE","NE"],"desc":"成長開始。"},{"id":"E14","name":"修剪","req":["NE","ML"],"desc":"去除不必要部分。"},{"id":"E15","name":"等待","req":["NE","OC"],"desc":"時機尚未成熟。"},{"id":"E16","name":"豐收","req":["NE","ML","OC"],"desc":"長期累積開始回收。"},{"id":"E17","name":"建立基礎","req":["ML","ML"],"desc":"穩定優先。"},{"id":"E18","name":"資源不足","req":["ML","NE"],"desc":"必須重新分配。"},{"id":"E19","name":"重建","req":["ML","OC"],"desc":"舊結構失效。"},{"id":"E20","name":"結晶","req":["ML","SL","OC"],"desc":"經驗開始固化。"},{"id":"E21","name":"火花","req":["NE","OC"],"desc":"新變化出現。"},{"id":"E22","name":"風向改變","req":["NE","ML"],"desc":"環境開始轉向。"},{"id":"E23","name":"洪流","req":["NE","NE","OC"],"desc":"變化超出預期。"},{"id":"E24","name":"平衡","req":["NE","SL","ML"],"desc":"多種力量需要協調。"},{"id":"E25","name":"選擇","req":["OC","ML"],"desc":"必須取捨。"},{"id":"E26","name":"時機","req":["OC","NE"],"desc":"不是不能做，而是何時做。"},{"id":"E27","name":"規則","req":["OC","ML","SL"],"desc":"建立新的邊界。"},{"id":"E28","name":"定錨","req":["OC","OC"],"desc":"做出不可逆決定。"},{"id":"E29","name":"偶然","req":["OC","NE"],"desc":"預期外事件發生。"},{"id":"E30","name":"幻象","req":["OC","SL"],"desc":"真假難辨。"},{"id":"E31","name":"空窗","req":["OC","ML"],"desc":"沒有明顯答案。"},{"id":"E32","name":"未知來信","req":["SL","ML","NE","OC"],"desc":"世界要求全面回應。"}];

const ASPECT={"靈魂":"SL","生命":"SL","連結":"ML","礦物":"ML","自然":"NE","元素":"NE","秩序":"OC","無序":"OC"};
const CARDS=runes.filter(r=>r['編號']>=1&&r['編號']<=64).map(r=>({id:r['編號'],name:r['符文名稱'],group:r['所屬分組'],aspect:ASPECT[r['所屬分組']]||'OC'}));
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const drawToFive=p=>{const next={...p,deck:[...p.deck],hand:[...p.hand]};while(next.hand.length<5&&next.deck.length)next.hand.push(next.deck.pop());return next;};
const coverage=(selected,req)=>{const pool=selected.map(c=>c.aspect),need=[...req];let hits=0;need.forEach(x=>{const i=pool.indexOf(x);if(i>=0){hits++;pool.splice(i,1);}});return {hits,total:need.length};};
const deltaFor=(hits,total)=>{const ratio=total?hits/total:0;if(ratio===1)return {label:'完美',delta:2};if(ratio>=.75)return {label:'成功',delta:1};if(ratio>=.5)return {label:'普通',delta:0};if(ratio>0)return {label:'補牌',delta:0};return {label:'失敗',delta:-2};};
const playerName=i=>i?'B':'A';

function freshPlayer(){return drawToFive({de:0,deck:shuffle(CARDS),hand:[],selected:[],acted:false});}
function freshGame(){const eventDeck=shuffle(EVENTS);return {players:[freshPlayer(),freshPlayer()],eventDeck,event:eventDeck[eventDeck.length-1],turn:0,resolved:[false,false],winner:null,logs:['新遊戲開始。'],result:'每位玩家每回合先選三張牌。'};}

export default function GameView(){
  const [state,setState]=useState(null);
  const active=state?.players[state.turn];
  const canNext=state?.resolved.every(Boolean)&&state?.winner===null;

  const status=useMemo(()=>{
    if(!state)return '按「開始新遊戲」建立牌局。';
    if(state.winner!==null)return `Player ${playerName(state.winner)} 已達 16 De，取得本 Alpha 對局勝利。`;
    return `目前：Player ${playerName(state.turn)}。請選三張符文回答事件。`;
  },[state]);

  function start(){setState(freshGame());}
  function toggleCard(pi,index){setState(prev=>{if(!prev||prev.winner!==null||prev.turn!==pi||prev.resolved[pi])return prev;const players=prev.players.map((p,i)=>i===pi?{...p,selected:p.selected.includes(index)?p.selected.filter(x=>x!==index):(p.selected.length<3?[...p.selected,index]:p.selected)}:p);return {...prev,players};});}
  function submit(){setState(prev=>{if(!prev)return prev;const pi=prev.turn,p=prev.players[pi];if(p.selected.length!==3||prev.resolved[pi])return prev;const chosen=p.selected.map(i=>p.hand[i]),cv=coverage(chosen,prev.event.req),d=deltaFor(cv.hits,cv.total);let nextPlayer={...p,de:Math.max(0,p.de+d.delta),hand:p.hand.filter((_,i)=>!p.selected.includes(i)),selected:[]};nextPlayer=drawToFive(nextPlayer);const players=prev.players.map((x,i)=>i===pi?nextPlayer:x);const resolved=prev.resolved.map((x,i)=>i===pi?true:x);const winner=players.findIndex(x=>x.de>=16);const names=chosen.map(c=>`${c.name}(${c.aspect})`).join('、');return {...prev,players,resolved,winner:winner>=0?winner:null,turn:winner>=0?pi:(pi?0:1),result:`Player ${playerName(pi)}：${d.label}，覆蓋 ${cv.hits}/${cv.total}，De ${d.delta>=0?'+':''}${d.delta}`,logs:[`Player ${playerName(pi)} 出牌：${names} → ${d.label}（${cv.hits}/${cv.total}）`,...prev.logs]};});}
  function interact(kind){setState(prev=>{if(!prev||prev.winner!==null)return prev;const pi=prev.turn,p=prev.players[pi];if(!prev.resolved[pi]||p.acted)return prev;const players=prev.players.map(x=>({...x}));if(kind==='resonate')players[pi].de+=1;else players[pi?0:1].de=Math.max(0,players[pi?0:1].de-2);players[pi].acted=true;const winner=players.findIndex(x=>x.de>=16);return {...prev,players,winner:winner>=0?winner:null,logs:[`Player ${playerName(pi)} ${kind==='resonate'?'自我共振：De +1':'破壞性共振：對手 De −2'}`,...prev.logs]};});}
  function nextEvent(){setState(prev=>{if(!prev||!prev.resolved.every(Boolean))return prev;let deck=[...prev.eventDeck];deck.pop();if(!deck.length)deck=shuffle(EVENTS);const event=deck[deck.length-1];const players=prev.players.map(p=>drawToFive({...p,selected:[],acted:false}));return {...prev,eventDeck:deck,event,players,resolved:[false,false],turn:0,result:'每位玩家每回合先選三張牌。',logs:[`下一事件：${event.id} ${event.name}`,...prev.logs]};});}

  return <section className="loc-view loc-game">
    <header className="loc-hero"><p className="loc-eyebrow">LOC2 · Semantic Playground</p><h1>脈絡沙盒遊戲</h1><p>兩位玩家各自使用 1–64 符文牌庫回答事件；先取得並守住 16 De 的玩家勝利。遊戲資料與狀態只在進入此 View 時載入。</p></header>
    <div className="loc-actions"><button className="loc-button primary" onClick={start}>開始新遊戲</button><button className="loc-button" onClick={nextEvent} disabled={!canNext}>下一事件</button></div>
    <p className="loc-status">{status}</p>
    <div className="loc-legend"><span><b>SL</b> 靈魂／生命</span><span><b>ML</b> 連結／礦物</span><span><b>NE</b> 自然／元素</span><span><b>OC</b> 秩序／無序</span></div>
    {state&&<>
      <div className="loc-game-board">
        {[0,1].map(pi=><section className={`loc-player ${state.turn===pi&&state.winner===null?'is-turn':''}`} key={pi}><p className="loc-eyebrow">PLAYER {playerName(pi)}</p><div className="loc-score">{state.players[pi].de} <small>De</small></div><p>牌庫 {state.players[pi].deck.length}</p><div className="loc-hand">{state.players[pi].hand.map((c,i)=><button key={`${c.id}-${i}`} className={`loc-rune ${state.players[pi].selected.includes(i)?'selected':''}`} disabled={state.turn!==pi||state.resolved[pi]||state.winner!==null} onClick={()=>toggleCard(pi,i)}><b>{c.name}</b><span>{c.group}</span><em>{c.aspect}</em></button>)}</div></section>)}
        <section className="loc-event"><p className="loc-eyebrow">{state.event.id}</p><h2>{state.event.name}</h2><p className="loc-event-req">{state.event.req.join(' + ')}</p><p>{state.event.desc}</p><div className="loc-actions"><button className="loc-button primary" onClick={submit} disabled={state.winner!==null||state.resolved[state.turn]||active.selected.length!==3}>送出三張符文</button><button className="loc-button" onClick={()=>interact('resonate')} disabled={state.winner!==null||!state.resolved[state.turn]||active.acted}>自我共振 +1</button><button className="loc-button" onClick={()=>interact('disrupt')} disabled={state.winner!==null||!state.resolved[state.turn]||active.acted}>破壞性共振 −2</button></div><p className="loc-status">{state.result}</p></section>
      </div>
      <section className="loc-card"><h2>對局紀錄</h2><div className="loc-log">{state.logs.map((line,i)=><p key={`${i}-${line}`}>{line}</p>)}</div></section>
    </>}
  </section>;
}
