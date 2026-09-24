'use client';

import {selectNeonRows} from './neon-repository';

// The public runtime reads only scalar snapshot columns. Metric identity is
// scope + type + key; no JSON dimensions are stored or queried.
export const METRIC_SNAPSHOT_TABLE='silver.metric_snapshots';
const SNAPSHOT_COLUMNS='scope_id,metric_key,metric_type,ranking_key,term,metric_value,item_count,unit,source_updated_at,calculated_at';

function scopeFilter(scopeId){
  return scopeId? [{column:'scope_id',operator:'eq',value:String(scopeId)}]:[];
}

export async function selectMetricSnapshots(scopeId,{metricType='',metricKeys=[]}={}){
  const filters=scopeFilter(scopeId);
  if(metricType)filters.push({column:'metric_type',operator:'eq',value:metricType});
  if(Array.isArray(metricKeys)&&metricKeys.length)filters.push({column:'metric_key',operator:'in',value:metricKeys});
  const {rows}=await selectNeonRows(METRIC_SNAPSHOT_TABLE,{columns:SNAPSHOT_COLUMNS,filters,limit:5000});
  return rows.map(row=>({
    ...row,
    scope_id:String(row.scope_id||''),
    metric_key:String(row.metric_key||''),
    metric_type:String(row.metric_type||''),
    ranking_key:String(row.ranking_key||row.metric_key||''),
    term:String(row.term||''),
    metric_value:Number(row.metric_value??row.rank_value??0)||0,
    item_count:Number(row.item_count??row.metric_value??0)||0,
    unit:String(row.unit||''),
    source_updated_at:row.source_updated_at||null,
    calculated_at:row.calculated_at||null
  }));
}

export async function selectHomeMetricSnapshots(scopeId='loc'){
  return selectMetricSnapshots(scopeId,{metricType:'home'});
}
