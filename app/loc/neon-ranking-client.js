import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectCategoryCounts,selectSourceCatalog} from './aggregate-query';
import {selectNeonRows} from './neon-query';

const PERIOD_COLUMNS='record_id,record_type,label,resource_id,display_order,time_date,anchor_pair,date_status,year_value';
const RANKING_TYPES=Object.freeze({
  loc:Object.freeze(['source']),
  lunarunes:Object.freeze(['source','media_type']),
  lo3rwang:Object.freeze(['source','media_type'])
});

function dataScopeId(scopeId){return String(scopeId)==='lunarunes'?'lrunes':String(scopeId);}
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
  const table='silver.'+dataScopeId(scopeId)+'_time';
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
  const table='silver.'+dataScopeId(scopeId)+'_time';
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

async function resolveComparisonRanges(scopeId,period='all'){
  if(scopeId==='loc')return null;
  const requested=periodId(period);
  const currentRow=await selectPeriodRow(scopeId,requested&&requested!=='all'?requested:'all');
  if(!currentRow)return null;
  const current=await resolvePeriodRow(scopeId,currentRow);
  if(!current?.start_date)return null;
  const table='silver.'+dataScopeId(scopeId)+'_time';
  const {rows}=await selectNeonRows(table,{
    columns:PERIOD_COLUMNS,
    filters:[
      {column:'record_type',operator:'eq',value:'period'},
      {column:'display_order',operator:'lt',value:Number(currentRow.display_order)||0}
    ],
    orders:[{column:'display_order',ascending:false}],
    limit:1
  });
  const previous=await resolvePeriodRow(scopeId,rows[0]||null);
  if(!previous?.start_date)return null;
  return {
    current:{start_date:current.start_date,end_date:current.end_date},
    previous:{start_date:previous.start_date,end_date:previous.end_date},
    period:current.period,
    periodLabel:current.title,
    previousPeriod:previous.period,
    previousPeriodLabel:previous.title
  };
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

async function sourceRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=dataScopeId(scopeId);
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const result=await selectSourceCatalog({
    scopeId:dataId,
    startDate:range?.start_date||'',
    endDate:range?.end_date||'',
    limit:20
  });
  return result.rows.map(row=>rankingRow('source',row.source_name,row.work_count,dataId,period));
}

async function mediaTypeRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=dataScopeId(scopeId);
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const table='silver.'+dataId+'_galaxy_media';
  const rows=await selectCategoryCounts(table,'media_type',{
    startDate:range?.start_date||'',
    endDate:range?.end_date||'',
    limit:20
  });
  return rows.map(row=>rankingRow('media_type',row.term,row.item_count,dataId,period));
}

async function rowsForType(scopeId,type,period,rangeOverride=undefined){
  if(type==='source')return sourceRows(scopeId,period,rangeOverride);
  if(type==='media_type')return mediaTypeRows(scopeId,period,rangeOverride);
  return [];
}

async function selectScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  const types=RANKING_TYPES[id];
  if(!types)throw new Error('資料設定無效');
  const type=types.includes(rankingType)?rankingType:types[0];
  const period=String(navigation.period||'all');
  let rows=[];
  if(id==='loc'){
    const [author,runes]=await Promise.all([
      sourceRows('lo3rwang',period,null),
      sourceRows('lunarunes',period,null)
    ]);
    rows=[...author,...runes];
  }else{
    rows=await rowsForType(id,type,period,undefined);
  }
  const parsed=ScopeRankingResponseSchema.parse({
    rows,
    offset:0,
    limit:Math.max(1,rows.length||1),
    hasMore:false,
    types:[type]
  });
  return {id,type,rows:parsed.rows};
}

export async function selectScopeRankingAll(scopeId,{rankingType='',navigation={}}={}){
  return (await selectScopeRankingRows(scopeId,{rankingType,navigation})).rows;
}

export async function selectScopeRankingComparison(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'');
  const types=RANKING_TYPES[id];
  if(!types||id==='loc')return null;
  const type=types.includes(rankingType)?rankingType:types[0];
  const period=String(navigation.period||'all');
  const ranges=await resolveComparisonRanges(id,period);
  if(!ranges)return null;
  const [currentRows,previousRows]=await Promise.all([
    rowsForType(id,type,ranges.period,ranges.current),
    rowsForType(id,type,ranges.previousPeriod,ranges.previous)
  ]);
  return {
    type,
    period:ranges.period,
    periodLabel:ranges.periodLabel,
    previousPeriod:ranges.previousPeriod,
    previousPeriodLabel:ranges.previousPeriodLabel,
    currentRange:ranges.current,
    previousRange:ranges.previous,
    currentRows,
    previousRows,
    candidateRows:[],
    catalogRows:[]
  };
}

export async function selectScopeKeywordDiagnostics(){
  return null;
}

export async function selectScopeRankingTypes(scopeId){
  const types=RANKING_TYPES[String(scopeId||'')];
  if(!types)throw new Error('資料設定無效');
  return [...types];
}
