import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectCategoryCounts,selectDailyCategoryCounts,selectSourceCatalog,selectSourceDaily} from './aggregate-query';
import {selectNeonRows} from './neon-query';
import {resolveScopeTables} from './scope-table-mapping';
import {selectManagedScopes} from './scope-table-mapping';

const PERIOD_COLUMNS='record_id,record_type,label,resource_id,display_order,time_date,anchor_pair,date_status,year_value';
function dateOnly(value){return String(value||'').slice(0,10);}
function periodDate(row){
  if(row?.time_date)return dateOnly(row.time_date);
  const year=Number(row?.year_value);
  return String(row?.date_status||'')==='year_only'&&Number.isInteger(year)&&year>0?year+'-01-01':null;
}
function previousDay(value){
  if(!value)return null;
  const date=new Date(dateOnly(value)+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
function periodId(value){return String(value||'').trim().replace(/^period:/,'');}

async function selectPeriodRow(scopeId,period='all'){
  const table=(await resolveScopeTables(scopeId)).time;
  const requested=periodId(period);
  const filters=[{column:'record_type',operator:'eq',value:'period'}];
  const orders=[];
  if(!requested||requested==='all'){
    filters.push({column:'anchor_pair',operator:'like',value:'%,0'});
    orders.push({column:'display_order',ascending:false});
  }else{
    filters.push({column:'resource_id',operator:'eq',value:requested});
  }
  const {rows}=await selectNeonRows(table,{columns:PERIOD_COLUMNS,filters,orders,limit:1});
  return rows[0]||null;
}

async function resolvePeriodRow(scopeId,row){
  if(!row)return null;
  const table=(await resolveScopeTables(scopeId)).time;
  const [before='0',after='0']=String(row.anchor_pair||'0,0').split(',',2).map(value=>String(value||'0').trim()||'0');
  const ids=[before,after].filter(value=>value!=='0');
  let anchors=[];
  if(ids.length){
    ({rows:anchors}=await selectNeonRows(table,{
      columns:'resource_id,time_date,date_status,year_value',
      filters:[
        {column:'record_type',operator:'eq',value:'anchor'},
        {column:'resource_id',operator:'in',value:ids}
      ],
      limit:ids.length
    }));
  }
  const byId=new Map(anchors.map(anchor=>[String(anchor.resource_id),anchor]));
  return {
    period:String(row.resource_id||row.record_id||''),
    title:String(row.label||row.resource_id||''),
    order_no:Number(row.display_order)||0,
    start_date:before==='0'?null:periodDate(byId.get(before)),
    end_date:after==='0'?null:previousDay(periodDate(byId.get(after))),
    open_end:after==='0'
  };
}

async function resolvePeriod(scopeId,period='all'){
  const requested=periodId(period);
  if(!requested||requested==='all')return null;
  return resolvePeriodRow(scopeId,await selectPeriodRow(scopeId,requested));
}

function rankingRow(type,term,count,source,period){
  const text=String(term||'').trim();
  const value=Number(count)||0;
  return {
    ranking_key:[type,source,text].join('|'),
    ranking_type:type,
    term:text,
    rank_value:value,
    item_count:value,
    source,
    period:period||'all'
  };
}

const SOURCE_BUCKET_ORDER=Object.freeze(['Facebook','Threads','IG','Others']);

function sourceBucket(value=''){
  const source=String(value||'').trim().toLowerCase();
  if(source.includes('facebook')||source==='fb')return 'Facebook';
  if(source.includes('threads'))return 'Threads';
  if(source.includes('instagram')||source.includes('reels')||source==='ig')return 'IG';
  return 'Others';
}

function mergeSourceBuckets(rows=[],source='loc',period='all'){
  const totals=new Map(SOURCE_BUCKET_ORDER.map(name=>[name,0]));
  for(const row of rows){
    const raw=String(row?.source_name??row?.term??'').trim();
    if(!raw)continue;
    const bucket=sourceBucket(raw);
    totals.set(bucket,(totals.get(bucket)||0)+(Number(row?.item_count)||0));
  }
  return SOURCE_BUCKET_ORDER
    .map(term=>rankingRow('source',term,totals.get(term)||0,source,period))
    .filter(row=>row.item_count>0)
    .sort((a,b)=>b.item_count-a.item_count||SOURCE_BUCKET_ORDER.indexOf(a.term)-SOURCE_BUCKET_ORDER.indexOf(b.term));
}

async function mediaSourceRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=String(scopeId||'').trim();
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const table=(await resolveScopeTables(dataId)).galaxyMedia;
  const rows=await selectCategoryCounts(table,'media_type',{
    startDate:range?.start_date||'',
    endDate:range?.end_date||'',
    limit:5000
  });
  return rows.map(row=>({
    source_name:String(row.term||'').trim(),
    item_count:Number(row.item_count)||0
  }));
}

async function sourceRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=String(scopeId||'').trim();
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const [result,mediaRows]=await Promise.all([
    selectSourceCatalog({
      scopeId:dataId,
      startDate:range?.start_date||'',
      endDate:range?.end_date||'',
      limit:5000
    }),
    mediaSourceRows(dataId,period,range)
  ]);
  return mergeSourceBuckets([...result.rows,...mediaRows],dataId,period);
}

