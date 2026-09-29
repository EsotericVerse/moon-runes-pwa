'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  applyDe,draw,evaluateAlphaEvent,finishOpening,freshPlayer,loadGameData,shuffle
} from './game-data';

const NAMES=['A','B','C','D'];

function runeCardImage(card){
  const id=Number(card?.id??card?.rune_id??card?.rune_number);
  const number=String(Number.isFinite(id)?id:0).padStart(2,'0');
  const name=String(card?.name??card?.rune_name??'').replace(/之符文$/,'').trim();
  return name?'/assets/lunarunes/cards/'+number+'_'+name+'.png':'';
}

function groupVisual(groupAssets,groupName){
  return groupAssets.find(item=>item.group===groupName)||null;
}

function phaseMark(phase){
  if(phase==='event')return 'E';
  if(phase==='duel')return 'D';
  return 'R';
}

function signed(value){
  const number=Number(value||0);
  return number>0?'+'+number:String(number);
}

function DeMeter({value=0,max=8}){
  return <div className="game-de-meter" aria-label={'De '+value+' / '+max} style={{gridTemplateColumns:'repeat('+max+',1fr)'}}>
    {Array.from({length:max},(_,index)=><span key={index} className={index<value?'is-on':''}/>)}
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
    title={card.name+'｜'+card.group+(card.action?'｜'+card.action:'')}
  >
    <img src={runeCardImage(card)} alt={card.name+'符文卡'} loading="lazy"/>
    <span><b>{String(card.id).padStart(2,'0')} {card.name}</b><small>{card.group}</small></span>
  </Tag>;
}

function EventVisual({item,small=false}){
  if(!item)return null;
  return <figure className={'game-event-visual'+(small?' is-small':'')}>
    <img src={item.path} alt={(item.title||'Event')+'圖'} loading="lazy"/>
    <figcaption>{item.title}</figcaption>
  </figure>;
}

function RoundRail({round=1,rounds=[]}){
  const sequence=round===9?[...rounds,{round:9,phase:'duel',title:'R9'}]:rounds;
  return <div className="game-round-rail" aria-label="回合進度" style={{gridTemplateColumns:'repeat('+sequence.length+',minmax(64px,1fr))'}}>
    {sequence.map(item=>{
      const current=item.round===round;
      const done=item.round<round;
      return <div className={'game-round-node'+(current?' is-current':'')+(done?' is-done':'')} key={item.round}>
        <span>R{item.round}</span><b>{phaseMark(item.phase)}</b>
      </div>;
    })}
  </div>;
}

