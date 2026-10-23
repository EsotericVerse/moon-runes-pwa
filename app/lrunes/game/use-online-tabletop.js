'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {produce} from 'immer';
import {createSupabaseAdapter} from '../../loc/providers/supabase.mjs';
import {createLunaRunesGame} from './boardgame-rules.js';

const topic=code=>'lrunes:tabletop:'+code;
const validState=G=>Boolean(G&&typeof G==='object'&&
  Array.isArray(G.players)&&G.players.length>=2&&G.players.length<=4&&
  G.players.every(p=>Array.isArray(p.hand)&&Array.isArray(p.deck)&&Array.isArray(p.discard)&&Array.isArray(p.selected))&&
  Array.isArray(G.eventDeck)&&G.eventDeck.length>0&&
  Array.isArray(G.history)&&Array.isArray(G.logs)&&
  Number.isInteger(G.round)&&Number.isInteger(G.active)&&
  (['opening','event','resonance','duel','finished'].includes(G.stage)||
    (typeof G.stage==='string'&&G.stage.includes('resonance'))));

// Only IDs travel over Realtime; large rune descriptions stay in each client's
// shared rule catalog. This keeps every turn below the 256 KB Free-tier limit.
export function packTabletopState(G){
  return {...G,players:G.players.map(p=>({
    ...p,hand:p.hand.map(c=>c.id),deck:p.deck.map(c=>c.id),
    discard:p.discard.map(c=>c.id)
  }))};
}
export function unpackTabletopState(G,cards){
  const byId=new Map(cards.map(c=>[c.id,c]));
  const players=G.players.map(p=>{
    const expand=list=>list.map(id=>byId.get(id));
    return {...p,hand:expand(p.hand),deck:expand(p.deck),discard:expand(p.discard)};
  });
  if(players.some(p=>[...p.hand,...p.deck,...p.discard].some(card=>!card)))return null;
  return {...G,players};
}

function actionEffect(state,move,args,rules){
  if(move==='resonance'){
    const card=rules.cards.find(c=>c.englishName==='Resonance');
    return card?{kind:'rune',card}:{kind:'resonance'};
  }
  let card;
  if(move==='toggleCard'){
    const [player,id]=args;
    const p=state.players[player];
    if(!p||p.selected.includes(id))return null;
    card=p.hand.find(c=>c.id===id);
  }else if(move==='confirmOpening'){
    const p=state.players[args[0]];
    card=p?.hand.find(c=>p.selected.includes(c.id));
  }else if(move==='resolveEvent'){
    const p=state.players.find(p=>p.selected.length);
    card=p?.hand.find(c=>p.selected.includes(c.id));
  }
  return card?{kind:'rune',card,appearance:move==='toggleCard'?'glyph':'card'}:null;
}

/**
 * Ephemeral, shared tabletop. One room creator serializes valid moves.
 * Everyone with the invitation code may operate any player; no referee or accounts.
 * No DB writes or permanent save; the creator must remain online.
 */
