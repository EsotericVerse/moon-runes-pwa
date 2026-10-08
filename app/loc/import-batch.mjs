// One format contract for JSON Import and Source Refresh. No database authority lives here.
export const IMPORT_FIELD_ALIASES=Object.freeze({
  uid:['uid'],
  content:['content','body','text','message','description'],
  title:['title','name','subject'],
  createtime:['createtime','created_at','create_time','created_time','date','published_at'],
  source_native_id:['source_native_id','native_id'],
  source_place:['source_place','place'],
  content_type:['content_type','type'],
  url:['url','link','permalink'],
  source_id:['source_id'],
  target_id:['target_id'],
  ref_id:['ref_id'],
  searchable:['searchable','search']
});

function pathValue(row,path){
  const segments=String(path||'').trim().split('.').filter(Boolean);
  if(!segments.length)return undefined;
  return segments.reduce((value,segment)=>{
    if(value===null||value===undefined||typeof value!=='object')return undefined;
    return Object.prototype.hasOwnProperty.call(value,segment)?value[segment]:undefined;
  },row);
}

export function mappedImportValue(row,field,fieldMap={}){
  const custom=String(fieldMap?.[field]||'').trim();
  const paths=custom?custom.split(/[\n,，]/g).map(value=>value.trim()).filter(Boolean):(IMPORT_FIELD_ALIASES[field]||[]);
  for(const key of paths){
    const value=pathValue(row,key);
    if(value!==undefined&&value!==null&&!(typeof value==='string'&&value.trim()===''))return value;
  }
  return '';
}

export function importRowsFromJson(payload,recordPath=''){
  const selected=String(recordPath||'').trim();
  const container=selected?pathValue(payload,selected):payload;
  if(selected&&container===undefined)throw new Error('找不到資料陣列路徑：'+selected);
  if(Array.isArray(container))return container;
  if(container&&typeof container==='object'){
    for(const key of ['items','posts','data','records']){
      if(Array.isArray(container[key]))return container[key];
    }
    if(selected)return [container];
    const hasContent=['content','body','text','message','description','title','uid'].some(key=>Object.prototype.hasOwnProperty.call(container,key));
    if(hasContent)return [container];
  }
  throw new Error('找不到可匯入的資料陣列；請在格式設定指定資料路徑。');
}

export function validImportBatchSize(value){
  const size=Number(value);
  if(!Number.isInteger(size)||size<1||size>200)throw new Error('單批筆數須介於 1～200。');
  return size;
}

export async function writeImportBatches(records,{batchSize=100,writeBatch,onProgress}={}){
  if(!Array.isArray(records))throw new Error('匯入批次資料必須是陣列。');
  if(typeof writeBatch!=='function')throw new Error('匯入寫入函式不存在。');
  const size=validImportBatchSize(batchSize);
  const total=records.length;
  let completed=0;
  for(let offset=0;offset<total;offset+=size){
    const batch=records.slice(offset,offset+size);
    try{
      const result=await writeBatch(batch,{offset,total});
      if(result&&Number.isInteger(result.count)&&result.count!==batch.length){
        throw new Error('寫入筆數不符：預期 '+batch.length+' 筆，實際 '+result.count+' 筆');
      }
    }catch(error){
      const detail=String(error?.message||error||'未知錯誤');
      throw new Error('第 '+(Math.floor(offset/size)+1)+' 批失敗；已確認完成 '+completed+'／'+total+' 筆。'+detail+'。重新執行前會再次比對已存在 UID。');
    }
    completed+=batch.length;
    onProgress?.({completed,total,percent:Math.round(completed/Math.max(1,total)*100),batch:Math.floor(offset/size)+1,batches:Math.ceil(total/size)});
  }
  return {completed,total,batches:Math.ceil(total/size)};
}