function GameDocs({data}){
  const [section,setSection]=useState('rules');
  const currentRules=data.rules.filter(row=>!['ROUND_PHASE','EVENT_RESULT'].includes(row.rule_code));
  return <section className="loc-card game-docs">
    <div className="game-doc-tabs">
      <button type="button" className={'loc-button '+(section==='rules'?'primary':'')} onClick={()=>setSection('rules')}>遊戲規則</button>
      <button type="button" className={'loc-button '+(section==='events'?'primary':'')} onClick={()=>setSection('events')}>Event32</button>
      <button type="button" className={'loc-button '+(section==='roles'?'primary':'')} onClick={()=>setSection('roles')}>八職</button>
      <button type="button" className={'loc-button '+(section==='actions'?'primary':'')} onClick={()=>setSection('actions')}>符文行動</button>
    </div>

    {section==='rules'&&<div className="game-doc-copy">
      <h2>Current 規則</h2>
      <div className="game-role-grid">
        {currentRules.map(rule=><article key={rule.game_key}><b>{rule.rule_title}</b><span>{rule.rule_text}</span><small>{rule.rule_code}</small></article>)}
      </div>
      <h3>四組簡稱</h3>
      <div className="game-role-grid">
        {data.macros.map(item=><article key={item.code}><b>{item.code}｜{item.title}</b><span>{item.description}</span><small>{item.groupA}＋{item.groupB}</small></article>)}
      </div>
      <h3>回合</h3>
      <div className="game-role-grid">
        {data.rounds.map(item=><article key={item.round}><b>R{item.round}｜{item.phase}</b><span>{item.text}</span></article>)}
      </div>
    </div>}

    {section==='events'&&<div className="game-doc-copy">
      <h2>Event32</h2>
      <div className="game-role-grid">
        {data.events.map(event=><article key={event.id}><b>{event.id}｜{event.name}</b><span>{event.group}｜{event.requirement}</span><small>{event.description}</small></article>)}
      </div>
      <h3>雙群組主視覺</h3>
      <div className="game-event-gallery">{data.eventVisuals.map(item=><EventVisual key={item.code} item={item}/>)}</div>
    </div>}

    {section==='roles'&&<div className="game-doc-copy">
      <h2>八職</h2>
      <div className="game-role-grid">
        {data.roles.map(role=><article key={role.id}><b>{role.group}｜{role.name}</b><span>{role.focus}｜{role.mode}｜{role.intervention}</span><small>{role.tagline}｜{role.tool}</small></article>)}
      </div>
    </div>}

    {section==='actions'&&<div className="game-doc-copy">
      <h2>66 符文遊戲行動</h2>
      <div className="game-role-grid">
        {data.runeActions.map(action=><article key={action.runeId}><b>{String(action.runeId).padStart(2,'0')}｜{action.name}</b><span>{action.text}</span><small>{action.group}{action.kind?'｜'+action.kind+(action.value!==null?' '+action.value:''):''}</small></article>)}
      </div>
    </div>}
  </section>;
}

function BoardPreview({data}){
  const max=data.config.deMax;
  const previewA=Math.min(4,max);
  const previewB=Math.min(3,max);
  return <section className="game-preview-board" aria-label="遊戲盤面預覽">
    <div className="game-preview-player">
      <p className="loc-eyebrow">PLAYER A</p>
      <strong>De {previewA} / {max}</strong>
      <DeMeter value={previewA} max={max}/>
      <div className="game-preview-hand">{data.cards.slice(0,5).map(card=><RuneCard key={card.id} card={card} compact/>)}</div>
    </div>
    <div className="game-preview-center">
      <p className="loc-eyebrow">EVENT FIELD</p>
      <EventVisual item={data.eventVisuals[0]}/>
      <p>Event32 + 雙卡回應</p>
    </div>
    <div className="game-preview-player">
      <p className="loc-eyebrow">PLAYER B</p>
      <strong>De {previewB} / {max}</strong>
      <DeMeter value={previewB} max={max}/>
      <div className="game-preview-hand">{data.cards.slice(8,13).map(card=><RuneCard key={card.id} card={card} compact/>)}</div>
    </div>
  </section>;
}

function freshGame(data,count){
  const eventDeck=shuffle(data.events);
  return {
    players:Array.from({length:count},(_,index)=>freshPlayer(data.cards,'Player '+NAMES[index],data.config)),
    eventDeck,
    eventIndex:0,
    round:1,
    phase:data.rounds[0]?.phase||'event',
    active:0,
    actions:0,
    winner:null,
    draw:false,
    logs:['新遊戲開始。'],
    result:'每位玩家先從 '+data.config.openingDraw+' 張起手牌各棄 '+data.config.openingDiscard+' 張，保留 '+data.config.handBase+' 張。'
  };
}

function phaseForRound(data,round){
  return data.rounds.find(item=>item.round===round)?.phase||null;
}

