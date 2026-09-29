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
  extra_rules:z.string().nullable().optional(),
  extra_notes:z.string().nullable().optional()
}).passthrough();

const GameRow=z.object({
  game_key:z.string(),
  record_type:z.enum(['event','rune_action','role','rule','macro','asset']),
  sort_order:z.coerce.number().int(),
  status:z.string(),
  is_current:z.boolean(),

  event_id:z.string().nullable().optional(),
  event_group:z.string().nullable().optional(),
  event_title:z.string().nullable().optional(),
  event_requirement:z.string().nullable().optional(),
  event_description:z.string().nullable().optional(),

  rune_id:z.coerce.number().int().nullable().optional(),
  rune_name:z.string().nullable().optional(),
  rune_group:z.string().nullable().optional(),
  rune_action_text:z.string().nullable().optional(),
  rune_action_kind:z.string().nullable().optional(),
  rune_action_value:z.coerce.number().int().nullable().optional(),

  role_id:z.coerce.number().int().nullable().optional(),
  role_formal_name:z.string().nullable().optional(),
  role_public_name:z.string().nullable().optional(),
  role_group:z.string().nullable().optional(),
  role_core_function:z.string().nullable().optional(),
  role_intervention_type:z.string().nullable().optional(),
  role_intervention_name:z.string().nullable().optional(),
  role_tool:z.string().nullable().optional(),
  role_tagline:z.string().nullable().optional(),

  rule_code:z.string().nullable().optional(),
  rule_title:z.string().nullable().optional(),
  rule_text:z.string().nullable().optional(),
  rule_round_no:z.coerce.number().int().nullable().optional(),
  rule_phase:z.string().nullable().optional(),
  rule_result_code:z.string().nullable().optional(),
  rule_de_delta:z.coerce.number().int().nullable().optional(),
  rule_draw_count:z.coerce.number().int().nullable().optional(),
  rule_value_int:z.coerce.number().int().nullable().optional(),
  rule_value_text:z.string().nullable().optional(),

  macro_code:z.string().nullable().optional(),
  macro_group_a:z.string().nullable().optional(),
  macro_group_b:z.string().nullable().optional(),
  macro_title:z.string().nullable().optional(),
  macro_description:z.string().nullable().optional(),

  asset_code:z.string().nullable().optional(),
  asset_kind:z.string().nullable().optional(),
  asset_group:z.string().nullable().optional(),
  asset_group_2:z.string().nullable().optional(),
  asset_path:z.string().nullable().optional(),
  asset_title:z.string().nullable().optional()
}).passthrough();

function splitRequirement(value){
  return String(value||'').split('+').map(item=>item.trim()).filter(Boolean);
}

function requiredInt(rows,code){
  const row=rows.find(item=>item.rule_code===code);
  if(!row||row.rule_value_int===null||row.rule_value_int===undefined)throw new Error('silver.game 缺少規則：'+code);
  return Number(row.rule_value_int);
}

function requiredDelta(rows,code){
  const row=rows.find(item=>item.rule_code===code);
  if(!row||row.rule_de_delta===null||row.rule_de_delta===undefined)throw new Error('silver.game 缺少德值規則：'+code);
  return Number(row.rule_de_delta);
}

