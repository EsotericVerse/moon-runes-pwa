'use client';
import {useMemo,useState} from 'react';
import {Client} from 'boardgame.io/react';
import {createLunaRunesGame} from './boardgame-rules';
import {loadGameData} from './game-data';
import {useQuery} from '@tanstack/react-query';
import './game-board.css';
import {ThemeProvider,createTheme,Paper,Button,Alert,Tabs,Tab,LinearProgress} from '@mui/material';
import {DndContext,useDraggable,useDroppable,PointerSensor,TouchSensor,useSensor,useSensors} from '@dnd-kit/core';
const gameTheme=createTheme({palette:{mode:'dark',primary:{main:'#e4bf7c'},background:{paper:'#1a2434'},text:{primary:'#f4f1e9'}},shape:{borderRadius:12}});
function RuneCard({card,selected,disabled,onClick,playerIndex}){
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:'rune-'+playerIndex+'-'+card.id,disabled,data:{playerIndex,cardId:card.id}});
  return <button ref={setNodeRef} type="button" {...attributes} {...listeners} className={'lrg-card'+(selected?' picked':'')} aria-pressed={selected} disabled={disabled} onClick={onClick} title={card.name+'｜'+card.group} style={{transform:transform?'translate3d('+transform.x+'px,'+transform.y+'px,0)':undefined,opacity:isDragging?.6:1,touchAction:'manipulation',zIndex:isDragging?10:undefined}}><img src={cardSrc(card)} alt={card.name} loading="lazy"/><span>{card.name}</span></button>;
}
function SelectionZone({count,limit}){const {setNodeRef,isOver}=useDroppable({id:'selected-zone'});return <Paper ref={setNodeRef} variant="outlined" sx={{p:1.5,mt:1,borderStyle:'dashed',borderColor:isOver?'primary.main':'divider',textAlign:'center'}}>{'已選 '+count+' / '+limit+' 張 · 點擊卡牌或拖曳至此選取'}</Paper>}


