'use client';

import {deleteNeonRows,insertNeonRows,selectNeonCatalog} from './neon-repository';

const RUNE_COLUMNS='rune_number,rune_name,group_name,english_name,lots_positive,lots_negative,lots_half_positive,lots_half_negative,myth_story,rune_evolution_history,personality_archetype,card_attribute,totem,moon_phase,positive_meaning,reverse_meaning,half_positive_meaning,half_reverse_meaning,rune_description,character_action,extra_notes,extra_rules,soul_question,practice_challenge,ritual_advice,harmony_advice,UpdateTime';
const KEYWORD_COLUMNS='rune_number,keyword_group,keyword';

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
  const [runes,keywords]=await Promise.all([
    selectNeonCatalog('silver.lrunes',{
      columns:RUNE_COLUMNS,
      filters:[{column:'record_type',operator:'eq',value:'rune'}],
      orders:[{column:'rune_number',ascending:true}]
    }),
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
  return runes.rows.map(row=>{
    const bucket=keywordsByRune.get(Number(row.rune_number))||{positive:[],negative:[]};
    return {...row,positive_keywords:bucket.positive.join('、'),negative_keywords:bucket.negative.join('、')};
  });
}

export async function selectRuneRows(runeNumbers=[]){
  const wanted=new Set(runeNumbers.map(Number).filter(Number.isInteger));
  if(!wanted.size)return [];
  const rows=await selectRuneCatalog();
  return rows.filter(row=>wanted.has(Number(row.rune_number)));
}


export async function selectRuneKeywordCatalog(){
  return {runes:await selectRuneCatalog()};
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