export function useOnlineTabletop({data,count,code,host}){
  const game=useMemo(()=>createLunaRunesGame(data,count),[data,count]);
  const [G,setG]=useState(null);
  const [online,setOnline]=useState(false);
  const [members,setMembers]=useState([]);
  const [error,setError]=useState('');
  const [remoteEffect,setRemoteEffect]=useState(null);
  const memberId=useRef(null);
  if(!memberId.current)memberId.current=crypto.randomUUID();
  const Gref=useRef(null);
  const revision=useRef(0);
  const channelRef=useRef(null);
  const applyRef=useRef(null);
  const connectedRef=useRef(false);

  useEffect(()=>{
    let active=true;
    const sdk=createSupabaseAdapter({target:'supabase'}).publicClient;
    const channel=sdk.channel(topic(code),{
      config:{broadcast:{ack:true,self:false},presence:{key:memberId.current}}
    });
    channelRef.current=channel;
    const report=reason=>{if(active)setError(String(reason?.message||reason||'連線訊息發送失敗'))};
    const send=(event,payload)=>channel.send({type:'broadcast',event,payload})
      .then(result=>{if(result!=='ok')report('Realtime 傳送失敗：'+result)})
      .catch(report);
    const publish=(origin,effect=null)=>{
      if(Gref.current)send('state',{state:packTabletopState(Gref.current),revision:revision.current,origin,effect});
    };
    const apply=(move,args,origin,expected)=>{
      const state=Gref.current;
      if(!connectedRef.current||!state||!Object.hasOwn(game.moves,move)||!Array.isArray(args))return;
      if(expected&&(expected.round!==state.round||expected.stage!==state.stage))return;
      const effect=actionEffect(state,move,args,data);
      const next=produce(state,draft=>game.moves[move]({G:draft},...args));
      if(next===state)return;
      Gref.current=next;
      revision.current+=1;
      setG(next);
      publish(origin,effect);
      if(origin!==memberId.current&&effect)setRemoteEffect({...effect,revision:revision.current});
    };
    applyRef.current=apply;
    channel
      .on('broadcast',{event:'request-state'},()=>{
        if(host)publish(memberId.current);
      })
      .on('broadcast',{event:'move'},({payload})=>{
        if(host&&payload?.origin&&typeof payload.move==='string'){
          apply(payload.move,payload.args,payload.origin,payload.expected);
        }
      })
      .on('broadcast',{event:'state'},({payload})=>{
        if(host||!payload||!validState(payload.state)||
          !Number.isInteger(payload.revision)||payload.revision<revision.current)return;
        const next=unpackTabletopState(payload.state,data.cards);
        if(!next)return;
        Gref.current=next;
        revision.current=payload.revision;
        setG(next);
        if(payload.effect&&payload.origin!==memberId.current){
          setRemoteEffect({...payload.effect,revision:payload.revision});
        }
      })
      .on('presence',{event:'sync'},()=>{
        const next=Object.values(channel.presenceState()).flat();
        if(active)setMembers(next);
      })
      .subscribe(status=>{
        const connected=status==='SUBSCRIBED';
        connectedRef.current=connected;
        if(active){
          setOnline(connected);
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')report('Realtime '+status);
          if(connected)setError('');
        }
        if(connected){
          channel.track({id:memberId.current,role:host?'host':'guest'}).catch(report);
          if(host)publish(memberId.current);
          else send('request-state',{id:memberId.current});
        }
      });
    return ()=>{
      active=false;
      connectedRef.current=false;
      applyRef.current=null;
      channelRef.current=null;
      sdk.removeChannel(channel);
    };
  },[code,host,game,data]);

  const start=()=>{
    if(!host||!connectedRef.current||Gref.current)return;
    const state=game.setup();
    Gref.current=state;
    revision.current+=1;
    setG(state);
    channelRef.current?.send({type:'broadcast',event:'state',
      payload:{state:packTabletopState(state),revision:revision.current,origin:memberId.current}})
      .then(result=>{if(result!=='ok')setError('Realtime 傳送失敗：'+result)})
      .catch(e=>setError(String(e?.message||e)));
  };
  const moves=useMemo(()=>Object.fromEntries(Object.keys(game.moves).map(move=>[
    move,(...args)=>{
      if(!connectedRef.current||!Gref.current)return;
      if(host)applyRef.current?.(move,args,memberId.current,null);
      else channelRef.current?.send({type:'broadcast',event:'move',
        payload:{origin:memberId.current,move,args,
          expected:{round:Gref.current.round,stage:Gref.current.stage}}})
        .then(result=>{if(result!=='ok')setError('Realtime 傳送失敗：'+result)})
        .catch(e=>setError(String(e?.message||e)));
    }
  ])),[game,host]);

  return {G,moves,start,online,members,error,remoteEffect,hostOnline:host||members.some(m=>m.role==='host')};
}
