'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  applyDe,draw,evaluateAlphaEvent,finishOpening,freshPlayer,GAME_ROUNDS,HAND_RULE,
  loadGameRuneData,shuffle
} from './game-data';
import {GAME_DOC_SECTIONS,GAME_HISTORY,GAME_ROLES} from './game-docs';
import {GAME_EVENTS} from './game-events';
import {GAME_AUTHOR_VISUAL,GAME_EVENT_VISUALS,GAME_GROUPS,groupVisual,runeCardImage} from './game-assets';

const NAMES=['A','B','C','D'];
const resultText={perfect:'完美 4/4 · De +2',pass:'過關 3/4 · De +1',fair:'尚可 2/4 · De +0',replenish:'補牌 1/4 · De +0',fail:'不行 0/4 · De −1'};

function DeMeter({value=0}){
  return <div className="game-de-meter" aria-label={'De '+value+' / 8'}>
    {Array.from({length:8},(_,index)=><span key={index} className={index<value?'is-on':''}/>)}
  </div>;
}

function RuneCard({card,selected=false,onClick=null,compact=false}){
  if(!card)return null;
  const Tag=onClick?'button':'div';
  return <Tag
    type={onClick?'button':undefined}
    className={'game-rune-card'+(selected?' is-selected':'')+(compact?' is-compact':'')}
    onClick={onClick||undefined}
    aria-pressed={onClick?selected:undefined}
    title={card.name+'｜'+card.group}
  >
    <img src={runeCardImage(card)} alt={card.name+'符文卡'} loading="lazy"/>
    <span><b>{String(card.id).padStart(2,'0')} {card.name}</b><small>{card.group}</small></span>
  </Tag>;
}

function EventVisual({item,small=false}){
  return <figure className={'game-event-visual'+(small?' is-small':'')}>
    <img src={item.image} alt={item.title+'雙群組事件圖'} loading="lazy"/>
    <figcaption>{item.title}</figcaption>
  </figure>;
}

function RoundRail({round=1}){
  const sequence=round===9?[...GAME_ROUNDS,'duel']:GAME_ROUNDS;
  return <div className="game-round-rail" aria-label="回合進度">
    {sequence.map((phase,index)=>{
      const current=index+1===round;
      const done=index+1<round;
      const label=phase==='event'?'E':phase==='duel'?'D':'R';
      return <div className={'game-round-node'+(current?' is-current':'')+(done?' is-done':'')} key={index}>
        <span>R{index+1}</span><b>{label}</b>
      </div>;
    })}
  </div>;
}

function GameDocs(){
  const [section,setSection]=useState('rules');
  return <section className="loc-card game-docs">
    <div className="game-doc-tabs">
      {GAME_DOC_SECTIONS.map(([id,label])=><button key={id} type="button" className={'loc-button '+(section===id?'primary':'')} onClick={()=>setSection(id)}>{label}</button>)}
    </div>
    {section==='rules'&&<div className="game-doc-copy">
      <h2>Current Alpha 基本規則</h2>
      <p><b>目標：</b>以 Event、Resonance／Battle 改變 De。De 範圍 0–8；到達 8 不會立即勝利。</p>
      <p><b>2P：</b>R1–R3 Event → R4 Resonance → R5–R7 Event → R8 Resonance；R8 完成才比較 De，同分才進 Duel。</p>
      <p><b>Event：</b>每次固定使用兩張 Rune 回應。四張雙群組圖目前只作既有視覺資產，不把 Event 限制成四類。</p>
      <p><b>資料：</b>遊戲符文只讀 silver.runes 與 silver.runes_etc；01–66 進可玩牌庫，0 德不進抽牌。</p>
    </div>}
    {section==='events'&&<div className="game-doc-copy">
      <h2>Event32</h2>
      <p>32 張 Alpha 事件文字已恢復。需求簡稱保留作 Alpha 相容標記；Current Event 主題仍以八分組與後續雙職／雙組設計為準。</p>
      <div className="game-role-grid">{GAME_EVENTS.map(event=><article key={event.id}><b>{event.id}｜{event.name}</b><span>{event.group}｜{event.requirement}</span><small>{event.description}</small></article>)}</div>
      <h3>既有雙群組主視覺</h3>
      <div className="game-event-gallery">{GAME_EVENT_VISUALS.map(item=><EventVisual key={item.id} item={item}/>)}</div>
    </div>}
    {section==='roles'&&<div className="game-doc-copy">
      <h2>八職｜可再議</h2>
      <p>保留早期八分組對應文字，作為 Event 主題素材；職稱、模式與細節仍可調整。</p>
      <div className="game-role-grid">{GAME_ROLES.map(role=><article key={role.group}><b>{role.group}｜{role.name}</b><span>{role.focus}｜{role.mode}｜{role.intervention}</span><small>{role.tagline}｜{role.tool}</small></article>)}</div>
    </div>}
    {section==='history'&&<div className="game-doc-copy">
      <h2>版本與歷史</h2>
      {GAME_HISTORY.map((line,index)=><p key={index}>{line}</p>)}
    </div>}
  </section>;
}

