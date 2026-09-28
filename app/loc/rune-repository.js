'use client';

import {neonPublicClient} from './neon-client';

const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes';
const RUNE_DETAIL_COLUMNS='rune_evolution_history,myth_story,soul_question,practice_challenge,ritual_advice,harmony_advice';
const GROUP_COLUMNS='group_id,english_name,desc,quality,style,runeslist';
const ETC_COLUMNS='rune_id,dir,type,desc';
const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
const CARD_ATTRIBUTE_LABELS=Object.freeze({1:'正面',2:'中平',3:'負面',4:'未知'});
const DIRECTION_FIELDS=Object.freeze({1:'positive_meaning',2:'half_positive_meaning',3:'half_reverse_meaning',4:'reverse_meaning'});
const LOTS_FIELDS=Object.freeze({1:'lots_positive',2:'lots_half_positive',3:'lots_half_negative',4:'lots_negative'});
const DAILY_FIELDS=Object.freeze({1:'daily_positive',2:'daily_half_positive',3:'daily_half_reverse',4:'daily_reverse'});
const ETC_TYPES=new Set(['direction','lots','daily']);
async function selectRuneTable(table,columns,{filters=[],orders=[]}={}){
  let query=neonPublicClient.schema('silver').from(table).select(columns);
  for(const filter of filters){
    query=filter.operator==='in'
      ?query.in(filter.column,filter.value)
      :query[filter.operator](filter.column,filter.value);
  }
  for(const order of orders)query=query.order(order.column,{ascending:order.ascending??true});
  const {data,error}=await query;
  if(error)throw new Error(error.message||('Neon '+table+' read failed'));
  return data||[];
}


function normalizeRune(row){
  const runeId=Number(row?.rune_id);
  const moonCode=row?.moon_phase===null||row?.moon_phase===undefined?null:Number(row.moon_phase);
  const attrCode=row?.card_attr===null||row?.card_attr===undefined?null:Number(row.card_attr);
  return {
    ...row,
    rune_number:runeId,
    moon_phase_code:moonCode,
    card_attr_code:attrCode,
    personality_archetype:row?.archetype||'',
    character_action:row?.char_action||'',
    moon_phase:moonCode===null?'':(MOON_PHASE_LABELS[moonCode]||''),
    card_attribute:attrCode===null?'未知':(CARD_ATTRIBUTE_LABELS[attrCode]||'未知')
  };
}

function normalizeGroup(row){
  const runes=Array.isArray(row?.runeslist)?row.runeslist.map(Number).filter(Number.isInteger):[];
  const positive=runes.filter(number=>number>0);
  const first=positive.length?Math.min(...positive):65;
  const routeId=first>=65?'09':String(Math.floor((first-1)/8)+1).padStart(2,'0');
  return {
    ...row,
    id:routeId,
    name:row?.group_id||'',
    english:row?.english_name||'',
    description:row?.desc||'',
    runeslist:runes
  };
}

function normalizeEtcTypes(types=[]){
  return [...new Set((types||[]).map(value=>String(value||'').trim()).filter(value=>ETC_TYPES.has(value)))];
}

function mergeRuneEtc(runes,etcRows){
  const map=new Map((runes||[]).map(row=>[Number(row.rune_number),{...row,rune_etc:{}}]));
  for(const row of etcRows||[]){
    const rune=map.get(Number(row.rune_id));
    if(!rune)continue;
    const dir=Number(row.dir);
    const type=String(row.type||'');
    const desc=String(row.desc||'');
    rune.rune_etc[type]??={};
    rune.rune_etc[type][dir]=desc;
    const field=type==='direction'?DIRECTION_FIELDS[dir]:type==='lots'?LOTS_FIELDS[dir]:type==='daily'?DAILY_FIELDS[dir]:null;
    if(field)rune[field]=desc;
  }
  return [...map.values()];
}


export async function selectRuneGroupCatalog(){
  const rows=await selectRuneTable('runes_group',GROUP_COLUMNS);
  return rows.map(normalizeGroup).sort((a,b)=>Number(a.id)-Number(b.id));
}

export async function selectRuneEtcRows({runeNumbers=[],types=[]}={}){
  const wanted=[...new Set((runeNumbers||[]).map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  const selectedTypes=normalizeEtcTypes(types);
  if(!wanted.length&&!selectedTypes.length)throw new TypeError('runes_etc requires runeNumbers or types');
  const filters=[];
  if(wanted.length)filters.push({column:'rune_id',operator:'in',value:wanted});
  if(selectedTypes.length)filters.push({column:'type',operator:'in',value:selectedTypes});
  return selectRuneTable('runes_etc',ETC_COLUMNS,{
    filters,
    orders:[{column:'rune_id',ascending:true},{column:'dir',ascending:true},{column:'type',ascending:true}]
  });
}

export async function selectRuneCatalog({types=[]}={}){
  const selectedTypes=normalizeEtcTypes(types);
  const [runes,etcRows]=await Promise.all([
    selectRuneTable('runes',RUNE_COLUMNS,{
      orders:[{column:'rune_id',ascending:true}]
    }),
    selectedTypes.length?selectRuneEtcRows({types:selectedTypes}):Promise.resolve([])
  ]);
  const normalized=runes.map(normalizeRune);
  return selectedTypes.length?mergeRuneEtc(normalized,etcRows):normalized;
}

export async function selectRuneRows(runeNumbers=[],{types=[],detail=false}={}){
  const wanted=[...new Set((runeNumbers||[]).map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  if(!wanted.length)return [];
  const selectedTypes=normalizeEtcTypes(types);
  const columns=detail?`${RUNE_COLUMNS},${RUNE_DETAIL_COLUMNS}`:RUNE_COLUMNS;
  const [runes,etcRows]=await Promise.all([
    selectRuneTable('runes',columns,{
      filters:[{column:'rune_id',operator:'in',value:wanted}],
      orders:[{column:'rune_id',ascending:true}]
    }),
    selectedTypes.length?selectRuneEtcRows({runeNumbers:wanted,types:selectedTypes}):Promise.resolve([])
  ]);
  const normalized=runes.map(normalizeRune);
  return selectedTypes.length?mergeRuneEtc(normalized,etcRows):normalized;
}

export async function selectRuneDetail(runeNumber,{types=['direction','lots','daily']}={}){
  const rows=await selectRuneRows([runeNumber],{types,detail:true});
  return rows[0]||null;
}

export async function selectRuneKeywordCatalog(){
  const [runes,groups]=await Promise.all([
    selectRuneCatalog(),
    selectRuneGroupCatalog()
  ]);
  return {groups,runes};
}

function splitKeywords(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}

export async function updateRuneKeywords(){
  throw new Error('LunaRunes Canon 為唯讀資料。');
}
