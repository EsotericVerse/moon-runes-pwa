'use client';

import { useMemo, useState } from 'react';
import './duel.css';

const RUNES = [
  ['靈','靈魂'],['魂','靈魂'],['彩','靈魂'],['憶','靈魂'],['界','靈魂'],['域','靈魂'],['鏡','靈魂'],['核','靈魂'],
  ['向','連結'],['斷','連結'],['封','連結'],['鍊','連結'],['啟','連結'],['分','連結'],['悟','連結'],['誤','連結'],
  ['生','生命'],['老','生命'],['病','生命'],['死','生命'],['心','生命'],['愛','生命'],['語','生命'],['韻','生命'],
  ['樹','自然'],['花','自然'],['葉','自然'],['草','自然'],['根','自然'],['種','自然'],['實','自然'],['枝','自然'],
  ['金','礦物'],['玉','礦物'],['晶','礦物'],['地','礦物'],['石','礦物'],['鑽','礦物'],['礦','礦物'],['塵','礦物'],
  ['光','元素'],['暗','元素'],['水','元素'],['火','元素'],['風','元素'],['土','元素'],['雷','元素'],['氣','元素'],
  ['日','秩序'],['月','秩序'],['星','秩序'],['辰','秩序'],['明','秩序'],['時','秩序'],['空','秩序'],['因','秩序'],
  ['福','無序'],['禍','無序'],['無','無序'],['夢','無序'],['幻','無序'],['緣','無序'],['虛','無序'],['果','無序'],
  ['玄','特殊'],['命','特殊'],
].map(([name,group],i)=>({id:i+1,name,group}));

const EVENTS = [
 ['E01','記憶','過去重新浮現。'],['E02','自我懷疑','你開始質疑自己的定義。'],['E03','真實表達','必須說出真正的想法。'],['E04','內在映照','環境反映出你的狀態。'],
 ['E05','誤解','訊息產生偏差。'],['E06','合作','單獨完成變得困難。'],['E07','切斷','某條連結必須結束。'],['E08','重建關係','關係進入新階段。'],
 ['E09','疾病','系統需要修復。'],['E10','康復','開始回到正常軌道。'],['E11','愛','接受某種無法控制的情感。'],['E12','韻律','找回自己的節奏。'],
 ['E13','發芽','成長開始。'],['E14','修剪','去除不必要部分。'],['E15','等待','時機尚未成熟。'],['E16','豐收','長期累積開始回收。'],
 ['E17','建立基礎','穩定優先。'],['E18','資源不足','必須重新分配。'],['E19','重建','舊結構失效。'],['E20','結晶','經驗開始固化。'],
 ['E21','火花','新變化出現。'],['E22','風向改變','環境開始轉向。'],['E23','洪流','變化超出預期。'],['E24','平衡','多種力量需要協調。'],
 ['E25','選擇','必須取捨。'],['E26','時機','不是不能做，而是何時做。'],['E27','規則','建立新的邊界。'],['E28','定錨','做出不可逆決定。'],
 ['E29','偶然','預期外事件發生。'],['E30','幻象','真假難辨。'],['E31','空窗','沒有明顯答案。'],['E32','未知來信','世界要求全面回應。'],
].map(([id,title,description])=>({id,title,description}));

const PROFESSIONS=['魂者','仲裁','療癒','培育','盾衛','元素','策士','混沌'];
const missionRounds=new Set([1,2,3,5,6,7]);
const rand=(n)=>Math.floor(Math.random()*n);
const drawPair=()=>{const a=RUNES[rand(RUNES.length)];let b=RUNES[rand(RUNES.length)];while(b.id===a.id)b=RUNES[rand(RUNES.length)];return[a,b];};

function resolvePair(pair,context,profession,enemy=false){
 const same=pair[0].group===pair[1].group;
 const special=pair.some(r=>r.group==='特殊');
 let power=2+(same?1:0)+(special?1:0);
 const notes=[`${pair[0].name} ↔ ${pair[1].name}：以平等雙符文關係回應「${context}」。`];
 if(same) notes.push('同群組共振：+1');
 if(special) notes.push('特殊組介入：+1');
 if(profession==='仲裁') {power+=1;notes.push('仲裁：關係判定 +1');}
 if(profession==='策士'&&!enemy){power+=1;notes.push('策士：主動配置 +1');}
 return {power,notes};
}

