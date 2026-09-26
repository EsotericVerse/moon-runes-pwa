export const LANGUAGE_ITEM_KINDS=Object.freeze({TEXT:'text',MEDIA:'media',TIME:'time',KEYWORD:'keyword'});

export function languageItem(raw={},fallbackKind='text',index=0){
  const kind=String(raw.kind||fallbackKind);
  const id=String(raw.id||raw.media_id||raw.galaxy_id||raw.entry_id||raw.ranking_key||raw.key||kind+':'+index);
  return {
    id,kind,
    label:String(raw.label||raw.title||raw.display_label||raw.term||id),
    date:String(raw.date||raw.start_date||raw.created_at||raw.created_date||''),
    source:String(raw.source||raw.source_platform||raw.group_label||''),
    text:String(raw.text||raw.content||raw.description||raw.summary||raw.media_metadata_text||raw.meta_tags||''),
    tags:String(raw.tags||raw.style_tags||raw.meta_tags||raw.term||''),
    href:String(raw.href||raw.url||raw.source_ref||''),
    value:Number(raw.value??raw.item_count??raw.rank_value??1)||1,
    relations:Array.isArray(raw.relations)?raw.relations.map(String):[]
  };
}

export function searchResultItems(results=[]){
  return results.map((row,index)=>languageItem({
    id:row.key,label:row.title,date:row.date,source:row.source,text:row.bodyText,
    tags:row.styleTags,href:row.href,
    relations:(row.relatedRelations||[]).map(item=>item.to_work_id).filter(Boolean)
  },row.resourceType==='galaxy_media'?'media':'text',index));
}

export function timelineItems(rows=[]){
  return rows.map((row,index)=>languageItem(row,'time',index));
}

export function rankingItems(rows=[],kind='keyword'){
  return rows.map((row,index)=>languageItem({...row,label:row.term,value:row.item_count??row.rank_value},kind,index));
}

export function periodContentItems(rows=[]){
  return rows.map((row,index)=>languageItem(row,row.entry_type==='media_metadata'?'media':'text',index));
}

export function mergeLanguageItems(...groups){
  const map=new Map();
  for(const item of groups.flat())if(item?.id)map.set(item.id,item);
  return [...map.values()];
}

export function filterLanguageItems(items=[],{query='',start='',end='',kinds=[]}={}){
  const q=String(query).normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
  const startTime=start?Date.parse(start):NaN,endTime=end?Date.parse(end):NaN;
  const kindSet=new Set(kinds);
  return items.filter(item=>{
    if(kindSet.size&&!kindSet.has(item.kind))return false;
    const time=Date.parse(item.date||'');
    if(Number.isFinite(startTime)&&Number.isFinite(time)&&time<startTime)return false;
    if(Number.isFinite(endTime)&&Number.isFinite(time)&&time>endTime)return false;
    if(!q)return true;
    const hay=[item.label,item.text,item.tags,item.source].join(' ').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
    return hay.includes(q);
  });
}
