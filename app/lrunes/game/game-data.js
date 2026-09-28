import {z} from 'zod';
import {neonPublicClient} from '../../loc/neon-client';

const RuneRow=z.object({
  rune_id:z.coerce.number().int().min(0).max(66),
  rune_name:z.string().nullable().optional(),
  english_name:z.string().nullable().optional(),
  totem:z.string().nullable().optional(),
  group_name:z.string().nullable().optional(),
  moon_phase:z.coerce.number().int().nullable().optional(),
  card_attr:z.coerce.number().int().nullable().optional(),
  rune_description:z.string().nullable().optional(),
  archetype:z.string().nullable().optional(),
  char_action:z.string().nullable().optional(),
  extra_rules:z.string().nullable().optional(),
  extra_notes:z.string().nullable().optional()
}).passthrough();

const RuneEtcRow=z.object({
  rune_id:z.coerce.number().int().min(0).max(66),
  dir:z.coerce.number().int().min(1).max(4),
  type:z.string(),
  desc:z.string()
});

const LEGACY_MACRO=Object.freeze({
  靈魂:'SL',連結:'SL',
  礦物:'ML',生命:'ML',
  自然:'NE',元素:'NE',
  秩序:'OD',無序:'OD'
});

export const RESULT_DE=Object.freeze({perfect:2,pass:1,fair:0,replenish:0,fail:-1});
export const HAND_RULE=Object.freeze({base:5,tempCap:8,eventDraw:2,failDraw:1});
export const TWO_PLAYER_ROUNDS=Object.freeze(['event','event','event','resonance','event','event','event','final-resonance']);
export const MULTI_PLAYER_ROUNDS=Object.freeze(['event','battle','event','battle','event','battle','event','final-battle']);

export async function loadGameRuneData(){
  const [runesResult,etcResult]=await Promise.all([
    neonPublicClient.schema('silver').from('runes')
      .select('rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,extra_rules,extra_notes')
      .gte('rune_id',0).lte('rune_id',66).order('rune_id',{ascending:true}),
    neonPublicClient.schema('silver').from('runes_etc')
      .select('rune_id,dir,type,desc')
      .gte('rune_id',0).lte('rune_id',66)
      .order('rune_id',{ascending:true}).order('dir',{ascending:true}).order('type',{ascending:true})
  ]);
  if(runesResult.error)throw new Error(runesResult.error.message||'silver.runes 讀取失敗');
  if(etcResult.error)throw new Error(etcResult.error.message||'silver.runes_etc 讀取失敗');

  const runes=z.array(RuneRow).parse(runesResult.data||[]);
  const etc=z.array(RuneEtcRow).parse(etcResult.data||[]);
  const etcByRune=new Map();
  for(const row of etc){
    if(!etcByRune.has(row.rune_id))etcByRune.set(row.rune_id,[]);
    etcByRune.get(row.rune_id).push(row);
  }

  const cards=runes.filter(row=>row.rune_id>=1&&row.rune_id<=66).map(row=>({
    id:row.rune_id,
    name:String(row.rune_name||'').replace(/之符文$/,'').trim(),
    englishName:row.english_name||'',
    totem:row.totem||'',
    group:row.group_name||'',
    moonPhase:row.moon_phase??null,
    cardAttr:row.card_attr??null,
    description:row.rune_description||'',
    archetype:row.archetype||'',
    action:row.char_action||'',
    extraRules:row.extra_rules||'',
    extraNotes:row.extra_notes||'',
    etc:etcByRune.get(row.rune_id)||[],
    legacyMacro:LEGACY_MACRO[row.group_name]||null
  }));

  if(cards.length!==66)throw new Error('silver.runes 可玩符文數量為 '+cards.length+'，預期 66。');
  const de=runes.find(row=>row.rune_id===0)||null;
  return {cards,de,etc};
}

export function shuffle(list){
  const next=[...(list||[])];
  for(let i=next.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [next[i],next[j]]=[next[j],next[i]];
  }
  return next;
}

export function draw(player,count){
  const room=Math.max(0,HAND_RULE.tempCap-player.hand.length);
  const n=Math.min(count,room,player.deck.length);
  return {...player,hand:[...player.hand,...player.deck.slice(0,n)],deck:player.deck.slice(n)};
}

export function freshPlayer(cards,name){
  const deck=shuffle(cards);
  return {name,de:0,deck:deck.slice(8),hand:deck.slice(0,8),discard:[],selected:[],opening:true};
}

export function finishOpening(player,ids){
  if(ids.length!==3)throw new Error('起手必須從 8 張中棄 3 張。');
  const selected=new Set(ids);
  if(selected.size!==3)throw new Error('起手棄牌不可重複。');
  const discarded=player.hand.filter(card=>selected.has(card.id));
  if(discarded.length!==3)throw new Error('起手棄牌不合法。');
  return {
    ...player,
    hand:player.hand.filter(card=>!selected.has(card.id)),
    discard:[...player.discard,...discarded],
    selected:[],
    opening:false
  };
}

export function applyDe(player,delta){
  return {...player,de:Math.max(0,Math.min(8,player.de+delta))};
}

export function evaluateLegacyEvent(cards,event){
  if(cards.length!==2)throw new Error('Event 回應固定使用兩張符文。');
  const req=Array.isArray(event?.req)?event.req:[];
  const pool=[...req];
  let macroHits=0;
  for(const card of cards){
    const i=pool.indexOf(card.legacyMacro);
    if(i>=0){macroHits++;pool.splice(i,1);}
  }
  const diversity=new Set(cards.map(card=>card.group)).size;
  const coverage=Math.min(4,macroHits+Math.min(2,diversity));
  const result=coverage===4?'perfect':coverage===3?'pass':coverage===2?'fair':coverage===1?'replenish':'fail';
  return {coverage,result,delta:RESULT_DE[result]};
}