function BoardPreview({cards}){
  const previewCards=cards.slice(0,5);
  return <section className="game-preview-board" aria-label="遊戲盤面預覽">
    <div className="game-preview-player">
      <p className="loc-eyebrow">PLAYER A</p>
      <strong>De 4 / 8</strong>
      <DeMeter value={4}/>
      <div className="game-preview-hand">{previewCards.map(card=><RuneCard key={card.id} card={card} compact/>)}</div>
    </div>
    <div className="game-preview-center">
      <p className="loc-eyebrow">EVENT FIELD</p>
      <EventVisual item={GAME_EVENT_VISUALS[0]}/>
      <p>雙群組 Event 主視覺 + 雙卡回應</p>
    </div>
    <div className="game-preview-player">
      <p className="loc-eyebrow">PLAYER B</p>
      <strong>De 3 / 8</strong>
      <DeMeter value={3}/>
      <div className="game-preview-hand">{cards.slice(8,13).map(card=><RuneCard key={card.id} card={card} compact/>)}</div>
    </div>
  </section>;
}

function freshGame(events,cards,count){
  const eventDeck=shuffle(events);
  return {
    mode:count===2?'2p':'multi',
    players:Array.from({length:count},(_,index)=>freshPlayer(cards,'Player '+NAMES[index])),
    eventDeck,eventIndex:0,round:1,
    phase:GAME_ROUNDS[0],
    active:0,actions:0,winner:null,draw:false,
    logs:['新遊戲開始。'],
    result:'每位玩家先從 8 張起手牌各棄 3 張，保留 5 張。'
  };
}

function phaseForRound(round){
  return GAME_ROUNDS[round-1];
}