function mergeLocSourceRows(rows=[]){
  return mergeSourceBuckets(rows,'loc','all');
}

async function queryScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  const types=['total','source'];
  const requested=String(rankingType||'');
  const type=types.includes(requested)?requested:'total';
  const period=String(navigation.period||'all');
  let sourceRowsResult=[];
  if(id==='loc'){
    const scopes=(await selectManagedScopes()).filter(scope=>scope.id!=='loc');
    const results=await Promise.all(scopes.map(scope=>sourceRows(scope.id,'all',null)));
    sourceRowsResult=mergeLocSourceRows(results.flat());
  }else{
    sourceRowsResult=await sourceRows(id,period,undefined);
  }
  const total=sourceRowsResult.reduce((sum,row)=>sum+(Number(row.item_count)||0),0);
  const rows=type==='total'
    ?[rankingRow('total','總來源',total,id,period)]
    :sourceRowsResult;
  const parsed=ScopeRankingResponseSchema.parse({
    rows,
    offset:0,
    limit:Math.max(1,rows.length||1),
    hasMore:false,
    types
  });
  return {id,type,rows:parsed.rows};
}

export async function selectScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  return (await queryScopeRankingRows(scopeId,{rankingType,navigation})).rows;
}

export async function selectScopeSourceBucketDetails(scopeId,{bucket='Others',navigation={}}={}){
  const id=String(scopeId||'').trim();
  if(!id||id==='loc')return [];
  const period=String(navigation.period||'all');
  const range=await resolvePeriod(id,period);
  const tables=await resolveScopeTables(id);
  const [catalog,mediaCatalog]=await Promise.all([
    selectSourceCatalog({
      scopeId:id,
      startDate:range?.start_date||'',
      endDate:range?.end_date||'',
      limit:5000
    }),
    selectCategoryCounts(tables.galaxyMedia,'media_type',{
      startDate:range?.start_date||'',
      endDate:range?.end_date||'',
      limit:5000
    })
  ]);
  const totals=new Map();
  for(const row of catalog.rows){
    const raw=String(row.source_name||'').trim();
    if(!raw||sourceBucket(raw)!==bucket)continue;
    totals.set(raw,(totals.get(raw)||0)+(Number(row.item_count)||0));
  }
  for(const row of mediaCatalog){
    const raw=String(row.term||'').trim();
    if(!raw||sourceBucket(raw)!==bucket)continue;
    totals.set(raw,(totals.get(raw)||0)+(Number(row.item_count)||0));
  }
  return [...totals.entries()]
    .map(([term,count])=>rankingRow('source_detail',term,count,id,period))
    .sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term,'zh-Hant'));
}

export async function selectScopeRankingTypes(scopeId){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  return ['total','source'];
}


async function scopeSourceTrendRows(scopeId){
  const tables=await resolveScopeTables(scopeId);
  const [textDaily,mediaDaily]=await Promise.all([
    selectSourceDaily({scopeId}),
    selectDailyCategoryCounts(tables.galaxyMedia,'media_type')
  ]);
  const combined=new Map();
  for(const row of textDaily){
    const day=dateOnly(row.day);
    if(!day)continue;
    const bucket=sourceBucket(row.source_name);
    const key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  for(const row of mediaDaily){
    const day=dateOnly(row.day);
    if(!day)continue;
    const bucket=sourceBucket(row.category);
    const key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...combined.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {
      day:key.slice(0,split),
      source:key.slice(split+1),
      item_count:Number(item_count)||0
    };
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}

export async function selectScopeSourceTrendRows(scopeId){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  const rows=id==='loc'
    ?(await Promise.all((await selectManagedScopes()).filter(scope=>scope.id!=='loc').map(scope=>scopeSourceTrendRows(scope.id)))).flat()
    :await scopeSourceTrendRows(id);
  const merged=new Map();
  for(const row of rows){
    const key=row.day+'|'+row.source;
    merged.set(key,(merged.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...merged.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {
      day:key.slice(0,split),
      source:key.slice(split+1),
      item_count:Number(item_count)||0
    };
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}

async function scopeAnchorDates(scopeId){
  const table=(await resolveScopeTables(scopeId)).time;
  const {rows}=await selectNeonRows(table,{
    columns:'resource_id,label,time_date,date_status,year_value',
    filters:[{column:'record_type',operator:'eq',value:'anchor'}],
    orders:[{column:'time_date',ascending:true},{column:'resource_id',ascending:true}],
    limit:5000,
    offset:0
  });
  return rows.map(row=>({
    scope_id:String(scopeId),
    anchor_id:String(row.resource_id||''),
    label:String(row.label||row.resource_id||''),
    date:row.time_date?dateOnly(row.time_date):null,
    date_status:String(row.date_status||'')
  })).filter(row=>row.date&&row.date_status!=='year_only');
}

export async function selectScopeAnchorDates(scopeId){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  const rows=id==='loc'
    ?(await Promise.all((await selectManagedScopes()).filter(scope=>scope.id!=='loc').map(scope=>scopeAnchorDates(scope.id)))).flat()
    :await scopeAnchorDates(id);
  const seen=new Set();
  return rows.filter(row=>{
    const key=row.scope_id+'|'+row.anchor_id+'|'+row.date;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.scope_id).localeCompare(String(b.scope_id)));
}
