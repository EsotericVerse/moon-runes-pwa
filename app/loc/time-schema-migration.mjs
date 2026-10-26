import {allocateTimeUid,encodeTimeSegment} from './time-anchor-ranges.mjs';

function arrayOf(value){
  if(Array.isArray(value))return value.map(String);
  if(typeof value!=='string'||!value.trim())return [];
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(String):[];}
  catch{return value.split(',').map(x=>x.trim()).filter(Boolean);}
}
/**
 * Three-level Time model: anchor -> time_period (old event) -> time_trace
 * (old period). Every historical period's existing dated anchor boundary
 * becomes a real time_period linked to those same real anchors, so that
 * migration never fabricates dates or discards a historical period.
 */
export function convertLegacyTimeRows(legacy=[]){
  const original=[...legacy];
  const allocated=[],anchorKeys=new Map();
  for(const row of original){
    const uid=allocateTimeUid(allocated);
    allocated.push({uid});
    if(row.record_type==='anchor'){
      const key=String(row.resource_id||'').trim();
      if(!key||anchorKeys.has(key))
        throw new Error('舊時間錨點身份重複或空白：'+key);
      anchorKeys.set(key,uid);
    }
  }
  const mapAnchor=key=>{
    if(String(key)==='0')return '0';
    const uid=anchorKeys.get(String(key||'').trim());
    if(!uid)throw new Error('歷史時期引用不存在的定錨點：'+key);
    return uid;
  };
  const archive=original.map((row,i)=>({...row,migrated_uid:allocated[i].uid}));
  const rows=[];
  const periodBaselines=new Map();
  for(let i=0;i<original.length;i++){
    const row=original[i];
    if(row.record_type!=='period')continue;
    const uid=allocateTimeUid(allocated);
    allocated.push({uid});
    const ids=arrayOf(row.anchor_ids).map(mapAnchor);
    if(!ids.length||ids.length>2||ids[0]==='0')
      throw new Error('舊時期沒有真實起點錨點：'+String(row.resource_id||''));
    const segment=encodeTimeSegment(ids[0],ids[1]||'');
    periodBaselines.set(String(row.record_id),uid);
    rows.push({uid,type:'time_period',
      title:String(row.label||'')+'｜原時期錨點範圍',
      description:'舊時期的原定錨範圍，由真實時間定錨點動態計算。',
      address:null,anchor_ids:[segment],status:'legacy_boundary'});
  }
  for(let i=0;i<original.length;i++){
    const row=original[i],uid=allocated[i].uid;
    if(row.record_type==='style_comment')continue;
    const type={anchor:'anchor',event:'time_period',period:'time_trace'}[row.record_type];
    if(!type)throw new Error('未知歷史時間種類：'+row.record_type);
    const old=arrayOf(row.anchor_ids),refs=row.record_type==='anchor'?[]:old.map(mapAnchor);
    let anchor_ids=null;
    if(type==='time_trace'){
      const baseline=periodBaselines.get(String(row.record_id));
      if(!baseline)throw new Error('遺失歷史時期的事件邊界');
      anchor_ids=[baseline];
    }else if(type==='time_period'){
      if(refs.includes('0'))throw new Error('歷史事件含無效開放起訖：'+row.resource_id);
      anchor_ids=refs.length<=1?(refs.length?[encodeTimeSegment(refs[0])]:[]):
        refs.slice(1).map((id,index)=>encodeTimeSegment(refs[index],id));
    }
    const note=String(row.note||'').trim(),style=String(row.style_description||'').trim();
    rows.push({uid,type,title:String(row.label||''),
      description:[note,style].filter(Boolean).join('\n')||null,
      address:row.time_date||null,anchor_ids,status:row.status||null});
  }
  return {rows,archive,periodBaselines};
}
