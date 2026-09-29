'use client';

import {neonAuthClient} from './neon-client';
import {selectNeonCount,selectNeonRows} from './neon-query';

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

async function selectRuneTable(table,columns,{filters=[],orders=[],orFilter='',limit=null}={}){
  const fullTable='silver.'+table;
  if(Number.isInteger(limit)&&limit>0){
    return (await selectNeonRows(fullTable,{columns,filters,orders,orFilter,limit,offset:0})).rows;
  }
  const total=await selectNeonCount(fullTable,{filters,orFilter});
  if(!total)return [];
  const rows=[];
  let offset=0;
  while(offset<total){
    const page=await selectNeonRows(fullTable,{
      columns,filters,orders,orFilter,
      limit:Math.min(1000,total-offset),
      offset
    });
    if(!page.rows.length)break;
    rows.push(...page.rows);
    offset+=page.rows.length;
  }
  return rows;
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

function normalizePairs(pairs=[]){
  const output=[];
  const seen=new Set();
  for(const item of pairs||[]){
    const runeNumber=Number(item?.runeNumber);
    const dir=Number(item?.dir);
    if(!Number.isInteger(runeNumber)||runeNumber<1||runeNumber>66||!Number.isInteger(dir)||dir<1||dir>4)continue;
    const key=`${runeNumber}:${dir}`;
    if(seen.has(key))continue;
    seen.add(key);
    output.push({runeNumber,dir});
  }
  return output;
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

async function selectRuneEtcPairs(pairs=[],types=[]){
  const exactPairs=normalizePairs(pairs);
  const selectedTypes=normalizeEtcTypes(types);
  if(!exactPairs.length||!selectedTypes.length)return [];
  return selectRuneTable('runes_etc',ETC_COLUMNS,{
    filters:[{column:'type',operator:'in',value:selectedTypes}],
    orFilter:exactPairs.map(item=>`and(rune_id.eq.${item.runeNumber},dir.eq.${item.dir})`).join(','),
    orders:[{column:'rune_id',ascending:true},{column:'dir',ascending:true},{column:'type',ascending:true}],
    limit:exactPairs.length*selectedTypes.length
  });
}

export async function selectRuneGroupCatalog(){
  const rows=await selectRuneTable('runes_group',GROUP_COLUMNS);
  return rows.map(normalizeGroup).sort((a,b)=>Number(a.id)-Number(b.id));
}

export async function selectRuneGroup(routeId){
  const id=Number(routeId);
  if(!Number.isInteger(id)||id<1||id>9)return null;
  const anchor=id===9?65:(id-1)*8+1;
  const rows=await selectRuneTable('runes_group',GROUP_COLUMNS,{
    filters:[{column:'runeslist',operator:'contains',value:[anchor]}]
  });
  return rows.length?normalizeGroup(rows[0]):null;
}

export async function selectRuneCatalog({detail=false}={}){
  const columns=detail?`${RUNE_COLUMNS},${RUNE_DETAIL_COLUMNS}`:RUNE_COLUMNS;
  const runes=await selectRuneTable('runes',columns,{orders:[{column:'rune_id',ascending:true}]});
  return runes.map(normalizeRune);
}

export async function selectRuneRows(runeNumbers=[],{detail=false}={}){
  const wanted=[...new Set((runeNumbers||[]).map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  if(!wanted.length)return [];
  const columns=detail?`${RUNE_COLUMNS},${RUNE_DETAIL_COLUMNS}`:RUNE_COLUMNS;
  const runes=await selectRuneTable('runes',columns,{
    filters:[{column:'rune_id',operator:'in',value:wanted}],
    orders:[{column:'rune_id',ascending:true}],
    limit:wanted.length
  });
  return runes.map(normalizeRune);
}

export async function selectRuneDrawRows(pairs=[],{types=[]}={}){
  const exactPairs=normalizePairs(pairs);
  if(!exactPairs.length)return [];
  const [runes,etcRows]=await Promise.all([
    selectRuneRows(exactPairs.map(item=>item.runeNumber)),
    selectRuneEtcPairs(exactPairs,types)
  ]);
  return mergeRuneEtc(runes,etcRows);
}

export async function selectRuneDetail(runeNumber){
  const rows=await selectRuneRows([runeNumber],{detail:true});
  return rows[0]||null;
}

export async function selectRuneKeywordCatalog(){
  const [runes,groups]=await Promise.all([selectRuneCatalog(),selectRuneGroupCatalog()]);
  return {groups,runes};
}

export async function updateRuneKeywords({runeNumber,positiveKeywords='',negativeKeywords=''}={}){
  const id=Number(runeNumber);
  if(!Number.isInteger(id)||id<1||id>66)throw new Error('無效的符文編號。');
  const {data,error}=await neonAuthClient.schema('silver').from('runes')
    .update({
      positive_keywords:String(positiveKeywords||'').trim()||null,
      negative_keywords:String(negativeKeywords||'').trim()||null
    })
    .eq('rune_id',id)
    .select('rune_id,positive_keywords,negative_keywords');
  if(error)throw new Error(error.message||'符文關鍵詞更新失敗');
  if(!data?.length)throw new Error('符文不存在或目前沒有修改權限。');
  return normalizeRune(data[0]);
}
