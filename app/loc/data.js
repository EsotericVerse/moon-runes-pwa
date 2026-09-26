export { LOC_DATA } from './data-paths.mjs';
import { LOC_DATA } from './data-paths.mjs';
import {selectNeonRows} from './neon-repository';
import {selectScopeTimeRows} from './scope-time';

const DEFAULT_GLOBAL_CONCURRENCY=2;
const DEFAULT_MAX_BATCH_ITEMS=24;
let activeRequests=0;
const waiters=[];

function sourcePath(path){
  const normalized=String(path||'').trim().replace(/^\/+/, '');
  if(!normalized)throw new Error('LOC Neon data path is required');
  return normalized;
}

function acquireSlot(limit=DEFAULT_GLOBAL_CONCURRENCY){
  if(activeRequests<limit){activeRequests+=1;return Promise.resolve();}
  return new Promise(resolve=>waiters.push({resolve,limit}));
}

function releaseSlot(){
  activeRequests=Math.max(0,activeRequests-1);
  for(let index=0;index<waiters.length;index+=1){
    const waiter=waiters[index];
    if(activeRequests<waiter.limit){
      waiters.splice(index,1);
      activeRequests+=1;
      waiter.resolve();
      return;
    }
  }
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

function runeRows(rows,keywordRows=[]){
  const keywords=keywordMap(keywordRows);
  return (rows||[]).map(row=>{
    const bucket=keywords.get(Number(row.rune_number))||{positive:[],negative:[]};
    const payload={
      正向表示:row.positive_meaning||'',
      半正向表示:row.half_positive_meaning||'',
      半逆向表示:row.half_reverse_meaning||'',
      逆向表示:row.reverse_meaning||''
    };
    return {
      編號:row.rune_number,
      符文名稱:row.rune_name,
      所屬分組:row.group_name,
      英文:row.english_name,
      人格原型:row.personality_archetype,
      卡片屬性:row.card_attribute,
      圖騰:row.totem,
      月相:row.moon_phase,
      正向表示:row.positive_meaning,
      半正向表示:row.half_positive_meaning,
      半逆向表示:row.half_reverse_meaning,
      逆向表示:row.reverse_meaning,
      符文說明:row.rune_description,
      角色行動:row.character_action,
      額外留意:row.extra_notes,
      額外規則:row.extra_rules,
      正向關鍵詞:bucket.positive.join('、'),
      反向關鍵詞:bucket.negative.join('、'),
      lots_positive:row.lots_positive,
      lots_negative:row.lots_negative,
      lots_half_positive:row.lots_half_positive,
      lots_half_negative:row.lots_half_negative,
      神話故事:row.myth_story,
      符文演化歷史:row.rune_evolution_history,
      符文變化歷史:row.rune_evolution_history,
      soul_question:row.soul_question,
      practice_challenge:row.practice_challenge,
      ritual_advice:row.ritual_advice,
      harmony_advice:row.harmony_advice,
      source_ref:row.source_ref,
      updated_at:row.updated_at,
      __neonPayload:payload
    };
  });
}

function periodRows(rows){
  return (rows||[]).map(row=>{
    const key=row.entry_key||row.period||'';
    return {
      era_id:key,
      period:row.period||key,
      name:row.entry_name||row.title||key,
      title:row.title||row.entry_name||key,
      description:row.summary||'',
      order:Number(row.order_no)||0,
      status:row.status||''
    };
  });
}

async function loadCanonicalRunes(){
  const [runes,keywords]=await Promise.all([
    selectNeonRows('silver.lrunes',{
      columns:'rune_number,rune_name,group_name,english_name,lots_positive,lots_negative,lots_half_positive,lots_half_negative,myth_story,rune_evolution_history,personality_archetype,card_attribute,totem,moon_phase,positive_meaning,reverse_meaning,half_positive_meaning,half_reverse_meaning,rune_description,character_action,extra_notes,extra_rules,soul_question,practice_challenge,ritual_advice,harmony_advice,source_ref,updated_at',
      filters:[{column:'record_type',operator:'eq',value:'rune'}],
      orders:[{column:'rune_number',ascending:true}],
      limit:100
    }),
    selectNeonRows('silver.lrunes',{
      columns:'rune_number,keyword_group,keyword',
      filters:[
        {column:'record_type',operator:'eq',value:'keyword'},
        {column:'active',operator:'eq',value:true}
      ],
      orders:[{column:'rune_number',ascending:true},{column:'order_no',ascending:true}],
      limit:5000
    })
  ]);
  return runeRows(runes.rows,keywords.rows);
}

async function fetchCanonical(path){
  const normalized=sourcePath(path);
  await acquireSlot();
  try{
    if(normalized==='canonical/runes'||normalized==='canonical/lots'||normalized==='canonical/rune-interpretations'){
      return loadCanonicalRunes();
    }
    if(normalized==='canonical/harmony'){
      return (await selectNeonRows('silver.lrunes',{
        columns:'rune_number,rune_name,soul_question,practice_challenge,ritual_advice,harmony_advice,updated_at',
        filters:[{column:'record_type',operator:'eq',value:'rune'}],
        orders:[{column:'rune_number',ascending:true}],
        limit:100
      })).rows;
    }
    if(normalized==='culture/lrunes-periods'){
      const {rows}=await selectNeonRows('silver.lrunes',{
        columns:'record_id,title,start_date,rune_count,status,updated_at',
        filters:[{column:'record_type',operator:'eq',value:'evolution'}],
        orders:[{column:'start_date',ascending:true}],
        limit:100
      });
      return {eras:rows.map(row=>({
        era_id:row.record_id,period:row.title,name:row.title,title:row.title,
        description:'',start_date:row.start_date,end_date:null,
        order:0,status:row.status||'',rune_count:row.rune_count
      }))};
    }
    if(normalized==='culture/lo3rwang-periods'){
      return {eras:periodRows((await selectScopeTimeRows('lo3rwang')).filter(row=>row.entry_type==='period'))};
    }
    throw new Error(`Neon canonical data path is not mapped: ${normalized}`);
  }finally{releaseSlot();}
}

export function fetchNeonData(path){
  return fetchCanonical(sourcePath(path));
}

export async function fetchRuneRows(runeNumbers){
  const wanted=new Set((runeNumbers||[]).map(Number).filter(Number.isInteger));
  if(!wanted.size)return [];
  const rows=await fetchNeonData(LOC_DATA.RUNES);
  return (Array.isArray(rows)?rows:[])
    .filter(row=>wanted.has(Number(row?.編號)))
    .map(row=>({rune_number:Number(row.編號),rune_data:row}));
}

export async function fetchNeonDataBatch(items,{concurrency=DEFAULT_GLOBAL_CONCURRENCY,maxItems=DEFAULT_MAX_BATCH_ITEMS,memory=true}={}){
  const queue=[...items];
  if(queue.length>maxItems)throw new Error(`LOC data batch has ${queue.length} items; budget allows ${maxItems}`);
  const results=new Array(queue.length);
  let cursor=0;
  async function worker(){
    while(true){
      const index=cursor++;
      if(index>=queue.length)return;
      const item=queue[index];
      const path=typeof item==='string'?item:item.path;
      results[index]=await fetchNeonData(path,{memory});
    }
  }
  const workerCount=Math.max(1,Math.min(concurrency,DEFAULT_GLOBAL_CONCURRENCY,queue.length||1));
  await Promise.all(Array.from({length:workerCount},()=>worker()));
  return results;
}

export function clearNeonDataCache(){
  return;
}

export function refreshLocDataVersionManifest(){
  clearNeonDataCache();
  return Promise.resolve({provider:'neon-canonical-api'});
}

export function refreshLocDataIndex(){
  clearNeonDataCache();
  return Promise.resolve({provider:'neon-canonical-api'});
}

export const LOC_IO_BUDGET=Object.freeze({
  maxBatchItems:DEFAULT_MAX_BATCH_ITEMS,
  maxConcurrentRequests:DEFAULT_GLOBAL_CONCURRENCY,
  maxMemoryEntries:0
});