export default function GameView(){
  const {data,error,isLoading}=useQuery({
    queryKey:['lunarunes','game','current'],
    queryFn:loadGameData,
    staleTime:0,
    gcTime:0,
    refetchOnMount:'always'
  });

  const [state,setState]=useState(null);
  const [playerCount,setPlayerCount]=useState(2);
  const [homeView,setHomeView]=useState('play');

  const event=state?.eventDeck?.length?state.eventDeck[state.eventIndex%state.eventDeck.length]:null;
  const allOpened=state?.players.every(player=>!player.opening);
  const phaseLabel=state?.phase==='event'?'Event':state?.phase==='duel'?'Duel':'Resonance';

  const status=useMemo(()=>{
    if(error)return '遊戲資料載入失敗：'+error.message;
    if(isLoading)return '正在讀取 silver.runes、silver.game…';
    if(!data)return '遊戲資料尚未就緒。';
    if(!state)return data.cards.length+' 張可玩符文、'+data.events.length+' 張 Event 已就緒。';
    if(state.winner!==null)return state.players[state.winner].name+' 勝出。';
    if(state.draw)return 'R9 Duel 仍平分；後續判定待定。';
    return 'R'+state.round+' · '+phaseLabel;
  },[data,error,isLoading,state,phaseLabel]);

  if(isLoading)return <section className="loc-view loc-game game-shell"><p className="loc-status">{status}</p></section>;
  if(error||!data)return <section className="loc-view loc-game game-shell"><p className="loc-status">{status}</p></section>;

  const playerOptions=Array.from(
    {length:data.config.playerMax-data.config.playerMin+1},
    (_,index)=>data.config.playerMin+index
  );

  function start(){
    const count=Math.max(data.config.playerMin,Math.min(data.config.playerMax,playerCount));
    setState(freshGame(data,count));
  }

  function toggle(pi,id){
    setState(current=>{
      if(!current)return current;
      const players=current.players.map((player,index)=>{
        if(index!==pi)return player;
        const limit=player.opening?data.config.openingDiscard:data.config.eventResponseCards;
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
      try{
        return {
          ...current,
          players:current.players.map((player,index)=>index===pi?finishOpening(player,player.selected,data.config):player)
        };
      }catch(problem){
        return {...current,result:problem.message};
      }
    });
  }

  function settleIfFinal(current){
    if(current.round!==data.rounds.length)return current;
    const max=Math.max(...current.players.map(player=>player.de));
    const leaders=current.players.map((player,index)=>player.de===max?index:null).filter(index=>index!==null);
    if(leaders.length===1)return {...current,winner:leaders[0]};
    return {
      ...current,
      round:9,
      phase:'duel',
      duelists:leaders,
      active:leaders[0],
      actions:0,
      result:'R8 平分，進入 R9 Duel。'
    };
  }

  function nextRound(current){
    if(current.round===data.rounds.length)return settleIfFinal(current);
    const round=current.round+1;
    const phase=phaseForRound(data,round);
    return {
      ...current,
      round,
      phase,
      active:0,
      actions:0,
      eventIndex:current.eventIndex+(phase==='event'?1:0)
    };
  }

  function resolveEvent(){
    setState(current=>{
      if(!current||current.phase!=='event'||!event)return current;
      try{
        const outcomes=current.players.map(player=>{
          const chosen=player.hand.filter(card=>player.selected.includes(card.id));
          const outcome=evaluateAlphaEvent(chosen,event,data.resultByCoverage,data.config);
          let next=applyDe(player,outcome.delta,data.config);
          next={
            ...next,
            hand:next.hand.filter(card=>!player.selected.includes(card.id)),
            discard:[...next.discard,...chosen],
            selected:[]
          };
          next=draw(next,outcome.drawCount,data.config);
          return {player:next,outcome};
        });
        const line=outcomes.map((entry,index)=>
          NAMES[index]+' '+entry.outcome.label+' '+entry.outcome.coverageText+' · De '+signed(entry.outcome.delta)
        ).join('｜');
        return nextRound({
          ...current,
          players:outcomes.map(entry=>entry.player),
          logs:['R'+current.round+' Event：'+line,...current.logs],
          result:line
        });
      }catch(problem){
        return {...current,result:problem.message};
      }
    });
  }

  function resonance(kind,targetIndex=null){
    setState(current=>{
      if(!current||(!current.phase?.includes('resonance')&&current.phase!=='duel'))return current;
      const participants=current.phase==='duel'?(current.duelists||[]):current.players.map((_,index)=>index);
      const actor=current.active;
      const target=kind==='self'?actor:targetIndex;
      if(target===null||target===undefined||!participants.includes(actor)||!participants.includes(target)||(kind!=='self'&&target===actor))return current;

      const delta=kind==='self'?data.config.resonanceSelf:data.config.resonanceAttack;
      const players=current.players.map((player,index)=>index===target?applyDe(player,delta,data.config):player);
      const actions=current.actions+1;
      const actorPosition=participants.indexOf(actor);
      const nextActive=participants[(actorPosition+1)%participants.length];
      const actionText=kind==='self'?signed(delta):'→ '+NAMES[target]+' '+signed(delta);
      const next={
        ...current,
        players,
        actions,
        active:nextActive,
        logs:[(current.phase==='duel'?'R9 Duel':'R'+current.round+' Resonance')+'：'+NAMES[actor]+' '+actionText,...current.logs]
      };

      if(actions<participants.length)return next;
      if(current.phase==='duel'){
        const max=Math.max(...participants.map(index=>players[index].de));
        const leaders=participants.filter(index=>players[index].de===max);
        if(leaders.length===1)return {...next,winner:leaders[0]};
        return {...next,draw:true,result:'R9 Duel 仍平分；後續判定待定。'};
      }
      return nextRound(next);
    });
  }

  const authorAsset=data.authorAsset;
  const roundBadge=data.rounds.map(item=>phaseMark(item.phase)).join('-');

  if(!state)return <section className="loc-view loc-game game-shell">
    <header className="loc-hero game-hero">
      <div>
        <p className="loc-eyebrow">LunaRunes Game · Alpha</p>
        <h1>LunaRunes Game</h1>
        <p>符文、Event、角色、規則與 Game 素材皆由 Neon Current 資料載入。</p>
        <div className="game-hero-badges">
          <span>{data.cards.length} Rune Cards</span>
          <span>De {data.config.deMin}–{data.config.deMax}</span>
          <span>{roundBadge}</span>
        </div>
      </div>
      {authorAsset?<figure className="game-author-visual"><img src={authorAsset.path} alt={authorAsset.title||'LunaRunes 作者圖'} loading="eager"/></figure>:null}
    </header>

    <div className="game-round-wrap"><RoundRail round={1} rounds={data.rounds}/></div>

    <div className="loc-actions game-home-tabs">
      <button className={'loc-button '+(homeView==='play'?'primary':'')} onClick={()=>setHomeView('play')}>遊戲盤面</button>
      <button className={'loc-button '+(homeView==='docs'?'primary':'')} onClick={()=>setHomeView('docs')}>遊戲文件</button>
    </div>

    {homeView==='docs'?<GameDocs data={data}/>:<>
      <BoardPreview data={data}/>
      <section className="loc-card">
        <p className="loc-eyebrow">EVENT VISUALS</p>
        <h2>雙群組事件圖</h2>
        <div className="game-event-gallery">{data.eventVisuals.map(item=><EventVisual key={item.code} item={item}/>)}</div>
      </section>
      <section className="loc-card">
        <p className="loc-eyebrow">GROUPS</p>
        <h2>八分組</h2>
        <div className="game-group-gallery">
          {data.groupAssets.map(group=><figure key={group.code}><img src={group.path} alt={(group.title||group.group)+'代表圖'} loading="lazy"/><figcaption><b>{group.title||group.group}</b></figcaption></figure>)}
        </div>
      </section>
      <div className="loc-card game-start-panel">
        <label>玩家人數
          <select value={playerCount} onChange={event=>setPlayerCount(Number(event.target.value))}>
            {playerOptions.map(count=><option key={count} value={count}>{count} Players</option>)}
          </select>
        </label>
        <button className="loc-button primary" onClick={start}>開始新遊戲</button>
        <p className="loc-status">{status}</p>
        <p className="loc-note">Event32、66 符文行動、八職、規則與素材路徑皆讀取 silver.game。</p>
      </div>
    </>}
  </section>;

  const eventGroupVisual=event?groupVisual(data.groupAssets,event.group):null;

  return <section className="loc-view loc-game game-shell">
    <header className="loc-hero game-compact-hero">
      <div><p className="loc-eyebrow">LunaRunes Game · Alpha</p><h1>LunaRunes Game</h1><p>{status}｜{state.result}</p></div>
      <DeMeter value={Math.max(...state.players.map(player=>player.de))} max={data.config.deMax}/>
    </header>

    <div className="game-round-wrap"><RoundRail round={state.round} rounds={data.rounds}/></div>

    {!allOpened?<p className="loc-status">起手設定：每位玩家從 {data.config.openingDraw} 張棄 {data.config.openingDiscard} 張，保留 {data.config.handBase} 張。</p>:null}

    <div className={'game-live-board players-'+state.players.length}>
      {state.players.map((player,pi)=><section className={'loc-player game-player '+(state.active===pi?'is-turn':'')} key={player.name}>
        <div className="game-player-head">
          <div><p className="loc-eyebrow">{player.name}</p><strong>{player.de} / {data.config.deMax} De</strong></div>
          <DeMeter value={player.de} max={data.config.deMax}/>
        </div>
        <p className="game-player-meta">手牌 {player.hand.length} · 牌庫 {player.deck.length} · 棄牌 {player.discard.length}</p>
        <div className="game-hand">
          {player.hand.map(card=><RuneCard key={card.id} card={card} selected={player.selected.includes(card.id)} onClick={()=>toggle(pi,card.id)}/>)}
        </div>
        {player.opening?<button className="loc-button primary" onClick={()=>confirmOpening(pi)} disabled={player.selected.length!==data.config.openingDiscard}>棄 {data.config.openingDiscard} 張，保留 {data.config.handBase} 張</button>:null}
      </section>)}

      {allOpened&&state.phase==='event'?<section className="loc-event game-event-field">
        <p className="loc-eyebrow">R{state.round} · EVENT</p>
        {eventGroupVisual?<EventVisual item={eventGroupVisual}/>:null}
        {event?<><h2>{event.id}｜{event.name}</h2><p>{event.desc}</p><p className="game-player-meta">Alpha requirement: {event.requirement}</p><button className="loc-button primary" onClick={resolveEvent} disabled={state.players.some(player=>player.selected.length!==data.config.eventResponseCards)}>{data.config.eventResponseCards} 卡結算 Event</button></>:null}
      </section>:null}

      {allOpened&&(state.phase?.includes('resonance')||state.phase==='duel')?<section className="loc-event game-event-field game-resonance-field">
        <p className="loc-eyebrow">{state.phase==='duel'?'R9 DUEL':'R'+state.round+' · RESONANCE'}</p>
        <div className="game-resonance-orbit"><span/><i/><span/></div>
        <h2>{state.phase==='duel'?'Duel':'Resonance'}</h2>
        <p>輪到 {state.players[state.active].name}</p>
        <div className="loc-actions">
          <button className="loc-button primary" onClick={()=>resonance('self')}>自我共振 {signed(data.config.resonanceSelf)}</button>
          {(state.phase==='duel'?(state.duelists||[]):state.players.map((_,index)=>index)).filter(index=>index!==state.active).map(index=><button className="loc-button" key={index} onClick={()=>resonance('attack',index)}>對 {state.players[index].name} {signed(data.config.resonanceAttack)}</button>)}
        </div>
      </section>:null}
    </div>

    <section className="loc-card game-log-card">
      <p className="loc-eyebrow">MATCH LOG</p>
      <h2>對局紀錄</h2>
      <div className="game-log">{state.logs.map((line,index)=><p key={index}><span>◈</span>{line}</p>)}</div>
    </section>
  </section>;
}
