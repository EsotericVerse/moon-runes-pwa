'use client';

import {deleteNeonRows,insertNeonRows,selectNeonCatalog} from './neon-repository';

const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes,positive_meaning,half_positive_meaning,half_reverse_meaning,reverse_meaning';
const KEYWORD_COLUMNS='rune_number,keyword_group,keyword';
const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
const CARD_ATTRIBUTE_LABELS=Object.freeze({1:'正面',2:'中平',3:'負面',4:'未知'});

function normalizeRune(row){
  const runeId=Number(row?.rune_id);
  const moonCode=Number(row?.moon_phase);
  const attrCode=Number(row?.card_attr);
  return {
    ...row,
    rune_number:runeId,
    personality_archetype:row?.archetype||'',
    character_action:row?.char_action||'',
    moon_phase:Number.isInteger(moonCode)?(MOON_PHASE_LABELS[moonCode]||''): '',
    card_attribute:Number.isInteger(attrCode)?(CARD_ATTRIBUTE_LABELS[attrCode]||'未知'):'未知'
  };
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

export async function selectRuneCatalog(){
  const runes=await selectNeonCatalog('silver.runes',{
    columns:RUNE_COLUMNS,
    orders:[{column:'rune_id',ascending:true}]
  });
  return runes.rows.map(normalizeRune);
}

export async function selectRuneRows(runeNumbers=[]){
  const wanted=[...new Set(runeNumbers.map(Number).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  if(!wanted.length)return [];
  const runes=await selectNeonCatalog('silver.runes',{
    columns:RUNE_COLUMNS,
    filters:[{column:'rune_id',operator:'in',value:wanted}],
    orders:[{column:'rune_id',ascending:true}]
  });
  return runes.rows.map(normalizeRune);
}

export async function selectRuneKeywordCatalog(){
  const [runes,keywords]=await Promise.all([
    selectRuneCatalog(),
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
  return {runes:runes.map(row=>{
    const bucket=keywordsByRune.get(Number(row.rune_number))||{positive:[],negative:[]};
    return {...row,positive_keywords:bucket.positive.join('、'),negative_keywords:bucket.negative.join('、')};
  })};
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
