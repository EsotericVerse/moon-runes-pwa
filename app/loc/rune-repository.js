'use client';

import {deleteNeonRows,insertNeonRows,selectNeonCatalog} from './neon-repository';

const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes';
const RUNE_DETAIL_COLUMNS='rune_evolution_history,myth_story,soul_question,practice_challenge,ritual_advice,harmony_advice';
const GROUP_COLUMNS='group_id,english_name,desc,quality,style,runeslist';
const ETC_COLUMNS='rune_id,dir,type,desc';
const KEYWORD_COLUMNS='rune_number,keyword_group,keyword';
const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
const CARD_ATTRIBUTE_LABELS=Object.freeze({1:'正面',2:'中平',3:'負面',4:'未知'});
const DIRECTION_FIELDS=Object.freeze({1:'positive_meaning',2:'half_positive_meaning',3:'half_reverse_meaning',4:'reverse_meaning'});
const LOTS_FIELDS=Object.freeze({1:'lots_positive',2:'lots_half_positive',3:'lots_half_negative',4:'lots_negative'});
const DAILY_FIELDS=Object.freeze({1:'daily_positive',2:'daily_half_positive',3:'daily_half_reverse',4:'daily_reverse'});
const ETC_TYPES=new Set(['direction','lots','daily']);

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

function keywordMap(rows){
  const map=new Map();
  for(const row of rows||[]){
    const number=Number(row?.rune_number);
    if(!Number.isInteger(number)||!row?.keyword)continue;
    if(!map.has(number))map.set(number,{positive:[],negative:[]});
    const bucket=map.get(number);
    if(row.keyword_group==='positive')bucket.positive.push(row.keyword);
    if(row.keyword_group==='negative')bucket.negative.push(row.keyword);
  }
  return map;
}

export async function selectRuneGroupCatalog(){
  const result=await selectNeonCatalog('silver.runes_group',{columns:GROUP_COLUMNS});
  return result.rows.map(normalizeGroup).sort((a,b)=>Number(a.id)-Number(b.id));
}

export async function selectRuneEtcRows({runeNumbers=[],types=[]}={}){
  const wanted=[...new Set((runeNumbers||[]).map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  const selectedTypes=normalizeEtcTypes(types);
  if(!wanted.length&&!selectedTypes.length)throw new TypeError('runes_etc requires runeNumbers or types');
  const filters=[];
  if(wanted.length)filters.push({column:'rune_id',operator:'in',value:wanted});
  if(selectedTypes.length)filters.push({column:'type',operator:'in',value:selectedTypes});
  const result=await selectNeonCatalog('silver.runes_etc',{
    columns:ETC_COLUMNS,
    filters,
    orders:[{column:'rune_id',ascending:true},{column:'dir',ascending:true},{column:'type',ascending:true}]
  });
  return result.rows;
}

export async function selectRuneCatalog({types=[]}={}){
  const selectedTypes=normalizeEtcTypes(types);
  const [runes,etcRows]=await Promise.all([
    selectNeonCatalog('silver.runes',{
      columns:RUNE_COLUMNS,
      orders:[{column:'rune_id',ascending:true}]
    }),
    selectedTypes.length?selectRuneEtcRows({types:selectedTypes}):Promise.resolve([])
  ]);
  const normalized=runes.rows.map(normalizeRune);
  return selectedTypes.length?mergeRuneEtc(normalized,etcRows):normalized;
}

export async function selectRuneRows(runeNumbers=[],{types=[],detail=false}={}){
  const wanted=[...new Set((runeNumbers||[]).map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  if(!wanted.length)return [];
  const selectedTypes=normalizeEtcTypes(types);
  const columns=detail?`${RUNE_COLUMNS},${RUNE_DETAIL_COLUMNS}`:RUNE_COLUMNS;
  const [runes,etcRows]=await Promise.all([
    selectNeonCatalog('silver.runes',{
      columns,
      filters:[{column:'rune_id',operator:'in',value:wanted}],
      orders:[{column:'rune_id',ascending:true}]
    }),
    selectedTypes.length?selectRuneEtcRows({runeNumbers:wanted,types:selectedTypes}):Promise.resolve([])
  ]);
  const normalized=runes.rows.map(normalizeRune);
  return selectedTypes.length?mergeRuneEtc(normalized,etcRows):normalized;
}

export async function selectRuneDetail(runeNumber,{types=['direction','lots','daily']}={}){
  const rows=await selectRuneRows([runeNumber],{types,detail:true});
  return rows[0]||null;
}

export async function selectRuneKeywordCatalog(){
  const [runes,groups,keywords]=await Promise.all([
    selectRuneCatalog(),
    selectRuneGroupCatalog(),
    selectNeonCatalog('silver.lrunes',{
      columns:KEYWORD_COLUMNS,
      filters:[
        {column:'record_type',operator:'eq',value:'keyword'},
        {column:'active',operator:'eq',value:true}
      ],
      orders:[{column:'rune_number',ascending:true},{column:'order_no',ascending:true}]
    })
  ]);
  const keywordsByRune=keywordMap(keywords.rows);
  return {
    groups,
    runes:runes.map(row=>{
      const bucket=keywordsByRune.get(Number(row.rune_number))||{positive:[],negative:[]};
      return {...row,positive_keywords:bucket.positive.join('、'),negative_keywords:bucket.negative.join('、')};
    })
  };
}

function splitKeywords(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}

export async function updateRuneKeywords({runeNumber,positiveKeywords,negativeKeywords}){
  const number=Number(runeNumber);
  if(!Number.isInteger(number)||number<0||number>66)throw new TypeError('符文編號無效');
  for(const group of ['positive','negative']){
    await deleteNeonRows('silver.lrunes',{filters:[
      {column:'record_type',operator:'eq',value:'keyword'},
      {column:'rune_number',operator:'eq',value:number},
      {column:'keyword_group',operator:'eq',value:group}
    ],returning:null});
  }
  const rows=[];
  for(const [group,value] of [['positive',positiveKeywords],['negative',negativeKeywords]]){
    splitKeywords(value).forEach((keyword,index)=>rows.push({
      record_id:'keyword:'+number+':'+group+':'+keyword,
      record_type:'keyword',
      rune_number:number,
      keyword_group:group,
      keyword,
      order_no:index+1,
      active:true,
      UpdateTime:new Date().toISOString()
    }));
  }
  if(rows.length)await insertNeonRows('silver.lrunes',rows,{returning:'record_id'});
  return {rune_number:number};
}
