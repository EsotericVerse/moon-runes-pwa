'use client';

// Spatial anchors and ordered trace maps are separate from Galaxy.source_place.
// Public data is read on opening Trace; writes use the authenticated client and
// the existing server-enforced silver.can_manage_scope RLS policies.
import {dbPublicClient,dbAuthRelation} from '../../../loc/db-client.mjs';

export const TRACE_KEY=scopeId=>['trace-spatial',scopeId];
export const pointValid=(longitude,latitude)=>{
  const lng=Number(longitude),lat=Number(latitude);
  return String(longitude).trim()!==''&&String(latitude).trim()!==''&&
    Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=-180&&lng<=180&&lat>=-90&&lat<=90;
};

function scopeToken(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id)||id==='local')
    throw Error('這個資料來源無法使用雲端痕跡管理。');
  return id;
}
function titleText(value){
  const title=String(value||'').trim();
  if(!title||title.length>120)throw Error('名稱必填，最多 120 字。');
  return title;
}
function detailText(value){
  const valueText=String(value||'').trim();
  if(valueText.length>2000)throw Error('說明最多 2000 字。');
  return valueText;
}
function checked(result,label){
  if(result.error)throw Error(label+'：'+result.error.message);
  return result.data;
}

export async function readTraceSpatial(scopeId){
  const id=scopeToken(scopeId);
  const silver=dbPublicClient.schema('silver');
  const [anchors,maps]=await Promise.all([
    silver.from('trace_anchors').select('id,scope_id,title,description,longitude,latitude,created_at')
      .eq('scope_id',id).order('created_at',{ascending:true}).limit(1000),
    silver.from('trace_maps').select('id,scope_id,title,description,anchor_ids,created_at')
      .eq('scope_id',id).order('created_at',{ascending:true}).limit(1000)
  ]);
  return {anchors:checked(anchors,'讀取定錨點')||[],maps:checked(maps,'讀取痕跡圖')||[]};
}

export async function addTraceAnchor({scopeId,title,description='',longitude,latitude}){
  const id=scopeToken(scopeId);
  if(!pointValid(longitude,latitude))throw Error('請指定有效經緯度（經度 -180～180、緯度 -90～90）。');
  const record={
    scope_id:id,title:titleText(title),description:detailText(description),
    longitude:Number(longitude),latitude:Number(latitude)
  };
  const res=await dbAuthRelation('silver.trace_anchors').insert(record).select('id').single();
  return checked(res,'新增定錨點');
}

export async function addTraceMap({scopeId,title,description='',anchorIds=[],validAnchors=[]}){
  const id=scopeToken(scopeId);
  const ids=Array.isArray(anchorIds)?anchorIds:[];
  if(ids.length<2||ids.length>80||new Set(ids).size!==ids.length)
    throw Error('痕跡圖請選擇 2～80 個不同的定錨點，依順序連接。');
  const available=new Set(validAnchors.filter(a=>a.scope_id===id).map(a=>a.id));
  if(ids.some(value=>!available.has(value)))throw Error('定錨點不存在或不屬於此 Scope，請重新整理。');
  const res=await dbAuthRelation('silver.trace_maps').insert({
    scope_id:id,title:titleText(title),description:detailText(description),anchor_ids:ids
  }).select('id').single();
  return checked(res,'新增痕跡圖');
}