export default function GameView(){
  const {data,error,isLoading}=useQuery({
    queryKey:['lunarunes','game','runes'],
    queryFn:loadGameRuneData,
    staleTime:0,
    gcTime:0,
    refetchOnMount:'always'
  });
  const cards=data?.cards||[];
  const [state,setState]=useState(null);
  const [playerCount,setPlayerCount]=useState(2);
  const [homeView,setHomeView]=useState('play');
  const events=GAME_EVENTS;
  const event=state?.eventDeck?.length?state.eventDeck[state.eventIndex%state.eventDeck.length]:null;
  const allOpened=state?.players.every(player=>!player.opening);
  const phaseLabel=state?.phase==='event'?'Event':state?.phase?.includes('battle')?'Battle':'Resonance';

  const status=useMemo(()=>{
    if(error)return '遊戲符文資料載入失敗：'+error.message;
    if(isLoading)return '正在讀取 silver.runes 與 silver.runes_etc…';
    if(!state)return '66 張可玩符文與 Event32 已就緒。';
    if(state.winner!==null)return state.players[state.winner].name+' 勝出。';
    if(state.draw)return 'R8 同分；多人後續判定尚未定案。';
    return 'R'+state.round+' · '+phaseLabel;
  },[error,isLoading,state,phaseLabel]);

  function start(){
    if(cards.length===66&&events.length)setState(freshGame(events,cards,playerCount));
  }

  function toggle(pi,id){
    setState(current=>{
      if(!current)return current;
      const players=current.players.map((player,index)=>{
        if(index!==pi)return player;
        const limit=player.opening?3:2;
        const selected=player.selected.includes(id)
          ?player.selected.filter(value=>value!==id)
          :(player.selected.length<limit?[...player.selected,id]:player.selected);
        return {...player,selected};
      });
      return {...current,players};
    });
  }

  function confirmOpening(pi){
    setState(current=>{
      try{return {...current,players:current.players.map((player,index)=>index===pi?finishOpening(player,player.selected):player)}}
      catch(problem){return {...current,result:problem.message}}
    });
  }

  function settleIfFinal(current){
    if(current.round!==8)return current;
    const max=Math.max(...current.players.map(player=>player.de));
    const leaders=current.players.map((player,index)=>player.de===max?index:null).filter(index=>index!==null);
    if(leaders.length===1)return {...current,winner:leaders[0]};
    return current.mode==='2p'
      ?{...current,round:9,phase:'duel',active:0,actions:0,result:'R8 同分，進入 R9 Duel。'}
      :{...current,round:9,phase:'duel',active:0,actions:0,result:'R8 平分，進入 R9 Duel；多人 Duel 細節仍待測試。'};
  }

  function nextRound(current){
    if(current.round===8)return settleIfFinal(current);
    const round=current.round+1;
    const phase=phaseForRound(round);
    return {...current,round,phase,active:0,actions:0,eventIndex:current.eventIndex+(phase==='event'?1:0)};
  }

  function resolve2PEvent(){
    setState(current=>{
      if(!current||current.phase!=='event'||!event)return current;
      try{
        const outcomes=current.players.map(player=>{
          const chosen=player.hand.filter(card=>player.selected.includes(card.id));
          const outcome=evaluateAlphaEvent(chosen,event);
          let next=applyDe(player,outcome.delta);
          next={...next,hand:next.hand.filter(card=>!player.selected.includes(card.id)),discard:[...next.discard,...chosen],selected:[]};
          next=draw(next,outcome.result==='fail'?HAND_RULE.failDraw:HAND_RULE.eventDraw);
          return {player:next,outcome};
        });
        const line=outcomes.map((entry,index)=>NAMES[index]+' '+resultText[entry.outcome.result]).join('｜');
        return nextRound({...current,players:outcomes.map(entry=>entry.player),logs:['R'+current.round+' Event：'+line,...current.logs],result:line});
      }catch(problem){return {...current,result:problem.message}}
    });
  }

  function resonance(kind){
    setState(current=>{
      if(!current||(!current.phase?.includes('resonance')&&current.phase!=='duel'))return current;
      const actor=current.active;
      const target=kind==='self'?actor:1-actor;
      const players=current.players.map((player,index)=>index===target?applyDe(player,kind==='self'?1:-2):player);
      const actions=current.actions+1;
      const next={...current,players,actions,active:1-actor,logs:[(current.phase==='duel'?'R9 Duel':'R'+current.round+' Resonance')+'：'+NAMES[actor]+' '+(kind==='self'?'+1':'對手 −2'),...current.logs]};
      if(actions<2)return next;
      if(current.phase==='duel'){
        const [a,b]=players;
        if(a.de===b.de)return {...next,result:'Duel 仍同分；Duel 細則待測試修正。'};
        return {...next,winner:a.de>b.de?0:1};
      }
      return nextRound(next);
    });
  }

  if(!state)return <section className="loc-view loc-game game-shell">
    <header className="loc-hero game-hero">
      <div>
        <p className="loc-eyebrow">LunaRunes Game · Alpha</p>
        <h1>LunaRunes Game</h1>
        <p>把既有符文卡、群組圖與 Event 圖直接放回盤面。規則仍是 Alpha；圖形介面先完整落地。</p>
        <div className="game-hero-badges"><span>66 Rune Cards</span><span>De 0–8</span><span>EEE-R-EEE-R</span></div>
      </div>
      <figure className="game-author-visual"><img src={GAME_AUTHOR_VISUAL} alt="LunaRunes 作者風格圖" loading="eager"/></figure>
    </header>

    <div className="game-round-wrap"><RoundRail round={1}/></div>

    <div className="loc-actions game-home-tabs">
      <button className={'loc-button '+(homeView==='play'?'primary':'')} onClick={()=>setHomeView('play')}>遊戲盤面</button>
      <button className={'loc-button '+(homeView==='docs'?'primary':'')} onClick={()=>setHomeView('docs')}>遊戲文件</button>
    </div>

    {homeView==='docs'?<GameDocs/>:<>
      {cards.length?<BoardPreview cards={cards}/>:null}
      <section className="loc-card">
        <p className="loc-eyebrow">EVENT VISUALS</p>
        <h2>現有雙群組事件圖</h2>
        <div className="game-event-gallery">{GAME_EVENT_VISUALS.map(item=><EventVisual key={item.id} item={item}/>)}</div>
      </section>
      <section className="loc-card">
        <p className="loc-eyebrow">GROUPS</p>
        <h2>八分組</h2>
        <div className="game-group-gallery">{GAME_GROUPS.map(group=><figure key={group.name}><img src={group.image} alt={group.name+'組代表圖'} loading="lazy"/><figcaption><b>{group.name}</b><span>{group.english}</span></figcaption></figure>)}</div>
      </section>
      <div className="loc-card game-start-panel">
        <label>玩家人數
          <select value={playerCount} onChange={event=>setPlayerCount(Number(event.target.value))}>
            <option value="2">2 Players</option><option value="3">3 Players</option><option value="4">4 Players</option>
          </select>
        </label>
        <button className="loc-button primary" onClick={start} disabled={!cards.length||!events.length}>開始新遊戲</button>
        <p className="loc-status">{status}</p>
        <p className="loc-note">Event32 已恢復；四張既有雙群組圖作視覺資產，不限制事件牌庫只有四類。</p>
      </div>
    </>}
  </section>;

  const activeEventVisual=GAME_EVENT_VISUALS[state.eventIndex%GAME_EVENT_VISUALS.length];
  const eventGroupVisual=event?groupVisual(event.group):null;

  return <section className="loc-view loc-game game-shell">
    <header className="loc-hero game-compact-hero">
      <div><p className="loc-eyebrow">LunaRunes Game · Alpha</p><h1>LunaRunes Game</h1><p>{status}｜{state.result}</p></div>
      <DeMeter value={Math.max(...state.players.map(player=>player.de))}/>
    </header>
    <div className="game-round-wrap"><RoundRail round={state.round}/></div>

    {!allOpened?<p className="loc-status">起手設定：每位玩家從 8 張棄 3 張，保留 5 張。</p>:null}

    <div className={'game-live-board players-'+state.players.length}>
      {state.players.map((player,pi)=><section className={'loc-player game-player '+(state.active===pi?'is-turn':'')} key={player.name}>
        <div className="game-player-head">
          <div><p className="loc-eyebrow">{player.name}</p><strong>{player.de} / 8 De</strong></div>
          <DeMeter value={player.de}/>
        </div>
        <p className="game-player-meta">手牌 {player.hand.length} · 牌庫 {player.deck.length} · 棄牌 {player.discard.length}</p>
        <div className="game-hand">
          {player.hand.map(card=><RuneCard key={card.id} card={card} selected={player.selected.includes(card.id)} onClick={()=>toggle(pi,card.id)}/>)}
        </div>
        {player.opening?<button className="loc-button primary" onClick={()=>confirmOpening(pi)} disabled={player.selected.length!==3}>棄 3 張，保留 5 張</button>:null}
      </section>)}

      {allOpened&&state.phase==='event'?<section className="loc-event game-event-field">
        <p className="loc-eyebrow">R{state.round} · EVENT</p>
        {eventGroupVisual?<figure className="game-event-visual"><img src={eventGroupVisual.image} alt={event.group+'組代表圖'} loading="lazy"/><figcaption>{event.group}</figcaption></figure>:<EventVisual item={activeEventVisual}/>}
        {event?<><h2>{event.id}｜{event.name}</h2><p>{event.desc}</p><p className="game-player-meta">Alpha requirement: {event.requirement}</p><button className="loc-button primary" onClick={resolve2PEvent} disabled={state.mode!=='2p'||state.players.some(player=>player.selected.length!==2)}>雙卡結算 Event</button></>:null}
      </section>:null}

      {allOpened&&(state.phase?.includes('resonance')||state.phase==='duel')?<section className="loc-event game-event-field game-resonance-field">
        <p className="loc-eyebrow">{state.phase==='duel'?'R9 DUEL':'R'+state.round+' · RESONANCE'}</p>
        <div className="game-resonance-orbit"><span/><i/><span/></div>
        <h2>{state.phase==='duel'?'Duel':'Resonance'}</h2>
        <p>輪到 {state.players[state.active].name}</p>
        <div className="loc-actions"><button className="loc-button primary" onClick={()=>resonance('self')}>自我共振 +1</button><button className="loc-button" onClick={()=>resonance('attack')}>破壞共振 −2</button></div>
      </section>:null}

      {allOpened&&state.phase?.includes('battle')?<section className="loc-event game-event-field">
        <p className="loc-eyebrow">R{state.round} · BATTLE</p>
        <h2>Battle · Alpha</h2>
        <p>輪到 {state.players[state.active].name}。1–4 派別分數機制仍待接回。</p>
        <div className="loc-actions">{state.players.map((player,index)=>index!==state.active?<button className="loc-button" key={player.name} onClick={()=>battle(index,1)}>對 {player.name} 測試 −1</button>:null)}</div>
      </section>:null}
    </div>

    <section className="loc-card game-log-card">
      <p className="loc-eyebrow">MATCH LOG</p>
      <h2>對局紀錄</h2>
      <div className="game-log">{state.logs.map((line,index)=><p key={index}><span>◈</span>{line}</p>)}</div>
    </section>
  </section>;
}
