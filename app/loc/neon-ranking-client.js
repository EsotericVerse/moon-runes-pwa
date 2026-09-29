import {ScopeRankingResponseSchema} from './scope-feature-contracts';
import {selectCategoryCounts,selectSourceCatalog} from './aggregate-query';
import {selectNeonRows} from './neon-query';
import {resolveScopeTables} from './scope-table-mapping';
import {selectManagedScopes} from './scope-list';

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

async function sourceRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=String(scopeId||'').trim();
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const result=await selectSourceCatalog({
    scopeId:dataId,
    startDate:range?.start_date||'',
    endDate:range?.end_date||'',
    limit:5000
  });
  return result.rows.map(row=>rankingRow('source',row.source_name,row.item_count,dataId,period));
}

async function mediaTypeRows(scopeId,period='all',rangeOverride=undefined){
  const dataId=String(scopeId||'').trim();
  const range=rangeOverride===undefined?await resolvePeriod(scopeId,period):rangeOverride;
  const table=(await resolveScopeTables(dataId)).galaxyMedia;
  const rows=await selectCategoryCounts(table,'media_type',{
    startDate:range?.start_date||'',
    endDate:range?.end_date||'',
    limit:5000
  });
  return rows.map(row=>rankingRow('media_type',row.term,row.item_count,dataId,period));
}

async function rowsForType(scopeId,type,period,rangeOverride=undefined){
  if(type==='source')return sourceRows(scopeId,period,rangeOverride);
  if(type==='media_type')return mediaTypeRows(scopeId,period,rangeOverride);
  return [];
}

async function queryScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  const types=id==='loc'?['source']:['source','media_type'];
  const type=types.includes(rankingType)?rankingType:types[0];
  const period=String(navigation.period||'all');
  let rows=[];
  if(id==='loc'){
    const scopes=await selectManagedScopes();
    const results=await Promise.all(scopes.map(scope=>sourceRows(scope.id,period,null)));
    rows=results.flat();
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

export async function selectScopeRankingRows(scopeId,{rankingType='',navigation={}}={}){
  return (await queryScopeRankingRows(scopeId,{rankingType,navigation})).rows;
}

export async function selectScopeRankingTypes(scopeId){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  return id==='loc'?['source']:['source','media_type'];
}