const cardSrc=card=>'/assets/lunarunes/cards/'+String(card.id).padStart(2,'0')+'_'+String(card.name).replace(/之符文$/,'').trim()+'.png';
const labelStage=s=>s==='opening'?'起手棄牌':s==='event'?'事件':s==='duel'?'決鬥':s==='finished'?'結算':'共鳴';
function Board({G,moves,rules,onRestart}){
  const [target,setTarget]=useState(null);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(TouchSensor,{activationConstraint:{delay:180,tolerance:8}}));
  const [tab,setTab]=useState('board');
  const active=G.players[G.active]||G.players[0];
  const event=G.eventDeck[G.eventIndex%G.eventDeck.length];
  const opening=G.stage==='opening',isEvent=G.stage==='event',isResonance=G.stage?.includes('resonance')||G.stage==='duel';
  const done=G.stage==='finished';
  const players=opening?[{p:active,i:G.active}]:G.players.map((p,i)=>({p,i}));
  return <ThemeProvider theme={gameTheme}><DndContext sensors={sensors} onDragEnd={({active:drag,over})=>{if(over?.id==='selected-zone'&&drag.data.current)moves.toggleCard(drag.data.current.playerIndex,drag.data.current.cardId);}}><main className="lrg">
    <header className="lrg-top">
      <div><small>LUNARUNES · TABLETOP</small><h1>月之符文</h1></div>
      <div className="lrg-top-actions"><span>第 {G.round} 回合 · {labelStage(G.stage)}</span><button onClick={onRestart}>新遊戲</button></div>
    </header>
    <nav className="lrg-steps" aria-label="回合進度">{rules.rounds.map(r=><span key={r.round} className={r.round===G.round?'current':r.round<G.round?'past':''}>{r.round}</span>)}{G.round===9?<span className="current">9</span>:null}</nav>
    <Alert severity="info" role="status" sx={{mb:1}}>{G.result}</Alert>
    <Tabs value={tab} onChange={(_,value)=>setTab(value)} aria-label="遊戲檢視"><Tab value="board" label="遊戲盤面"/><Tab value="history" label="對局紀錄"/></Tabs>
    {tab==='history'?<section className="lrg-history">{G.logs.map((line,i)=><p key={i}>{line}</p>)}</section>:
    <div className="lrg-layout">
      <section className="lrg-table">
        <Paper className="lrg-field">
          {isEvent?<><small>EVENT · {event.id}</small><h2>{event.name}</h2><p>{event.description}</p><p>條件：{event.requirement}</p><p>每位玩家選擇 {rules.config.eventResponseCards} 張回應卡</p><button className="lrg-primary" disabled={G.players.some(p=>p.selected.length!==rules.config.eventResponseCards)} onClick={()=>moves.resolveEvent()}>結算事件</button></>:null}
          {isResonance?<><small>RESONANCE</small><h2>{G.stage==='duel'?'最終決鬥':'共鳴階段'}</h2><p>輪到 {active.name} 行動</p><div className="lrg-actions"><button className="lrg-primary" onClick={()=>{moves.resonance('self');setTarget(null);}}>自我共振 {rules.config.resonanceSelf>0?'+':''}{rules.config.resonanceSelf}</button><select aria-label="選擇目標" value={target??''} onChange={e=>setTarget(e.target.value===''?null:Number(e.target.value))}><option value="">選擇其他玩家</option>{G.players.map((p,i)=>i!==G.active?<option value={i} key={i}>{p.name}</option>:null)}</select><button disabled={target===null||(G.stage==='duel'&&!G.duelists.includes(target))} onClick={()=>{moves.resonance('attack',target);setTarget(null);}}>干擾 {rules.config.resonanceAttack}</button>{G.stage!=='duel'?<button disabled={target===null} onClick={()=>moves.toggleCooperation(target)}>建立／解除合作</button>:null}</div></>:null}
          {opening?<><small>SETUP</small><h2>{active.name} 起手設定</h2><p>選擇 {rules.config.openingDiscard} 張棄牌，保留 {rules.config.handBase} 張。</p><button className="lrg-primary" disabled={active.selected.length!==rules.config.openingDiscard} onClick={()=>moves.confirmOpening(G.active)}>確認棄牌（{active.selected.length}/{rules.config.openingDiscard}）</button></>:null}
          {done?<><small>GAME OVER</small><h2>{G.winner!==null?G.players[G.winner].name+' 勝出':'平局'}</h2><button className="lrg-primary" onClick={onRestart}>再玩一次</button></>:null}
        </Paper>
        <div className="lrg-players">{players.map(({p,i})=><Paper component="section" key={i} className={'lrg-player'+(G.active===i?' active':'')}>
          <div className="lrg-player-title"><h3>{p.name}</h3><strong>De {p.de} / {rules.config.deMax}</strong></div>
          <LinearProgress variant="determinate" value={Math.max(0,Math.min(100,p.de/rules.config.deMax*100))} sx={{my:1,height:8,borderRadius:2}}/>
          <p className="lrg-counts">手牌 {p.hand.length} · 牌庫 {p.deck.length} · 棄牌 {p.discard.length} · 已選 {p.selected.length}</p>
          <div className="lrg-hand">{p.hand.map(card=><RuneCard key={card.id} card={card} playerIndex={i} selected={p.selected.includes(card.id)} disabled={done||isResonance||opening&&i!==G.active} onClick={()=>moves.toggleCard(i,card.id)}/>)}</div>{!done&&!isResonance&&((opening&&i===G.active)||isEvent)?<SelectionZone count={p.selected.length} limit={opening?rules.config.openingDiscard:rules.config.eventResponseCards}/>:null}
        </Paper>)}</div>
      </section>
      <Paper component="aside" className="lrg-side"><h2>對局資訊</h2><p>玩家 {G.players.length} 人</p><p>階段：{labelStage(G.stage)}</p><p>目前行動：{active.name}</p><details><summary>最新紀錄</summary>{G.logs.slice(0,8).map((line,i)=><p key={i}>{line}</p>)}</details></Paper>
    </div>}
  </main></DndContext></ThemeProvider>;
}
export default function GameBoard(){
  const {data,error,isLoading}=useQuery({queryKey:['lrunes','game','current'],queryFn:loadGameData,staleTime:60000});
  const [count,setCount]=useState(2),[match,setMatch]=useState(0);
  const Engine=useMemo(()=>data&&match?Client({game:createLunaRunesGame(data,count),board:props=><Board {...props} rules={data} onRestart={()=>setMatch(0)}/>,debug:false}):null,[data,count,match]);
  if(isLoading)return <main className="lrg"><p>載入遊戲資料…</p></main>;
  if(error||!data)return <main className="lrg"><p role="alert">遊戲資料載入失敗：{error?.message||'無資料'}</p></main>;
  if(Engine)return <Engine key={match}/>;
  return <ThemeProvider theme={gameTheme}><main className="lrg lrg-home"><header><small>LUNARUNES · TABLETOP</small><h1>月之符文</h1><p>66 枚符文 · {data.events.length} 張事件卡 · {data.rounds.length} 回合</p></header><div className="lrg-setup"><label>玩家人數 <select value={count} onChange={e=>setCount(Number(e.target.value))}>{Array.from({length:data.config.playerMax-data.config.playerMin+1},(_,i)=>i+data.config.playerMin).map(n=><option key={n} value={n}>{n} 人</option>)}</select></label><button className="lrg-primary" onClick={()=>setMatch(x=>x+1)}>開始遊戲</button></div><details><summary>回合規則</summary>{data.rounds.map(r=><p key={r.round}>第 {r.round} 回合：{r.text}</p>)}</details></main></ThemeProvider>;
}