export async function loadGameData(){
  const [runesResult,gameResult]=await Promise.all([
    neonPublicClient.schema('silver').from('runes')
      .select('rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,extra_rules,extra_notes')
      .gte('rune_id',0).lte('rune_id',66).order('rune_id',{ascending:true}),
    neonPublicClient.schema('silver').from('game')
      .select('*')
      .eq('is_current',true)
      .order('record_type',{ascending:true})
      .order('sort_order',{ascending:true})
  ]);

  if(runesResult.error)throw new Error(runesResult.error.message||'silver.runes 讀取失敗');
  if(gameResult.error)throw new Error(gameResult.error.message||'silver.game 讀取失敗');

  const runes=z.array(RuneRow).parse(runesResult.data||[]);
  const gameRows=z.array(GameRow).parse(gameResult.data||[]);

  const macros=gameRows.filter(row=>row.record_type==='macro').map(row=>({
    code:row.macro_code,
    groupA:row.macro_group_a,
    groupB:row.macro_group_b,
    title:row.macro_title,
    description:row.macro_description,
    order:row.sort_order
  }));
  if(macros.length!==4)throw new Error('silver.game Macro 數量不是 4。');

  const macroByGroup=new Map();
  for(const macro of macros){
    if(macro.groupA)macroByGroup.set(macro.groupA,macro.code);
    if(macro.groupB)macroByGroup.set(macro.groupB,macro.code);
  }

  const runeActions=gameRows.filter(row=>row.record_type==='rune_action')
    .sort((a,b)=>(a.rune_id||0)-(b.rune_id||0))
    .map(row=>({
      runeId:row.rune_id,
      name:row.rune_name,
      group:row.rune_group,
      text:row.rune_action_text,
      kind:row.rune_action_kind,
      value:row.rune_action_value
    }));
  if(runeActions.length!==66)throw new Error('silver.game Rune Action 數量不是 66。');
  const actionByRune=new Map(runeActions.map(row=>[row.runeId,row]));

  const cards=runes.filter(row=>row.rune_id>=1&&row.rune_id<=66).map(row=>{
    const action=actionByRune.get(row.rune_id);
    return {
      id:row.rune_id,
      name:String(row.rune_name||'').replace(/之符文$/,'').trim(),
      englishName:row.english_name||'',
      totem:row.totem||'',
      group:row.group_name||'',
      moonPhase:row.moon_phase??null,
      cardAttr:row.card_attr??null,
      description:row.rune_description||'',
      archetype:row.archetype||'',
      extraRules:row.extra_rules||'',
      extraNotes:row.extra_notes||'',
      action:action?.text||'',
      actionKind:action?.kind||null,
      actionValue:action?.value??null,
      alphaCompatMacro:macroByGroup.get(row.group_name)||null
    };
  });
  if(cards.length!==66)throw new Error('silver.runes 可玩符文數量不是 66。');

  const events=gameRows.filter(row=>row.record_type==='event')
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(row=>({
      id:row.event_id,
      name:row.event_title,
      group:row.event_group,
      requirement:row.event_requirement,
      req:splitRequirement(row.event_requirement),
      description:row.event_description,
      desc:row.event_description,
      status:row.status
    }));
  if(events.length!==32)throw new Error('silver.game Event 數量不是 32。');

  const roles=gameRows.filter(row=>row.record_type==='role')
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(row=>({
      id:row.role_id,
      group:row.role_group,
      formalName:row.role_formal_name,
      publicName:row.role_public_name,
      name:[row.role_formal_name,row.role_public_name].filter(Boolean).join('／'),
      focus:row.role_core_function,
      mode:row.role_intervention_type,
      intervention:row.role_intervention_name,
      tool:row.role_tool,
      tagline:row.role_tagline
    }));
  if(roles.length!==8)throw new Error('silver.game Role 數量不是 8。');

  const rules=gameRows.filter(row=>row.record_type==='rule').sort((a,b)=>a.sort_order-b.sort_order);
  const rounds=rules.filter(row=>row.rule_code==='ROUND_PHASE')
    .sort((a,b)=>(a.rule_round_no||0)-(b.rule_round_no||0))
    .map(row=>({round:row.rule_round_no,phase:row.rule_phase,title:row.rule_title,text:row.rule_text}));
  if(rounds.length!==8)throw new Error('silver.game Current 回合數量不是 8。');

  const resultRows=rules.filter(row=>row.rule_code==='EVENT_RESULT');
  if(resultRows.length!==5)throw new Error('silver.game Event Result 數量不是 5。');
  const resultByCoverage=new Map();
  for(const row of resultRows){
    const coverage=Number.parseInt(String(row.rule_value_text||'').split('/')[0],10);
    if(Number.isFinite(coverage)){
      resultByCoverage.set(coverage,{
        code:row.rule_result_code,
        label:row.rule_title,
        coverageText:row.rule_value_text,
        delta:Number(row.rule_de_delta||0),
        drawCount:Number(row.rule_draw_count||0)
      });
    }
  }

  const config={
    playerMin:requiredInt(rules,'PLAYER_MIN'),
    playerMax:requiredInt(rules,'PLAYER_MAX'),
    deMin:requiredInt(rules,'DE_MIN'),
    deMax:requiredInt(rules,'DE_MAX'),
    openingDraw:requiredInt(rules,'OPENING_DRAW'),
    openingDiscard:requiredInt(rules,'OPENING_DISCARD'),
    handBase:requiredInt(rules,'HAND_BASE'),
    handTempCap:requiredInt(rules,'HAND_TEMP_CAP'),
    eventResponseCards:requiredInt(rules,'EVENT_RESPONSE_CARDS'),
    eventDraw:rules.find(row=>row.rule_code==='EVENT_DRAW')?.rule_draw_count??0,
    failDraw:rules.find(row=>row.rule_code==='FAIL_DRAW')?.rule_draw_count??0,
    resonanceSelf:requiredDelta(rules,'RESONANCE_SELF'),
    resonanceAttack:requiredDelta(rules,'RESONANCE_ATTACK')
  };

  const assets=gameRows.filter(row=>row.record_type==='asset')
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(row=>({
      code:row.asset_code,
      kind:row.asset_kind,
      group:row.asset_group,
      group2:row.asset_group_2,
      path:row.asset_path,
      title:row.asset_title,
      order:row.sort_order
    }));

  const groupAssets=assets.filter(row=>row.kind==='group_visual');
  const eventVisuals=assets.filter(row=>row.kind==='event_pair');
  const authorAsset=assets.find(row=>row.kind==='author_visual')||null;
  if(groupAssets.length!==8)throw new Error('silver.game Group Visual 數量不是 8。');
  if(eventVisuals.length!==4)throw new Error('silver.game Event Visual 數量不是 4。');

  const de=runes.find(row=>row.rune_id===0)||null;
  return {
    cards,de,
    events,roles,rules,macros,runeActions,
    rounds,resultByCoverage,config,
    assets,groupAssets,eventVisuals,authorAsset
  };
}

