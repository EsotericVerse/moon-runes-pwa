import {allocateTimeUid,encodeTimeSegment} from './time-anchor-ranges.mjs';

function arrayOf(value){
  if(Array.isArray(value))return value.map(String);
  if(typeof value!=='string'||!value.trim())return [];
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(String):[];}
  catch{return value.split(',').map(x=>x.trim()).filter(Boolean);}
}
export function convertLegacyTimeRows(legacy=[]){
  const original=[...legacy];
  const known=[];
  const oldToUid=new Map();
  for(const row of original){
    const uid=allocateTimeUid(known);
    known.push({uid});
    const key=String(row.resource_id||'').trim();
    if(row.record_type==='anchor'){
      if(!key||oldToUid.has(key))throw new Error('舊時間錨點身份重複或空白，不能安全遷移：'+key);
      oldToUid.set(key,uid);
    }
  }
  function mapAnchor(key){
    const old=String(key||'').trim();
    if(old==='0')return '0';
    const uid=oldToUid.get(old);
    if(!uid)throw new Error('歷史時期引用不存在的定錨點：'+old);
    return uid;
  }
  const rows=[],archive=[];
  for(let i=0;i<original.length;i++){
    const row=original[i],uid=known[i].uid;
    archive.push({...row,migrated_uid:uid});
    if(row.record_type==='style_comment')continue;
    const old=arrayOf(row.anchor_ids),refs=old.map(mapAnchor);
    let anchor_ids=null;
    if(row.record_type==='period'){
      if(refs.length>2||refs[0]==='0')throw new Error('歷史時期錨點資料不合法：'+String(row.resource_id));
      anchor_ids=refs.length?[encodeTimeSegment(refs[0],refs[1]||'')]:[];
    }else if(row.record_type==='event'){
      anchor_ids=refs.length<=1?(refs.length?[encodeTimeSegment(refs[0])]:[]):
        refs.slice(1).map((value,index)=>encodeTimeSegment(refs[index],value));
    }
    const note=String(row.note||'').trim(),style=String(row.style_description||'').trim();
    rows.push({
      uid,type:row.record_type,title:String(row.label||''),
      description:[note,style].filter(Boolean).join('\n')||null,
      time_date:row.time_date||null,
      anchor_ids,status:row.status||null
    });
  }
  return {rows,archive};
}
