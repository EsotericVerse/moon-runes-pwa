import {allocateTimeUid,encodeTimeSegment} from './time-anchor-ranges.mjs';
function arrayOf(value){
  if(Array.isArray(value))return value.map(String);
  if(typeof value!=='string'||!value.trim())return [];
  try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(String):[];}
  catch{return value.split(',').map(x=>x.trim()).filter(Boolean);}
}
// Preserve each legacy UUID/resource_id in archive; dates always come from
// actual anchor rows. Old '0' was a virtual now endpoint and is DROPPED,
// leaving a genuine single-anchor event, never a fabricated end date.
// An exceptional legacy event with >2 anchors is split without losing edges.
export function convertLegacyTimeRows(legacy=[]){
  const source=[...legacy],allocated=[],anchors=new Map();
  const allocate=()=>{const uid=allocateTimeUid(allocated);allocated.push({uid});return uid;};
  const migrated=source.map(row=>{
    const uid=allocate();
    if(row.record_type==='anchor'){
      const key=String(row.resource_id||'').trim();
      if(!key||anchors.has(key))throw new Error('舊定錨點身份重複或缺失：'+key);
      anchors.set(key,uid);
    }
    return uid;
  });
  const mapAnchor=key=>{
    if(String(key)==='0')return null;
    const uid=anchors.get(String(key||'').trim());
    if(!uid)throw new Error('歷史事件引用不存在的定錨點：'+key);
    return uid;
  };
  const archive=source.map((row,i)=>({...row,migrated_uid:migrated[i]}));
  const rows=[],periodBaselines=new Map();
  for(const [i,row] of source.entries()){
    if(row.record_type!=='period')continue;
    const refs=arrayOf(row.anchor_ids).map(mapAnchor).filter(Boolean);
    if(refs.length<1||refs.length>2)throw new Error('舊時間痕跡定錨點數量異常：'+row.resource_id);
    const uid=allocate(),anchor_ids=encodeTimeSegment(refs[0],refs[1]||'');
    periodBaselines.set(String(row.record_id),uid);
    rows.push({uid,type:'time_period',title:String(row.label||'')+'｜原定錨範圍',
      description:'原時間痕跡錨點關係；動態引用真正的定錨日期。',
      address:null,anchor_ids,status:'legacy_boundary'});
  }
  for(const [i,row] of source.entries()){
    if(row.record_type==='style_comment')continue;
    const type={anchor:'anchor',event:'time_period',period:'time_trace'}[row.record_type];
    if(!type)throw new Error('未知時間紀錄種類：'+row.record_type);
    const uid=migrated[i],refs=row.record_type==='anchor'?[]:
      arrayOf(row.anchor_ids).map(mapAnchor).filter(Boolean);
    let anchor_ids=null;
    if(type==='time_trace'){
      const baseline=periodBaselines.get(String(row.record_id));
      if(!baseline)throw new Error('找不到歷史時間痕跡對照：'+row.resource_id);
      anchor_ids=[baseline];
    }else if(type==='time_period'){
      if(!refs.length)throw new Error('歷史事件缺少定錨點：'+row.resource_id);
      anchor_ids=encodeTimeSegment(refs[0],refs[1]||'');
      for(let j=2;j<refs.length;j++){
        rows.push({uid:allocate(),type:'time_period',
          title:String(row.label||'')+'｜分段 '+j,
          description:String(row.note||'')||null,address:null,
          anchor_ids:encodeTimeSegment(refs[j-1],refs[j]),status:'legacy_split'});
      }
    }
    const note=String(row.note||'').trim(),style=String(row.style_description||'').trim();
    rows.push({uid,type,title:String(row.label||''),
      description:[note,style].filter(Boolean).join('\n')||null,
      address:type==='anchor'?row.time_date||null:null,anchor_ids,status:row.status||null});
  }
  return {rows,archive,periodBaselines};
}