export default function Duel2FightClient(){
 const [started,setStarted]=useState(false); const [round,setRound]=useState(1); const [de,setDe]=useState(8); const [enemyDe,setEnemyDe]=useState(8);
 const [mainJob,setMainJob]=useState(PROFESSIONS[0]); const [subJob,setSubJob]=useState(PROFESSIONS[1]); const [pair,setPair]=useState(drawPair()); const [enemyPair,setEnemyPair]=useState(drawPair());
 const [event,setEvent]=useState(EVENTS[rand(EVENTS.length)]); const [log,setLog]=useState([]); const isMission=missionRounds.has(round); const finished=round>8||de<=0||enemyDe<=0;
 const title=useMemo(()=>isMission?`Round ${round} · Mission`:`Round ${round} · ${round===8?'Final Duel':'Duel'}`,[round,isMission]);
 function nextCards(){setPair(drawPair());setEnemyPair(drawPair());setEvent(EVENTS[rand(EVENTS.length)]);}
 function resolve(){
  const ctx=isMission?event.title:'雙方對同一脈絡的處理權'; const mine=resolvePair(pair,ctx,mainJob); const foe=resolvePair(enemyPair,ctx,PROFESSIONS[rand(PROFESSIONS.length)],true);
  let myDelta=0,foeDelta=0,summary='';
  if(isMission){const gain=Math.max(1,mine.power-1);myDelta=gain;summary=`任務回應成立，De +${gain}`;}
  else if(mine.power>foe.power){foeDelta=-(mine.power-foe.power+1);summary=`Duel 優勢：對手 De ${foeDelta}`;}
  else if(mine.power<foe.power){myDelta=-(foe.power-mine.power+1);summary=`Duel 受制：你的 De ${myDelta}`;}
  else {summary='Duel 平衡：雙方關係暫時抵銷。';}
  setDe(v=>Math.max(0,v+myDelta));setEnemyDe(v=>Math.max(0,v+foeDelta));
  setLog(v=>[{round,kind:isMission?'Mission':'Duel',context:ctx,pair:`${pair[0].name} ↔ ${pair[1].name}`,enemy:`${enemyPair[0].name} ↔ ${enemyPair[1].name}`,summary,trace:mine.notes.join(' / ')},...v]);
  setRound(r=>r+1);nextCards();
 }
 function reset(){setRound(1);setDe(8);setEnemyDe(8);setLog([]);nextCards();setStarted(true);}
 if(!started)return <main className="duel-shell"><section className="hero"><p className="eyebrow">LunaRunes · 2-Card Grammar</p><h1>2-Fight Duel</h1><p>Alpha Playable。雙符文不是攻擊卡：先形成 <strong>A ↔ B</strong>，再由 Context、Group Interaction 與 Profession 轉成遊戲效果。</p><div className="jobs"><label>主職<select value={mainJob} onChange={e=>setMainJob(e.target.value)}>{PROFESSIONS.map(x=><option key={x}>{x}</option>)}</select></label><label>副職<select value={subJob} onChange={e=>setSubJob(e.target.value)}>{PROFESSIONS.filter(x=>x!==mainJob).map(x=><option key={x}>{x}</option>)}</select></label></div><button onClick={reset}>開始 8 回合測試</button><p className="note">Baseline：R1–3 Mission → R4 Duel → R5–7 Mission → R8 Final Duel。副職先保留為狀態，能力借用待真人測試後細化。</p></section></main>;
 return <main className="duel-shell"><header className="score"><div><small>YOU · {mainJob} / {subJob}</small><strong>De {de}</strong></div><div className="round">{finished?'RESULT':title}</div><div><small>OPPONENT</small><strong>De {enemyDe}</strong></div></header>{finished?<section className="panel result"><h2>{de>enemyDe?'本次測試：你取得較高 De':de<enemyDe?'本次測試：對手取得較高 De':'本次測試：平衡'}</h2><p>這是 Alpha 規則結果，不代表平衡已驗證。請以真人 playtest 記錄作為後續調整依據。</p><button onClick={reset}>再測一局</button></section>:<><section className="panel event"><span>{isMission?event.id:'PVP'}</span><h2>{isMission?event.title:title}</h2><p>{isMission?event.description:'雙方各以一組 A ↔ B 回應同一脈絡，經規則層轉成 Duel Effect。'}</p></section><section className="arena"><Pair label="你的 Pair" pair={pair}/><div className="versus">↔</div><Pair label={isMission?'Context Reference':'對手 Pair'} pair={isMission?null:enemyPair}/></section><section className="actions"><button className="secondary" onClick={()=>setPair(drawPair())}>重抽 Pair</button><button onClick={resolve}>解析本回合</button></section></>}{log.length>0&&<section className="panel trace"><h2>Playtest Trace</h2>{log.map((x,i)=><details key={i}><summary>R{x.round} {x.kind} · {x.pair} · {x.summary}</summary><p>Context：{x.context}</p>{x.kind==='Duel'&&<p>Opponent：{x.enemy}</p>}<p>{x.trace}</p></details>)}</section>}</main>;
}
function Pair({label,pair}){return <div className="pair"><small>{label}</small>{pair?<div className="cards">{pair.map(r=><article className="rune" key={r.id}><span>{String(r.id).padStart(2,'0')}</span><b>{r.name}</b><em>{r.group}</em></article>)}</div>:<div className="context-mark">CONTEXT</div>}</div>}