export function shuffle(list){
  const next=[...(list||[])];
  for(let i=next.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [next[i],next[j]]=[next[j],next[i]];
  }
  return next;
}

export function draw(player,count,config){
  const room=Math.max(0,config.handTempCap-player.hand.length);
  const n=Math.min(count,room,player.deck.length);
  return {...player,hand:[...player.hand,...player.deck.slice(0,n)],deck:player.deck.slice(n)};
}

export function freshPlayer(cards,name,config){
  const deck=shuffle(cards);
  return {
    name,
    de:config.deMin,
    deck:deck.slice(config.openingDraw),
    hand:deck.slice(0,config.openingDraw),
    discard:[],
    selected:[],
    opening:true
  };
}

export function finishOpening(player,ids,config){
  if(ids.length!==config.openingDiscard)throw new Error('起手棄牌數量不正確。');
  const selected=new Set(ids);
  if(selected.size!==config.openingDiscard)throw new Error('起手棄牌不可重複。');
  const discarded=player.hand.filter(card=>selected.has(card.id));
  if(discarded.length!==config.openingDiscard)throw new Error('起手棄牌不合法。');
  return {
    ...player,
    hand:player.hand.filter(card=>!selected.has(card.id)),
    discard:[...player.discard,...discarded],
    selected:[],
    opening:false
  };
}

export function applyDe(player,delta,config){
  return {...player,de:Math.max(config.deMin,Math.min(config.deMax,player.de+delta))};
}

export function evaluateAlphaEvent(cards,event,resultByCoverage,config){
  if(cards.length!==config.eventResponseCards)throw new Error('Event 回應張數不正確。');
  const pool=[...(event?.req||[])];
  let macroHits=0;
  for(const card of cards){
    const index=pool.indexOf(card.alphaCompatMacro);
    if(index>=0){
      macroHits++;
      pool.splice(index,1);
    }
  }
  const diversity=new Set(cards.map(card=>card.group)).size;
  const coverage=Math.min(4,macroHits+Math.min(2,diversity));
  const result=resultByCoverage.get(coverage);
  if(!result)throw new Error('silver.game 缺少 Event Result：'+coverage+'/4');
  return {
    coverage,
    result:result.code,
    label:result.label,
    coverageText:result.coverageText,
    delta:result.delta,
    drawCount:result.drawCount
  };
}
